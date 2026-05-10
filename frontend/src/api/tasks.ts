import { api } from "./client";

export interface TaskAttachment {
  id: string;
  filename: string;
  originalName: string;
  url: string;
  mimetype: string;
  size: number;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
  dueDate?: string;
  reminder?: string;
  isArchived: boolean;
  position: number;
  recurrence?: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
  projectId?: string;
  parentId?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  subtasks: Task[];
  tags: { tag: Tag }[];
  project?: { id: string; name: string; color: string };
  attachments?: TaskAttachment[];
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface TaskFilters {
  projectId?: string;
  status?: string;
  priority?: string;
  tagId?: string;
  search?: string;
  isArchived?: boolean;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export const tasksApi = {
  getAll: (filters?: TaskFilters) =>
    api.get("/tasks", { params: filters }).then((r) => r.data),
  getOne: (id: string) => api.get(`/tasks/${id}`).then((r) => r.data),
  create: (data: Partial<Task> & { tagIds?: string[] }) =>
    api.post("/tasks", data).then((r) => r.data),
  update: (id: string, data: Partial<Task> & { tagIds?: string[] }) =>
    api.patch(`/tasks/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/tasks/${id}`).then((r) => r.data),
  reorder: (tasks: { id: string; position: number }[]) =>
    api.post("/tasks/reorder", { tasks }).then((r) => r.data),
  uploadAttachment: (taskId: string, file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return api.post(`/tasks/${taskId}/attachments`, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then((r) => r.data as TaskAttachment);
  },
  deleteAttachment: (taskId: string, attachmentId: string) =>
    api.delete(`/tasks/${taskId}/attachments/${attachmentId}`).then((r) => r.data),
};
