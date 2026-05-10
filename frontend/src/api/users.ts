import { api } from "./client";

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  theme: string;
}

export interface Stats {
  total: number;
  completed: number;
  pending: number;
  inProgress: number;
  overdue: number;
  byPriority: { priority: string; _count: number }[];
  byProject: { projectId: string | null; _count: number }[];
}

export const usersApi = {
  getMe: () => api.get("/users/me").then((r) => r.data),
  updateMe: (data: Partial<User>) => api.patch("/users/me", data).then((r) => r.data),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.patch("/users/me/password", { currentPassword, newPassword }).then((r) => r.data),
  getStats: () => api.get("/users/me/stats").then((r) => r.data),
};
