import { api } from "./client";

export interface AIAnalysis {
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  estimatedMinutes: number;
  xpReward: number;
  rationale: string;
}

export const aiApi = {
  analyzeTask: (title: string, description?: string): Promise<AIAnalysis> =>
    api.post("/ai/analyze-task", { title, description }).then((r) => r.data),
};
