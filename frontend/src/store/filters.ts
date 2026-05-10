import { create } from "zustand";

interface FiltersState {
  search: string;
  status: string;
  priority: string;
  projectId: string;
  tagId: string;
  sortBy: string;
  sortOrder: "asc" | "desc";
  isArchived: boolean;
  setSearch: (v: string) => void;
  setStatus: (v: string) => void;
  setPriority: (v: string) => void;
  setProjectId: (v: string) => void;
  setTagId: (v: string) => void;
  setSortBy: (v: string) => void;
  setSortOrder: (v: "asc" | "desc") => void;
  setIsArchived: (v: boolean) => void;
  reset: () => void;
}

const defaults = {
  search: "",
  status: "",
  priority: "",
  projectId: "",
  tagId: "",
  sortBy: "position",
  sortOrder: "asc" as const,
  isArchived: false,
};

export const useFiltersStore = create<FiltersState>((set) => ({
  ...defaults,
  setSearch: (v) => set({ search: v }),
  setStatus: (v) => set({ status: v }),
  setPriority: (v) => set({ priority: v }),
  setProjectId: (v) => set({ projectId: v }),
  setTagId: (v) => set({ tagId: v }),
  setSortBy: (v) => set({ sortBy: v }),
  setSortOrder: (v) => set({ sortOrder: v }),
  setIsArchived: (v) => set({ isArchived: v }),
  reset: () => set(defaults),
}));
