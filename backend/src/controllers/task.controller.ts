import { Response } from "express";
import { Prisma, Priority, TaskStatus, Recurrence } from "@prisma/client";
import path from "path";
import fs from "fs";
import { prisma } from "../lib/prisma";
import { AuthRequest } from "../middleware/auth";

export async function getTasks(req: AuthRequest, res: Response): Promise<void> {
  try {
    const {
      projectId, status, priority, tagId,
      search, isArchived, sortBy = "position", sortOrder = "asc",
      page = "1", limit = "50",
    } = req.query as Record<string, string>;

    const where: Prisma.TaskWhereInput = {
      userId: req.userId,
      parentId: null,
      isArchived: isArchived === "true",
    };

    if (projectId) where.projectId = projectId;
    if (status) where.status = status as TaskStatus;
    if (priority) where.priority = priority as Priority;
    if (tagId) where.tags = { some: { tagId } };
    if (search) where.title = { contains: search, mode: "insensitive" };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        include: {
          subtasks: { include: { tags: { include: { tag: true } } } },
          tags: { include: { tag: true } },
          project: { select: { id: true, name: true, color: true } },
          attachments: { orderBy: { createdAt: "asc" } },
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: parseInt(limit),
      }),
      prisma.task.count({ where }),
    ]);

    res.json({ tasks, total, page: parseInt(page), limit: parseInt(limit) });
  } catch { res.status(500).json({ error: "Sunucu hatası" }); }
}

export async function getTask(req: AuthRequest, res: Response): Promise<void> {
  try {
    const task = await prisma.task.findFirst({
      where: { id: req.params["id"] as string, userId: req.userId },
      include: {
        subtasks: { include: { tags: { include: { tag: true } } } },
        tags: { include: { tag: true } },
        project: true,
        attachments: { orderBy: { createdAt: "asc" } },
      },
    });
    if (!task) { res.status(404).json({ error: "Görev bulunamadı" }); return; }
    res.json(task);
  } catch { res.status(500).json({ error: "Sunucu hatası" }); }
}

export async function createTask(req: AuthRequest, res: Response): Promise<void> {
  try {
    const {
      title, description, priority, dueDate, reminder,
      projectId, parentId, tagIds, recurrence,
    } = req.body as {
      title: string; description?: string; priority?: Priority;
      dueDate?: string; reminder?: string; projectId?: string;
      parentId?: string; tagIds?: string[]; recurrence?: Recurrence;
    };

    const maxPos = await prisma.task.aggregate({
      where: { userId: req.userId, parentId: parentId ?? null },
      _max: { position: true },
    });

    const task = await prisma.task.create({
      data: {
        title,
        description,
        priority: priority ?? "MEDIUM",
        dueDate: dueDate ? new Date(dueDate) : undefined,
        reminder: reminder ? new Date(reminder) : undefined,
        recurrence,
        position: (maxPos._max.position ?? -1) + 1,
        userId: req.userId!,
        projectId: projectId ?? null,
        parentId: parentId ?? null,
        tags: tagIds?.length
          ? { create: tagIds.map((tagId) => ({ tagId })) }
          : undefined,
      },
      include: {
        subtasks: true,
        tags: { include: { tag: true } },
        project: { select: { id: true, name: true, color: true } },
      },
    });
    res.status(201).json(task);
  } catch { res.status(500).json({ error: "Sunucu hatası" }); }
}

export async function updateTask(req: AuthRequest, res: Response): Promise<void> {
  try {
    const existing = await prisma.task.findFirst({ where: { id: req.params["id"] as string, userId: req.userId } });
    if (!existing) { res.status(404).json({ error: "Görev bulunamadı" }); return; }

    const {
      title, description, priority, status, dueDate, reminder,
      projectId, tagIds, recurrence, isArchived, position,
    } = req.body as {
      title?: string; description?: string; priority?: Priority;
      status?: TaskStatus; dueDate?: string | null; reminder?: string | null;
      projectId?: string | null; tagIds?: string[]; recurrence?: Recurrence | null;
      isArchived?: boolean; position?: number;
    };

    const completedAt =
      status === "COMPLETED" && existing.status !== "COMPLETED"
        ? new Date()
        : status !== "COMPLETED"
        ? null
        : existing.completedAt;

    const task = await prisma.task.update({
      where: { id: req.params["id"] as string },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(priority !== undefined && { priority }),
        ...(status !== undefined && { status, completedAt }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
        ...(reminder !== undefined && { reminder: reminder ? new Date(reminder) : null }),
        ...(projectId !== undefined && { projectId }),
        ...(recurrence !== undefined && { recurrence }),
        ...(isArchived !== undefined && { isArchived }),
        ...(position !== undefined && { position }),
        ...(tagIds !== undefined && {
          tags: {
            deleteMany: {},
            create: tagIds.map((tagId) => ({ tagId })),
          },
        }),
      },
      include: {
        subtasks: { include: { tags: { include: { tag: true } } } },
        tags: { include: { tag: true } },
        project: { select: { id: true, name: true, color: true } },
        attachments: { orderBy: { createdAt: "asc" } },
      },
    });
    res.json(task);
  } catch { res.status(500).json({ error: "Sunucu hatası" }); }
}

export async function uploadAttachment(req: AuthRequest, res: Response): Promise<void> {
  try {
    const taskId = req.params["id"] as string;
    const task = await prisma.task.findFirst({ where: { id: taskId, userId: req.userId } });
    if (!task) { res.status(404).json({ error: "Task not found" }); return; }

    const file = (req as AuthRequest & { file?: Express.Multer.File }).file;
    if (!file) { res.status(400).json({ error: "No file uploaded" }); return; }

    const attachment = await prisma.taskAttachment.create({
      data: {
        taskId,
        filename: file.filename,
        originalName: file.originalname,
        url: `/uploads/${file.filename}`,
        mimetype: file.mimetype,
        size: file.size,
      },
    });
    res.status(201).json(attachment);
  } catch { res.status(500).json({ error: "Upload failed" }); }
}

export async function deleteAttachment(req: AuthRequest, res: Response): Promise<void> {
  try {
    const taskId = req.params["id"] as string;
    const attachmentId = req.params["attachmentId"] as string;

    const task = await prisma.task.findFirst({ where: { id: taskId, userId: req.userId } });
    if (!task) { res.status(404).json({ error: "Task not found" }); return; }

    const attachment = await prisma.taskAttachment.findFirst({ where: { id: attachmentId, taskId } });
    if (!attachment) { res.status(404).json({ error: "Attachment not found" }); return; }

    const filePath = path.join(__dirname, "../../../uploads", attachment.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await prisma.taskAttachment.delete({ where: { id: attachmentId } });
    res.json({ message: "Deleted" });
  } catch { res.status(500).json({ error: "Delete failed" }); }
}

export async function deleteTask(req: AuthRequest, res: Response): Promise<void> {
  try {
    const existing = await prisma.task.findFirst({ where: { id: req.params["id"] as string, userId: req.userId } });
    if (!existing) { res.status(404).json({ error: "Görev bulunamadı" }); return; }
    await prisma.task.delete({ where: { id: req.params["id"] as string } });
    res.json({ message: "Görev silindi" });
  } catch { res.status(500).json({ error: "Sunucu hatası" }); }
}

export async function reorderTasks(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { tasks } = req.body as { tasks: { id: string; position: number }[] };
    await Promise.all(
      tasks.map(({ id, position }) =>
        prisma.task.updateMany({ where: { id, userId: req.userId }, data: { position } })
      )
    );
    res.json({ message: "Sıralama güncellendi" });
  } catch { res.status(500).json({ error: "Sunucu hatası" }); }
}
