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

export const aiApi = {
  analyzeTask: (title: string, description?: string): Promise<AIAnalysis> => {
    const key = getStoredAIKey();
    return api.post(
      "/ai/analyze-task",
      { title, description },
      key ? { headers: { "x-anthropic-key": key } } : undefined,
    ).then((r) => r.data);
  },
};
