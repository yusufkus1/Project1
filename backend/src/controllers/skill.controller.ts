import { Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthRequest } from "../middleware/auth";

export async function getSkills(req: AuthRequest, res: Response): Promise<void> {
  try {
    const skills = await prisma.skill.findMany({
      where: { userId: req.userId, isArchived: false },
      include: { sessions: true },
      orderBy: { createdAt: "asc" },
    });
    res.json(skills);
  } catch { res.status(500).json({ error: "Server error" }); }
}

export async function createSkill(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { name, color, duration, days } = req.body as {
      name: string; color?: string; duration?: number; days?: number[];
    };
    if (!name?.trim()) { res.status(400).json({ error: "Name required" }); return; }
    if (!Array.isArray(days) || days.length === 0) { res.status(400).json({ error: "At least one day required" }); return; }

    const skill = await prisma.skill.create({
      data: {
        name: name.trim(),
        color: color ?? "#7c6ff7",
        duration: Math.max(5, Math.min(480, Number(duration) || 30)),
        days: JSON.stringify(days),
        userId: req.userId!,
      },
      include: { sessions: true },
    });
    res.status(201).json(skill);
  } catch { res.status(500).json({ error: "Server error" }); }
}

export async function updateSkill(req: AuthRequest, res: Response): Promise<void> {
  try {
    const skill = await prisma.skill.findFirst({ where: { id: req.params["id"] as string, userId: req.userId } });
    if (!skill) { res.status(404).json({ error: "Not found" }); return; }

    const { name, color, duration, days } = req.body as {
      name?: string; color?: string; duration?: number; days?: number[];
    };
    const updated = await prisma.skill.update({
      where: { id: req.params["id"] as string },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(color !== undefined && { color }),
        ...(duration !== undefined && { duration: Math.max(5, Math.min(480, Number(duration))) }),
        ...(days !== undefined && { days: JSON.stringify(days) }),
      },
      include: { sessions: true },
    });
    res.json(updated);
  } catch { res.status(500).json({ error: "Server error" }); }
}

export async function deleteSkill(req: AuthRequest, res: Response): Promise<void> {
  try {
    const skill = await prisma.skill.findFirst({ where: { id: req.params["id"] as string, userId: req.userId } });
    if (!skill) { res.status(404).json({ error: "Not found" }); return; }
    await prisma.skill.update({ where: { id: req.params["id"] as string }, data: { isArchived: true } });
    res.json({ ok: true });
  } catch { res.status(500).json({ error: "Server error" }); }
}

export async function toggleSession(req: AuthRequest, res: Response): Promise<void> {
  try {
    const skill = await prisma.skill.findFirst({ where: { id: req.params["id"] as string, userId: req.userId } });
    if (!skill) { res.status(404).json({ error: "Not found" }); return; }

    const date = (req.body as { date?: string }).date ?? new Date().toISOString().slice(0, 10);
    const existing = await prisma.skillSession.findUnique({
      where: { skillId_date: { skillId: skill.id, date } },
    });

    if (existing) {
      await prisma.skillSession.delete({ where: { id: existing.id } });
      res.json({ done: false, date });
    } else {
      await prisma.skillSession.create({ data: { skillId: skill.id, date, userId: req.userId! } });
      res.json({ done: true, date });
    }
  } catch { res.status(500).json({ error: "Server error" }); }
}
