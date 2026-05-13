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

export default router;
