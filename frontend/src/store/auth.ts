import { create } from "zustand";
import { User } from "../api/users";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  login: (user: User, accessToken: string, refreshToken: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: !!localStorage.getItem("accessToken"),
  setUser: (user) => set({ user }),
  login: (user, accessToken, refreshToken) => {
    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("refreshToken", refreshToken);
    set({ user, isAuthenticated: true });
  },
  logout: () => {
    localStorage.clear();
    set({ user: null, isAuthenticated: false });
  },
}));
