import { api } from "./client";

export const AI_KEY_STORAGE = "todoapp_anthropic_key";

export function getStoredAIKey(): string {
  return localStorage.getItem(AI_KEY_STORAGE) ?? "";
}

export interface AIAnalysis {
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  estimatedMinutes: number;
  xpReward: number;
  rationale: string;
}

export interface ParsedTask {
  title: string;
  description: string | null;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  dueDate: string | null;
}

export const aiApi = {
  analyzeTask: (title: string, description?: string): Promise<AIAnalysis> => {
    const key = getStoredAIKey();
    return api.post(
      "/ai/analyze-task",
      { title, description },
      key ? { headers: { "x-anthropic-key": key } } : undefined,
    ).then((r) => r.data);
  },

  parseNotes: (text: string): Promise<{ tasks: ParsedTask[] }> => {
    const key = getStoredAIKey();
    return api.post(
      "/ai/parse-notes",
      { text },
      key ? { headers: { "x-anthropic-key": key } } : undefined,
    ).then((r) => r.data);
  },
};
