import { Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthRequest } from "../middleware/auth";

export async function getHabits(req: AuthRequest, res: Response): Promise<void> {
  try {
    // Get logs for last 30 days
    const since = new Date();
    since.setDate(since.getDate() - 29);
    const sinceStr = since.toISOString().slice(0, 10);

    const habits = await prisma.habit.findMany({
      where: { userId: req.userId, isArchived: false },
      include: {
        logs: {
          where: { date: { gte: sinceStr } },
          orderBy: { date: "asc" },
        },
      },
      orderBy: { createdAt: "asc" },
    });
    res.json(habits);
  } catch { res.status(500).json({ error: "Server error" }); }
}

export async function createHabit(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { title, color, icon } = req.body as { title: string; color?: string; icon?: string };
    if (!title?.trim()) { res.status(400).json({ error: "Title required" }); return; }

    const habit = await prisma.habit.create({
      data: { title: title.trim(), color: color ?? "#6366f1", icon: icon ?? "⭐", userId: req.userId! },
      include: { logs: true },
    });
    res.status(201).json(habit);
  } catch { res.status(500).json({ error: "Server error" }); }
}

export async function updateHabit(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { title, color, icon } = req.body as { title?: string; color?: string; icon?: string };
    const habit = await prisma.habit.findFirst({ where: { id: req.params["id"], userId: req.userId } });
    if (!habit) { res.status(404).json({ error: "Not found" }); return; }

    const updated = await prisma.habit.update({
      where: { id: req.params["id"] },
      data: {
        ...(title !== undefined && { title }),
        ...(color !== undefined && { color }),
        ...(icon !== undefined && { icon }),
      },
      include: { logs: true },
    });
    res.json(updated);
  } catch { res.status(500).json({ error: "Server error" }); }
}

export async function deleteHabit(req: AuthRequest, res: Response): Promise<void> {
  try {
    const habit = await prisma.habit.findFirst({ where: { id: req.params["id"], userId: req.userId } });
    if (!habit) { res.status(404).json({ error: "Not found" }); return; }
    await prisma.habit.update({ where: { id: req.params["id"] }, data: { isArchived: true } });
    res.json({ ok: true });
  } catch { res.status(500).json({ error: "Server error" }); }
}

export async function toggleLog(req: AuthRequest, res: Response): Promise<void> {
  try {
    const habit = await prisma.habit.findFirst({ where: { id: req.params["id"], userId: req.userId } });
    if (!habit) { res.status(404).json({ error: "Not found" }); return; }

    const date = (req.body as { date?: string }).date ?? new Date().toISOString().slice(0, 10);
    const existing = await prisma.habitLog.findUnique({ where: { habitId_date: { habitId: habit.id, date } } });

    if (existing) {
      await prisma.habitLog.delete({ where: { id: existing.id } });
      res.json({ done: false, date });
    } else {
      await prisma.habitLog.create({ data: { habitId: habit.id, date } });
      res.json({ done: true, date });
    }
  } catch { res.status(500).json({ error: "Server error" }); }
}
