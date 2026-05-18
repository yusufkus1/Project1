import { Router, Request, Response } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { authenticate } from "../middleware/auth";

const router = Router();

const XP_BY_PRIORITY: Record<string, number> = { LOW: 10, MEDIUM: 20, HIGH: 35, CRITICAL: 50 };

router.post("/analyze-task", authenticate, async (req: Request, res: Response) => {
  const { title, description } = req.body as { title: string; description?: string };

  if (!title?.trim()) {
    return res.status(400).json({ error: "title is required" });
  }

  // User-supplied key takes priority over server env var
  const apiKey =
    (req.headers["x-anthropic-key"] as string | undefined)?.trim() ||
    process.env["ANTHROPIC_API_KEY"]?.trim();

  if (!apiKey) {
    return res.status(503).json({ error: "AI not configured — add your Anthropic API key in Settings" });
  }

  try {
    const client = new Anthropic({ apiKey });

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 256,
      messages: [
        {
          role: "user",
          content: `You are a productivity assistant helping someone with ADHD manage their tasks. Analyze this task and return ONLY a JSON object with no extra text.

Task title: "${title}"${description ? `\nDescription: "${description.replace(/<[^>]*>/g, " ").trim()}"` : ""}

Return JSON with exactly these fields:
{
  "priority": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "estimatedMinutes": <integer between 5 and 480>,
  "rationale": "<one short sentence explaining priority and time estimate>"
}

Guidelines:
- CRITICAL: urgent deadline, blocking others, serious consequences if missed
- HIGH: important, should be done today/this week
- MEDIUM: normal task, can wait a few days
- LOW: nice-to-have, no real deadline
- estimatedMinutes: realistic time including thinking + doing`,
        },
      ],
    });

    const raw = (message.content[0] as { type: string; text: string }).text.trim();
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");

    const parsed = JSON.parse(jsonMatch[0]) as {
      priority: string;
      estimatedMinutes: number;
      rationale: string;
    };

    const priority = ["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(parsed.priority)
      ? parsed.priority
      : "MEDIUM";

    const estimatedMinutes = Math.max(5, Math.min(480, Math.round(Number(parsed.estimatedMinutes) || 30)));

    return res.json({
      priority,
      estimatedMinutes,
      xpReward: XP_BY_PRIORITY[priority],
      rationale: parsed.rationale ?? "",
    });
  } catch (err: unknown) {
    console.error("AI analyze error:", err);
    // Surface Anthropic API errors so the client can show a useful message
    const message =
      err instanceof Error ? err.message : "AI analysis failed";
    const status =
      message.includes("401") || message.toLowerCase().includes("authentication")
        ? 401
        : message.includes("429")
        ? 429
        : 500;
    return res.status(status).json({ error: message });
  }
});

router.post("/parse-notes", authenticate, async (req: Request, res: Response) => {
  const { text } = req.body as { text: string };

  if (!text?.trim()) {
    return res.status(400).json({ error: "text is required" });
  }

  const apiKey =
    (req.headers["x-anthropic-key"] as string | undefined)?.trim() ||
    process.env["ANTHROPIC_API_KEY"]?.trim();

  if (!apiKey) {
    return res.status(503).json({ error: "AI not configured — add your Anthropic API key in Settings" });
  }

  const today = new Date().toISOString().slice(0, 10);

  try {
    const client = new Anthropic({ apiKey });

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: `Today is ${today}. Extract every task, to-do, and action item from the note below. Return ONLY a valid JSON array with no extra text.

Each item must have:
- "title": short, actionable string
- "description": extra detail if present, otherwise null
- "priority": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
- "dueDate": ISO date string (YYYY-MM-DD) if a date/time is mentioned (e.g. "tomorrow", "next Friday", "by end of week"), otherwise null

Priority guidelines:
- CRITICAL: urgent or blocking
- HIGH: important, due soon
- MEDIUM: normal
- LOW: nice-to-have, no deadline

Note:
${text.slice(0, 4000)}

Return only the JSON array, nothing else.`,
        },
      ],
    });

    const raw = (message.content[0] as { type: string; text: string }).text.trim();
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error("No JSON array in response");

    const parsed = JSON.parse(jsonMatch[0]) as {
      title: string;
      description: string | null;
      priority: string;
      dueDate: string | null;
    }[];

    const tasks = parsed.map((t) => ({
      title: String(t.title ?? "").slice(0, 255),
      description: t.description ? String(t.description) : null,
      priority: ["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(t.priority) ? t.priority : "MEDIUM",
      dueDate: t.dueDate ?? null,
    }));

    return res.json({ tasks });
  } catch (err: unknown) {
    console.error("AI parse-notes error:", err);
    const message = err instanceof Error ? err.message : "AI parsing failed";
    const status =
      message.includes("401") || message.toLowerCase().includes("authentication") ? 401
      : message.includes("429") ? 429
      : 500;
    return res.status(status).json({ error: message });
  }
});

export default router;
