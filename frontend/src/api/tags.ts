import { api } from "./client";

export interface Tag {
  id: string;
  name: string;
  color: string;
  _count?: { tasks: number };
}

export const tagsApi = {
  getAll: () => api.get("/tags").then((r) => r.data),
  create: (data: { name: string; color?: string }) =>
    api.post("/tags", data).then((r) => r.data),
  update: (id: string, data: { name?: string; color?: string }) =>
    api.patch(`/tags/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/tags/${id}`).then((r) => r.data),
};
