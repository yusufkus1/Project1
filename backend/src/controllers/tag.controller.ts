import { Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthRequest } from "../middleware/auth";

export async function getTags(req: AuthRequest, res: Response): Promise<void> {
  try {
    const tags = await prisma.tag.findMany({
      where: { userId: req.userId },
      include: { _count: { select: { tasks: true } } },
      orderBy: { name: "asc" },
    });
    res.json(tags);
  } catch { res.status(500).json({ error: "Sunucu hatası" }); }
}

export async function createTag(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { name, color } = req.body as { name: string; color?: string };
    const tag = await prisma.tag.create({
      data: { name, color: color ?? "#6366f1", userId: req.userId! },
    });
    res.status(201).json(tag);
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e.code === "P2002") {
      res.status(400).json({ error: "Bu etiket zaten var" });
    } else {
      res.status(500).json({ error: "Sunucu hatası" });
    }
  }
}

export async function updateTag(req: AuthRequest, res: Response): Promise<void> {
  try {
    const existing = await prisma.tag.findFirst({ where: { id: req.params["id"] as string, userId: req.userId } });
    if (!existing) { res.status(404).json({ error: "Etiket bulunamadı" }); return; }
    const { name, color } = req.body as { name?: string; color?: string };
    const tag = await prisma.tag.update({
      where: { id: req.params["id"] as string },
      data: { ...(name && { name }), ...(color && { color }) },
    });
    res.json(tag);
  } catch { res.status(500).json({ error: "Sunucu hatası" }); }
}

export async function deleteTag(req: AuthRequest, res: Response): Promise<void> {
  try {
    const existing = await prisma.tag.findFirst({ where: { id: req.params["id"] as string, userId: req.userId } });
    if (!existing) { res.status(404).json({ error: "Etiket bulunamadı" }); return; }
    await prisma.tag.delete({ where: { id: req.params["id"] as string } });
    res.json({ message: "Etiket silindi" });
  } catch { res.status(500).json({ error: "Sunucu hatası" }); }
}
