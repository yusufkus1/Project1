import { api } from "./client";

export const focusApi = {
  checkin: () => api.post("/focus/checkin"),
  checkout: () => api.delete("/focus/checkin"),
  count: (): Promise<{ count: number }> => api.get("/focus/count").then((r) => r.data),
};
