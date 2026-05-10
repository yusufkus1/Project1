import { api } from "./client";

export const authApi = {
  register: (data: { email: string; password: string; name: string }) =>
    api.post("/auth/register", data).then((r) => r.data),
  login: (data: { email: string; password: string }) =>
    api.post("/auth/login", data).then((r) => r.data),
  forgotPassword: (email: string) =>
    api.post("/auth/forgot-password", { email }).then((r) => r.data),
  resetPassword: (token: string, password: string) =>
    api.post("/auth/reset-password", { token, password }).then((r) => r.data),
};
