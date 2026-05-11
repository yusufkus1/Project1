import { api } from "./client";

export interface HabitLog { id: string; date: string; habitId: string }

export interface Habit {
  id: string;
  title: string;
  color: string;
  icon: string;
  isArchived: boolean;
  createdAt: string;
  logs: HabitLog[];
}

export const habitsApi = {
  getAll: () => api.get<Habit[]>("/habits").then((r) => r.data),
  create: (data: { title: string; color: string; icon: string }) =>
    api.post<Habit>("/habits", data).then((r) => r.data),
  update: (id: string, data: Partial<{ title: string; color: string; icon: string }>) =>
    api.put<Habit>(`/habits/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/habits/${id}`),
  toggle: (id: string, date?: string) =>
    api.post<{ done: boolean; date: string }>(`/habits/${id}/toggle`, { date }).then((r) => r.data),
};
