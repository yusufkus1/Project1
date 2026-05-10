import { Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthRequest } from "../middleware/auth";

export async function getProjects(req: AuthRequest, res: Response): Promise<void> {
  try {
    const projects = await prisma.project.findMany({
      where: { userId: req.userId },
      include: { _count: { select: { tasks: { where: { isArchived: false, parentId: null } } } } },
      orderBy: { createdAt: "asc" },
    });
    res.json(projects);
  } catch { res.status(500).json({ error: "Sunucu hatası" }); }
}

export async function createProject(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { name, description, color, icon } = req.body as {
      name: string; description?: string; color?: string; icon?: string;
    };
    const project = await prisma.project.create({
      data: { name, description, color: color ?? "#6366f1", icon: icon ?? "folder", userId: req.userId! },
    });
    res.status(201).json(project);
  } catch { res.status(500).json({ error: "Sunucu hatası" }); }
}

export async function updateProject(req: AuthRequest, res: Response): Promise<void> {
  try {
    const existing = await prisma.project.findFirst({ where: { id: req.params["id"] as string, userId: req.userId } });
    if (!existing) { res.status(404).json({ error: "Proje bulunamadı" }); return; }
    const { name, description, color, icon, isArchived } = req.body as {
      name?: string; description?: string; color?: string; icon?: string; isArchived?: boolean;
    };
    const project = await prisma.project.update({
      where: { id: req.params["id"] as string },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(color !== undefined && { color }),
        ...(icon !== undefined && { icon }),
        ...(isArchived !== undefined && { isArchived }),
      },
    });
    res.json(project);
  } catch { res.status(500).json({ error: "Sunucu hatası" }); }
}

export async function deleteProject(req: AuthRequest, res: Response): Promise<void> {
  try {
    const existing = await prisma.project.findFirst({ where: { id: req.params["id"] as string, userId: req.userId } });
    if (!existing) { res.status(404).json({ error: "Proje bulunamadı" }); return; }
    await prisma.project.delete({ where: { id: req.params["id"] as string } });
    res.json({ message: "Proje silindi" });
  } catch { res.status(500).json({ error: "Sunucu hatası" }); }
}
