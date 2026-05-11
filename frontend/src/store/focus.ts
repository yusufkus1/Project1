import { create } from "zustand";
import { persist } from "zustand/middleware";

export type FocusMode = "work" | "short_break" | "long_break";
export type TimerStatus = "idle" | "running" | "paused";

export interface FocusSession {
  id: string;
  taskId?: string;
  taskTitle?: string;
  type: FocusMode;
  duration: number; // minutes
  completedAt: string;
  interrupted: boolean;
}

export interface FocusSettings {
  workDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  sessionsBeforeLongBreak: number;
  xpPerSession: number;
  soundEnabled: boolean;
}

const DEFAULT_SETTINGS: FocusSettings = {
  workDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  sessionsBeforeLongBreak: 4,
  xpPerSession: 15,
  soundEnabled: true,
};

function modeDuration(mode: FocusMode, settings: FocusSettings) {
  if (mode === "work") return settings.workDuration * 60;
  if (mode === "short_break") return settings.shortBreakDuration * 60;
  return settings.longBreakDuration * 60;
}

interface FocusState {
  // --- not persisted ---
  mode: FocusMode;
  status: TimerStatus;
  remaining: number; // seconds (when idle/paused)
  endAt: number | null; // Date.now() + ms (when running)
  completedWorkSessions: number;
  currentTaskId: string | null;
  currentTaskTitle: string | null;

  // --- persisted ---
  sessions: FocusSession[];
  settings: FocusSettings;
  totalFocusMinutes: number;

  // actions
  start: () => void;
  pause: () => void;
  reset: () => void;
  skip: () => { recorded: boolean; type: FocusMode; duration: number } | null;
  setMode: (mode: FocusMode) => void;
  setTask: (id: string | null, title: string | null) => void;
  finishSession: (interrupted?: boolean) => { type: FocusMode; duration: number } | null;
  updateSettings: (s: Partial<FocusSettings>) => void;
  clearHistory: () => void;
  getDisplaySeconds: () => number;
}

export const useFocusStore = create<FocusState>()(
  persist(
    (set, get) => ({
      mode: "work",
      status: "idle",
      remaining: DEFAULT_SETTINGS.workDuration * 60,
      endAt: null,
      completedWorkSessions: 0,
      currentTaskId: null,
      currentTaskTitle: null,
      sessions: [],
      settings: DEFAULT_SETTINGS,
      totalFocusMinutes: 0,

      getDisplaySeconds: () => {
        const { status, endAt, remaining } = get();
        if (status === "running" && endAt) {
          return Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
        }
        return remaining;
      },

      start: () => {
        const { remaining } = get();
        set({ status: "running", endAt: Date.now() + remaining * 1000 });
      },

      pause: () => {
        const { endAt } = get();
        if (!endAt) return;
        const remaining = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
        set({ status: "paused", remaining, endAt: null });
      },

      reset: () => {
        const { mode, settings } = get();
        set({ status: "idle", remaining: modeDuration(mode, settings), endAt: null });
      },

      skip: () => {
        const {
          status, mode, completedWorkSessions, settings,
          currentTaskId, currentTaskTitle, sessions, totalFocusMinutes,
        } = get();

        const duration = modeDuration(mode, settings) / 60; // minutes

        let nextMode: FocusMode;
        let newCompleted = completedWorkSessions;
        if (mode === "work") {
          newCompleted += 1;
          nextMode = newCompleted % settings.sessionsBeforeLongBreak === 0 ? "long_break" : "short_break";
        } else {
          nextMode = "work";
        }

        // Record session if timer was running — treat skip as intentional completion
        const wasRunning = status === "running";
        const session: FocusSession | null = wasRunning ? {
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          taskId: currentTaskId ?? undefined,
          taskTitle: currentTaskTitle ?? undefined,
          type: mode,
          duration,
          completedAt: new Date().toISOString(),
          interrupted: false,
        } : null;

        set({
          sessions: session ? [session, ...sessions].slice(0, 200) : sessions,
          totalFocusMinutes: wasRunning && mode === "work" ? totalFocusMinutes + duration : totalFocusMinutes,
          mode: nextMode,
          status: "idle",
          remaining: modeDuration(nextMode, settings),
          endAt: null,
          completedWorkSessions: newCompleted,
        });

        return wasRunning ? { recorded: true, type: mode, duration } : null;
      },

      setMode: (mode) => {
        const { status, mode: currentMode, settings, currentTaskId, currentTaskTitle, sessions } = get();
        const duration = modeDuration(currentMode, settings) / 60;
        const wasRunning = status === "running";
        const session: FocusSession | null = wasRunning ? {
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          taskId: currentTaskId ?? undefined,
          taskTitle: currentTaskTitle ?? undefined,
          type: currentMode,
          duration,
          completedAt: new Date().toISOString(),
          interrupted: true,
        } : null;
        set({
          sessions: session ? [session, ...sessions].slice(0, 200) : sessions,
          mode,
          status: "idle",
          remaining: modeDuration(mode, settings),
          endAt: null,
        });
      },

      setTask: (id, title) => set({ currentTaskId: id, currentTaskTitle: title }),

      finishSession: (interrupted = false) => {
        const {
          mode, settings, currentTaskId, currentTaskTitle,
          sessions, totalFocusMinutes, completedWorkSessions,
        } = get();

        const duration =
          mode === "work" ? settings.workDuration
          : mode === "short_break" ? settings.shortBreakDuration
          : settings.longBreakDuration;

        const session: FocusSession = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          taskId: currentTaskId ?? undefined,
          taskTitle: currentTaskTitle ?? undefined,
          type: mode,
          duration,
          completedAt: new Date().toISOString(),
          interrupted,
        };

        let nextMode: FocusMode = mode;
        let newCompleted = completedWorkSessions;
        if (!interrupted) {
          if (mode === "work") {
            newCompleted += 1;
            nextMode = newCompleted % settings.sessionsBeforeLongBreak === 0 ? "long_break" : "short_break";
          } else {
            nextMode = "work";
          }
        }

        set({
          sessions: [session, ...sessions].slice(0, 200),
          totalFocusMinutes: mode === "work" && !interrupted ? totalFocusMinutes + duration : totalFocusMinutes,
          mode: nextMode,
          status: "idle",
          remaining: modeDuration(nextMode, settings),
          endAt: null,
          completedWorkSessions: newCompleted,
        });

        return { type: mode, duration };
      },

      updateSettings: (newSettings) => {
        const { settings, mode, status } = get();
        const merged = { ...settings, ...newSettings };
        const updates: Partial<FocusState> = { settings: merged };
        if (status === "idle") {
          updates.remaining = modeDuration(mode, merged);
        }
        set(updates);
      },

      clearHistory: () => set({ sessions: [] }),
    }),
    {
      name: "focus-store",
      partialize: (s) => ({
        sessions: s.sessions,
        settings: s.settings,
        totalFocusMinutes: s.totalFocusMinutes,
      }),
    }
  )
);
