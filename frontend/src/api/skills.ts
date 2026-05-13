import { api } from "./client";

export interface SkillSession {
  id: string;
  skillId: string;
  date: string;
  userId: string;
}

export interface Skill {
  id: string;
  name: string;
  color: string;
  duration: number;
  days: string; // JSON stringified number[]
  sessions: SkillSession[];
  createdAt: string;
}

export function parseDays(skill: Skill): number[] {
  try { return JSON.parse(skill.days) as number[]; } catch { return []; }
}

export const skillsApi = {
  getAll: (): Promise<Skill[]> => api.get("/skills").then((r) => r.data),
  create: (data: { name: string; color: string; duration: number; days: number[] }): Promise<Skill> =>
    api.post("/skills", data).then((r) => r.data),
  update: (id: string, data: Partial<{ name: string; color: string; duration: number; days: number[] }>): Promise<Skill> =>
    api.put(`/skills/${id}`, data).then((r) => r.data),
  delete: (id: string): Promise<void> => api.delete(`/skills/${id}`).then((r) => r.data),
  toggle: (id: string, date: string): Promise<{ done: boolean; date: string }> =>
    api.post(`/skills/${id}/toggle`, { date }).then((r) => r.data),
};
