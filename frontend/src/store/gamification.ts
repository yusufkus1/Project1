import { create } from "zustand";
import { persist } from "zustand/middleware";

const LEVEL_THRESHOLDS = [0, 50, 150, 300, 500, 750, 1100, 1500, 2000, 2600, 3300, 4200, 5200, 6400, 8000];

const XP_BY_PRIORITY: Record<string, number> = {
  LOW: 10,
  MEDIUM: 20,
  HIGH: 35,
  CRITICAL: 50,
};

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: "first_task", title: "First Step", description: "Complete your first task", icon: "🎯" },
  { id: "hat_trick", title: "Hat Trick", description: "Complete 3 tasks in a day", icon: "🎩" },
  { id: "daily_five", title: "High Five", description: "Complete 5 tasks in a day", icon: "🖐️" },
  { id: "on_fire", title: "On Fire", description: "3-day streak", icon: "🔥" },
  { id: "week_warrior", title: "Week Warrior", description: "7-day streak", icon: "⚔️" },
  { id: "centurion", title: "Centurion", description: "Earn 100 XP total", icon: "💯" },
  { id: "level_5", title: "Rising Star", description: "Reach Level 5", icon: "⭐" },
  { id: "tasks_10", title: "Getting Started", description: "Complete 10 tasks total", icon: "🚀" },
  { id: "tasks_50", title: "Productive", description: "Complete 50 tasks total", icon: "👑" },
];

function computeLevel(xp: number): number {
  let level = 1;
  for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
    if (xp >= LEVEL_THRESHOLDS[i]!) level = i + 1;
    else break;
  }
  return level;
}

function xpForLevel(level: number): number {
  return LEVEL_THRESHOLDS[level - 1] ?? 0;
}

function xpForNextLevel(level: number): number {
  return LEVEL_THRESHOLDS[level] ?? LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1]!;
}

interface GamificationState {
  xp: number;
  totalTasksCompleted: number;
  tasksCompletedToday: number;
  todayDate: string;
  streak: number;
  longestStreak: number;
  lastActiveDate: string | null;
  unlockedAchievements: string[];

  completeTask: (priority: string) => { xpGained: number; leveledUp: boolean; newAchievements: Achievement[] };
  undoTask: (priority: string) => void;
  addXP: (amount: number) => { xpGained: number; leveledUp: boolean };
  getLevel: () => number;
  getXPProgress: () => number;
  getXPForCurrentLevel: () => number;
  getXPForNextLevel: () => number;
}

export const useGamificationStore = create<GamificationState>()(
  persist(
    (set, get) => ({
      xp: 0,
      totalTasksCompleted: 0,
      tasksCompletedToday: 0,
      todayDate: new Date().toDateString(),
      streak: 0,
      longestStreak: 0,
      lastActiveDate: null,
      unlockedAchievements: [],

      completeTask: (priority: string) => {
        const state = get();
        const today = new Date().toDateString();
        const yesterday = new Date(Date.now() - 86400000).toDateString();

        const isNewDay = state.todayDate !== today;
        const tasksToday = isNewDay ? 0 : state.tasksCompletedToday;

        const xpGained = XP_BY_PRIORITY[priority] ?? 20;
        const oldLevel = computeLevel(state.xp);
        const newXP = state.xp + xpGained;
        const newLevel = computeLevel(newXP);
        const leveledUp = newLevel > oldLevel;

        const newTotal = state.totalTasksCompleted + 1;
        const newTasksToday = tasksToday + 1;

        let newStreak = state.streak;
        if (state.lastActiveDate !== today) {
          if (state.lastActiveDate === yesterday || state.lastActiveDate === null) {
            newStreak = state.streak + 1;
          } else {
            newStreak = 1;
          }
        }
        const newLongest = Math.max(state.longestStreak, newStreak);

        const newUnlocked = [...state.unlockedAchievements];
        const newAchievements: Achievement[] = [];

        const check = (id: string, cond: boolean) => {
          if (cond && !newUnlocked.includes(id)) {
            newUnlocked.push(id);
            const a = ACHIEVEMENTS.find((x) => x.id === id);
            if (a) newAchievements.push(a);
          }
        };

        check("first_task", newTotal >= 1);
        check("hat_trick", newTasksToday >= 3);
        check("daily_five", newTasksToday >= 5);
        check("on_fire", newStreak >= 3);
        check("week_warrior", newStreak >= 7);
        check("centurion", newXP >= 100);
        check("level_5", newLevel >= 5);
        check("tasks_10", newTotal >= 10);
        check("tasks_50", newTotal >= 50);

        set({
          xp: newXP,
          totalTasksCompleted: newTotal,
          tasksCompletedToday: newTasksToday,
          todayDate: today,
          streak: newStreak,
          longestStreak: newLongest,
          lastActiveDate: today,
          unlockedAchievements: newUnlocked,
        });

        return { xpGained, leveledUp, newAchievements };
      },

      addXP: (amount: number) => {
        const state = get();
        const oldLevel = computeLevel(state.xp);
        const newXP = state.xp + amount;
        const newLevel = computeLevel(newXP);
        set({ xp: newXP });
        return { xpGained: amount, leveledUp: newLevel > oldLevel };
      },

      undoTask: (priority: string) => {
        const state = get();
        const xpLost = XP_BY_PRIORITY[priority] ?? 20;
        set({
          xp: Math.max(0, state.xp - xpLost),
          totalTasksCompleted: Math.max(0, state.totalTasksCompleted - 1),
          tasksCompletedToday: Math.max(0, state.tasksCompletedToday - 1),
        });
      },

      getLevel: () => computeLevel(get().xp),
      getXPProgress: () => {
        const { xp } = get();
        const level = computeLevel(xp);
        const cur = xpForLevel(level);
        const next = xpForNextLevel(level);
        return next === cur ? 1 : (xp - cur) / (next - cur);
      },
      getXPForCurrentLevel: () => xpForLevel(computeLevel(get().xp)),
      getXPForNextLevel: () => xpForNextLevel(computeLevel(get().xp)),
    }),
    { name: "gamification-store" }
  )
);
