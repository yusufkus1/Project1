import { Response } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { AuthRequest } from "../middleware/auth";

export async function getMe(req: AuthRequest, res: Response): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, email: true, name: true, avatar: true, theme: true, createdAt: true },
    });
    if (!user) { res.status(404).json({ error: "Kullanıcı bulunamadı" }); return; }
    res.json(user);
  } catch { res.status(500).json({ error: "Sunucu hatası" }); }
}

export async function updateMe(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { name, avatar, theme } = req.body as { name?: string; avatar?: string; theme?: string };
    const user = await prisma.user.update({
      where: { id: req.userId },
      data: { ...(name && { name }), ...(avatar && { avatar }), ...(theme && { theme }) },
      select: { id: true, email: true, name: true, avatar: true, theme: true },
    });
    res.json(user);
  } catch { res.status(500).json({ error: "Sunucu hatası" }); }
}

export async function changePassword(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { currentPassword, newPassword } = req.body as { currentPassword: string; newPassword: string };
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
      res.status(400).json({ error: "Mevcut şifre yanlış" }); return;
    }
    const hashed = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: req.userId }, data: { password: hashed } });
    res.json({ message: "Şifre güncellendi" });
  } catch { res.status(500).json({ error: "Sunucu hatası" }); }
}

export async function getStats(req: AuthRequest, res: Response): Promise<void> {
  try {
    const [total, completed, pending, inProgress, overdue, byPriority, byProject] = await Promise.all([
      prisma.task.count({ where: { userId: req.userId, isArchived: false, parentId: null } }),
      prisma.task.count({ where: { userId: req.userId, status: "COMPLETED", isArchived: false, parentId: null } }),
      prisma.task.count({ where: { userId: req.userId, status: "PENDING", isArchived: false, parentId: null } }),
      prisma.task.count({ where: { userId: req.userId, status: "IN_PROGRESS", isArchived: false, parentId: null } }),
      prisma.task.count({
        where: {
          userId: req.userId,
          isArchived: false,
          status: { not: "COMPLETED" },
          dueDate: { lt: new Date() },
          parentId: null,
        },
      }),
      prisma.task.groupBy({
        by: ["priority"],
        where: { userId: req.userId, isArchived: false, parentId: null },
        _count: true,
      }),
      prisma.task.groupBy({
        by: ["projectId"],
        where: { userId: req.userId, isArchived: false, parentId: null },
        _count: true,
      }),
    ]);

    res.json({ total, completed, pending, inProgress, overdue, byPriority, byProject });
  } catch { res.status(500).json({ error: "Sunucu hatası" }); }
}
