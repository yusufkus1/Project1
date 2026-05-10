import { api } from "./client";

export interface Project {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon: string;
  isArchived: boolean;
  createdAt: string;
  _count?: { tasks: number };
}

export const projectsApi = {
  getAll: () => api.get("/projects").then((r) => r.data),
  create: (data: Partial<Project>) => api.post("/projects", data).then((r) => r.data),
  update: (id: string, data: Partial<Project>) =>
    api.patch(`/projects/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/projects/${id}`).then((r) => r.data),
};
