import { create } from "zustand";
import { persist } from "zustand/middleware";

export type View = "inbox" | "today" | "upcoming" | "completed" | "pending" | "in_progress" | "overdue" | `project:${string}` | `tag:${string}`;

interface UIState {
  theme: "light" | "dark";
  sidebarOpen: boolean;
  selectedView: View;
  selectedTaskId: string | null;
  toggleTheme: () => void;
  setSidebarOpen: (open: boolean) => void;
  setSelectedView: (view: View) => void;
  setSelectedTaskId: (id: string | null) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      theme: "light",
      sidebarOpen: true,
      selectedView: "inbox",
      selectedTaskId: null,
      toggleTheme: () => {
        const next = get().theme === "light" ? "dark" : "light";
        document.documentElement.classList.toggle("dark", next === "dark");
        set({ theme: next });
      },
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setSelectedView: (view) => set({ selectedView: view, selectedTaskId: null }),
      setSelectedTaskId: (id) => set({ selectedTaskId: id }),
    }),
    { name: "ui-store", partialize: (s) => ({ theme: s.theme, sidebarOpen: s.sidebarOpen }) }
  )
);
