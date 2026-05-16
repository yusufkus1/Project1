import { create } from "zustand";
import { persist } from "zustand/middleware";

const LEVEL_THRESHOLDS = [0, 50, 150, 300, 500, 750, 1100, 1500, 2000, 2600, 3300, 4200, 5200, 6400, 8000];

const XP_BY_PRIORITY: Record<string, number> = {
  LOW: 10,
  MEDIUM: 20,
  HIGH: 35,
  CRITICAL: 50,
};

export const WEEKLY_XP_GOAL = 300;
const WEEKLY_BONUS_XP = 100;

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: "tasks" | "streaks" | "focus" | "habits" | "special";
}

export const ACHIEVEMENTS: Achievement[] = [
  // Tasks
  { id: "first_task",    title: "First Step",      description: "Complete your first task",                   icon: "🎯", category: "tasks" },
  { id: "hat_trick",     title: "Hat Trick",        description: "Complete 3 tasks in a day",                  icon: "🎩", category: "tasks" },
  { id: "daily_five",    title: "High Five",        description: "Complete 5 tasks in a day",                  icon: "🖐️", category: "tasks" },
  { id: "tasks_10",      title: "Getting Started",  description: "Complete 10 tasks total",                    icon: "🚀", category: "tasks" },
  { id: "tasks_50",      title: "Productive",       description: "Complete 50 tasks total",                    icon: "👑", category: "tasks" },
  { id: "tasks_100",     title: "Century",          description: "Complete 100 tasks total",                   icon: "💎", category: "tasks" },
  { id: "tasks_250",     title: "Unstoppable",      description: "Complete 250 tasks total",                   icon: "🏆", category: "tasks" },
  { id: "perfectionist", title: "Perfectionist",    description: "Complete 10 Critical priority tasks",        icon: "⚡", category: "tasks" },
  { id: "centurion",     title: "Centurion",        description: "Earn 100 XP total",                         icon: "💯", category: "tasks" },
  { id: "level_5",       title: "Rising Star",      description: "Reach Level 5",                             icon: "⭐", category: "tasks" },
  { id: "level_10",      title: "Grandmaster",      description: "Reach Level 10",                            icon: "🎖️", category: "tasks" },
  // Streaks
  { id: "on_fire",       title: "On Fire",          description: "3-day streak",                              icon: "🔥", category: "streaks" },
  { id: "week_warrior",  title: "Week Warrior",     description: "7-day streak",                              icon: "⚔️", category: "streaks" },
  { id: "streak_30",     title: "Iron Will",        description: "30-day streak",                             icon: "🌟", category: "streaks" },
  { id: "streak_100",    title: "Legendary",        description: "100-day streak",                            icon: "🏅", category: "streaks" },
  // Focus
  { id: "focus_10",      title: "Deep Work",        description: "Complete 10 focus sessions",                icon: "🍅", category: "focus" },
  { id: "focus_50",      title: "Flow State",       description: "Complete 50 focus sessions",                icon: "🧠", category: "focus" },
  // Habits
  { id: "habit_30",      title: "Habit Formed",     description: "30-day streak on any habit",                icon: "💪", category: "habits" },
  // Special
  { id: "night_owl",     title: "Night Owl",        description: "Complete a task after 11 PM",               icon: "🦉", category: "special" },
  { id: "early_bird",    title: "Early Bird",       description: "Complete a task before 7 AM",               icon: "🌅", category: "special" },
  { id: "perfect_day",   title: "Perfect Day",      description: "Complete 3+ tasks & all habits in one day", icon: "✨", category: "special" },
];

export const ACHIEVEMENT_CATEGORIES: { key: Achievement["category"]; label: string; icon: string }[] = [
  { key: "tasks",   label: "Tasks",   icon: "🎯" },
  { key: "streaks", label: "Streaks", icon: "🔥" },
  { key: "focus",   label: "Focus",   icon: "🍅" },
  { key: "habits",  label: "Habits",  icon: "💪" },
  { key: "special", label: "Special", icon: "✨" },
];

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday-start week
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getISOWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.valueOf() - yearStart.valueOf()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

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

export interface XPLogEntry { date: string; amount: number }

interface GamificationState {
  xp: number;
  totalTasksCompleted: number;
  tasksCompletedToday: number;
  todayDate: string;
  streak: number;
  longestStreak: number;
  lastActiveDate: string | null;
  unlockedAchievements: string[];
  xpLog: XPLogEntry[];
  focusSessionsCompleted: number;
  criticalTasksCompleted: number;
  lastWeeklyBonusWeek: string | null;
  lastPerfectDayDate: string | null;

  completeTask: (priority: string) => { xpGained: number; leveledUp: boolean; newAchievements: Achievement[]; multiplier: number; weeklyBonusGranted: boolean };
  undoTask: (priority: string) => void;
  addXP: (amount: number) => { xpGained: number; leveledUp: boolean };
  completeFocusSession: () => { newAchievements: Achievement[] };
  checkHabitStreak: (maxStreakDays: number) => Achievement[];
  checkPerfectDay: (tasksToday: number, totalHabits: number, habitsDoneToday: number) => { bonusGranted: boolean; newAchievements: Achievement[] };
  getLevel: () => number;
  getXPProgress: () => number;
  getXPForCurrentLevel: () => number;
  getXPForNextLevel: () => number;
  getWeekXP: (start: Date, end: Date) => number;
  getCurrentWeekXP: () => number;
  getStreakMultiplier: () => number;
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
      xpLog: [],
      focusSessionsCompleted: 0,
      criticalTasksCompleted: 0,
      lastWeeklyBonusWeek: null,
      lastPerfectDayDate: null,

      completeTask: (priority: string) => {
        const state = get();
        const today = new Date().toDateString();
        const yesterday = new Date(Date.now() - 86400000).toDateString();
        const now = new Date();
        const hour = now.getHours();

        const isNewDay = state.todayDate !== today;
        const tasksToday = isNewDay ? 0 : state.tasksCompletedToday;

        const multiplier = get().getStreakMultiplier();
        const baseXP = XP_BY_PRIORITY[priority] ?? 20;
        const xpGained = Math.round(baseXP * multiplier);

        const oldLevel = computeLevel(state.xp);
        const newXP = state.xp + xpGained;
        const newLevel = computeLevel(newXP);
        const leveledUp = newLevel > oldLevel;

        const newTotal = state.totalTasksCompleted + 1;
        const newTasksToday = tasksToday + 1;
        const newCritical = priority === "CRITICAL"
          ? state.criticalTasksCompleted + 1
          : state.criticalTasksCompleted;

        let newStreak = state.streak;
        if (state.lastActiveDate !== today) {
          if (state.lastActiveDate === yesterday || state.lastActiveDate === null) {
            newStreak = state.streak + 1;
          } else {
            newStreak = 1;
          }
        }
        const newLongest = Math.max(state.longestStreak, newStreak);

        const dateKey = now.toISOString().slice(0, 10);
        const xpLog = [...state.xpLog, { date: dateKey, amount: xpGained }].slice(-365);

        // Weekly bonus
        const currentWeek = getISOWeekKey(now);
        const weekStart = getWeekStart(now);
        const weekEnd = new Date(weekStart.getTime() + 6 * 86400000);
        const weekS = weekStart.toISOString().slice(0, 10);
        const weekE = weekEnd.toISOString().slice(0, 10);
        const weekXP = xpLog
          .filter((e) => e.date >= weekS && e.date <= weekE)
          .reduce((sum, e) => sum + e.amount, 0);

        let weeklyBonusGranted = false;
        let lastWeeklyBonusWeek = state.lastWeeklyBonusWeek;
        let finalXP = newXP;
        let finalXPLog = xpLog;
        if (weekXP >= WEEKLY_XP_GOAL && lastWeeklyBonusWeek !== currentWeek) {
          weeklyBonusGranted = true;
          lastWeeklyBonusWeek = currentWeek;
          finalXP = newXP + WEEKLY_BONUS_XP;
          finalXPLog = [...xpLog, { date: dateKey, amount: WEEKLY_BONUS_XP }].slice(-365);
        }

        const newUnlocked = [...state.unlockedAchievements];
        const newAchievements: Achievement[] = [];
        const check = (id: string, cond: boolean) => {
          if (cond && !newUnlocked.includes(id)) {
            newUnlocked.push(id);
            const a = ACHIEVEMENTS.find((x) => x.id === id);
            if (a) newAchievements.push(a);
          }
        };

        check("first_task",    newTotal >= 1);
        check("hat_trick",     newTasksToday >= 3);
        check("daily_five",    newTasksToday >= 5);
        check("on_fire",       newStreak >= 3);
        check("week_warrior",  newStreak >= 7);
        check("streak_30",     newStreak >= 30);
        check("streak_100",    newStreak >= 100);
        check("centurion",     finalXP >= 100);
        check("level_5",       computeLevel(finalXP) >= 5);
        check("level_10",      computeLevel(finalXP) >= 10);
        check("tasks_10",      newTotal >= 10);
        check("tasks_50",      newTotal >= 50);
        check("tasks_100",     newTotal >= 100);
        check("tasks_250",     newTotal >= 250);
        check("perfectionist", newCritical >= 10);
        check("night_owl",     hour >= 23);
        check("early_bird",    hour < 7);

        set({
          xp: finalXP,
          totalTasksCompleted: newTotal,
          tasksCompletedToday: newTasksToday,
          todayDate: today,
          streak: newStreak,
          longestStreak: newLongest,
          lastActiveDate: today,
          unlockedAchievements: newUnlocked,
          xpLog: finalXPLog,
          criticalTasksCompleted: newCritical,
          lastWeeklyBonusWeek,
        });

        return {
          xpGained: weeklyBonusGranted ? xpGained + WEEKLY_BONUS_XP : xpGained,
          leveledUp,
          newAchievements,
          multiplier,
          weeklyBonusGranted,
        };
      },

      addXP: (amount: number) => {
        const state = get();
        const oldLevel = computeLevel(state.xp);
        const newXP = state.xp + amount;
        const newLevel = computeLevel(newXP);
        const dateKey = new Date().toISOString().slice(0, 10);
        const xpLog = [...state.xpLog, { date: dateKey, amount }].slice(-365);
        set({ xp: newXP, xpLog });
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

      completeFocusSession: () => {
        const state = get();
        const newCount = state.focusSessionsCompleted + 1;
        const newUnlocked = [...state.unlockedAchievements];
        const newAchievements: Achievement[] = [];
        const check = (id: string, cond: boolean) => {
          if (cond && !newUnlocked.includes(id)) {
            newUnlocked.push(id);
            const a = ACHIEVEMENTS.find((x) => x.id === id);
            if (a) newAchievements.push(a);
          }
        };
        check("focus_10", newCount >= 10);
        check("focus_50", newCount >= 50);
        set({ focusSessionsCompleted: newCount, unlockedAchievements: newUnlocked });
        return { newAchievements };
      },

      checkHabitStreak: (maxStreakDays: number) => {
        const state = get();
        const newUnlocked = [...state.unlockedAchievements];
        const newAchievements: Achievement[] = [];
        if (maxStreakDays >= 30 && !newUnlocked.includes("habit_30")) {
          newUnlocked.push("habit_30");
          const a = ACHIEVEMENTS.find((x) => x.id === "habit_30");
          if (a) newAchievements.push(a);
          set({ unlockedAchievements: newUnlocked });
        }
        return newAchievements;
      },

      checkPerfectDay: (tasksToday: number, totalHabits: number, habitsDoneToday: number) => {
        if (tasksToday < 3 || totalHabits === 0 || habitsDoneToday < totalHabits) {
          return { bonusGranted: false, newAchievements: [] };
        }
        const state = get();
        const todayKey = new Date().toISOString().slice(0, 10);
        const newUnlocked = [...state.unlockedAchievements];
        const newAchievements: Achievement[] = [];

        if (!newUnlocked.includes("perfect_day")) {
          newUnlocked.push("perfect_day");
          const a = ACHIEVEMENTS.find((x) => x.id === "perfect_day");
          if (a) newAchievements.push(a);
        }

        // Daily bonus XP, once per day
        if (state.lastPerfectDayDate !== todayKey) {
          const xpLog = [...state.xpLog, { date: todayKey, amount: 50 }].slice(-365);
          set({ unlockedAchievements: newUnlocked, xp: state.xp + 50, xpLog, lastPerfectDayDate: todayKey });
          return { bonusGranted: true, newAchievements };
        }

        if (newAchievements.length > 0) set({ unlockedAchievements: newUnlocked });
        return { bonusGranted: false, newAchievements };
      },

      getWeekXP: (start, end) => {
        const s = start.toISOString().slice(0, 10);
        const e = end.toISOString().slice(0, 10);
        return get().xpLog.filter((entry) => entry.date >= s && entry.date <= e).reduce((sum, en) => sum + en.amount, 0);
      },

      getCurrentWeekXP: () => {
        const now = new Date();
        const weekStart = getWeekStart(now);
        const weekEnd = new Date(weekStart.getTime() + 6 * 86400000);
        const s = weekStart.toISOString().slice(0, 10);
        const e = weekEnd.toISOString().slice(0, 10);
        return get().xpLog.filter((entry) => entry.date >= s && entry.date <= e).reduce((sum, en) => sum + en.amount, 0);
      },

      getStreakMultiplier: () => {
        const { streak } = get();
        if (streak >= 30) return 2.0;
        if (streak >= 7) return 1.5;
        return 1.0;
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
