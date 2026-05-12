import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { usersApi } from "../api/users";
import { useIsMobile } from "../hooks/useIsMobile";
import { useAuthStore } from "../store/auth";
import { useGamificationStore, ACHIEVEMENTS } from "../store/gamification";
import { useUIStore } from "../store/ui";
import {
  CheckCircle, Clock, AlertTriangle, ListTodo, TrendingUp,
  BarChart2, Zap, Flame, Trophy, Star,
} from "lucide-react";

const LEVEL_TITLES: Record<number, string> = {
  1: "Newcomer", 2: "Beginner", 3: "Explorer", 4: "Achiever", 5: "Rising Star",
  6: "Warrior", 7: "Champion", 8: "Master", 9: "Legend", 10: "Grandmaster",
};

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const { setSelectedView } = useUIStore();
  const { data: stats, isLoading } = useQuery({
    queryKey: ["stats"],
    queryFn: usersApi.getStats,
  });

  const {
    xp, streak, longestStreak, totalTasksCompleted, tasksCompletedToday,
    unlockedAchievements, getLevel, getXPProgress, getXPForCurrentLevel, getXPForNextLevel,
  } = useGamificationStore();

  const level = getLevel();
  const xpProgress = getXPProgress();
  const xpCurrent = getXPForCurrentLevel();
  const xpNext = getXPForNextLevel();
  const levelTitle = LEVEL_TITLES[level] ?? "Grandmaster";
  const completionRate = stats?.total ? Math.round((stats.completed / stats.total) * 100) : 0;
  const isMobile = useIsMobile();

  const statCards = [
    { label: "Total Tasks",  value: stats?.total ?? 0,      icon: ListTodo,     color: "#6366f1", bg: "rgba(99,102,241,0.1)", view: "inbox"       },
    { label: "Completed",    value: stats?.completed ?? 0,  icon: CheckCircle,  color: "#22c55e", bg: "rgba(34,197,94,0.1)",  view: "completed"   },
    { label: "Pending",      value: stats?.pending ?? 0,    icon: Clock,        color: "#eab308", bg: "rgba(234,179,8,0.1)",  view: "pending"     },
    { label: "In Progress",  value: stats?.inProgress ?? 0, icon: TrendingUp,   color: "#3b82f6", bg: "rgba(59,130,246,0.1)", view: "in_progress" },
    { label: "Overdue",      value: stats?.overdue ?? 0,    icon: AlertTriangle, color:"#ef4444", bg: "rgba(239,68,68,0.1)",  view: "overdue"     },
  ] as const;

  const card = "background:var(--card-bg,white); border:1px solid var(--card-border,#f1f5f9); border-radius:1rem;";

  return (
    <div style={{ maxWidth: "64rem", display: "flex", flexDirection: "column", gap: "2rem" }}>

      {/* Greeting */}
      <div>
        <h1 style={{ fontSize: isMobile ? "1.75rem" : "2.25rem", fontWeight: 800, marginBottom: "0.5rem" }}
            className="text-gray-900 dark:text-white">
          Hello, {user?.name?.split(" ")[0]} 👋
        </h1>
        <p className="text-gray-500 dark:text-gray-400" style={{ fontSize: "0.9375rem" }}>
          Here's your progress overview
        </p>
      </div>

      {/* Gamification hero */}
      <div style={{
        background: "linear-gradient(135deg, #6366f1, #9333ea)",
        borderRadius: "1.5rem",
        padding: isMobile ? "1.5rem" : "2.5rem",
        color: "white",
        boxShadow: "0 20px 40px rgba(99,102,241,0.3)",
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1.5rem", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: "180px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem", flexWrap: "wrap" }}>
              <span style={{ fontSize: isMobile ? "2rem" : "3rem", fontWeight: 900 }}>Lv.{level}</span>
              <span style={{ background: "rgba(255,255,255,0.2)", padding: "0.375rem 0.875rem", borderRadius: "999px", fontSize: "0.8125rem", fontWeight: 600 }}>
                {levelTitle}
              </span>
            </div>
            <p style={{ color: "rgba(199,210,254,1)", fontSize: "0.875rem", marginBottom: "2rem" }}>{xp} XP total</p>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "rgba(199,210,254,1)", marginBottom: "0.625rem" }}>
                <span>{xp - xpCurrent} XP this level</span>
                <span>{xpNext - xpCurrent} XP needed</span>
              </div>
              <div style={{ width: "100%", background: "rgba(255,255,255,0.2)", borderRadius: "999px", height: "0.75rem" }}>
                <div style={{
                  background: "white",
                  borderRadius: "999px",
                  height: "0.75rem",
                  width: `${Math.max(2, Math.round(xpProgress * 100))}%`,
                  transition: "width 0.7s ease",
                }} />
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "1.25rem", flexWrap: "wrap" }}>
            {[
              { value: streak, label: "day streak", Icon: Flame },
              { value: tasksCompletedToday, label: "done today", Icon: Zap },
              { value: totalTasksCompleted, label: "all time", Icon: Trophy },
            ].map(({ value, label, Icon }) => (
              <div key={label} style={{ textAlign: "center" }}>
                <div style={{ fontSize: isMobile ? "1.75rem" : "2.5rem", fontWeight: 900 }}>{value}</div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", justifyContent: "center", marginTop: "0.5rem", color: "rgba(199,210,254,1)", fontSize: "0.75rem" }}>
                  <Icon size={12} /> {label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 lg:gap-6">
        {isLoading
          ? [...Array(5)].map((_, i) => (
              <div key={i} className="bg-gray-100 dark:bg-gray-800 animate-pulse" style={{ height: "10rem", borderRadius: "1rem" }} />
            ))
          : statCards.map(({ label, value, icon: Icon, color, bg, view }) => (
              <button
                key={label}
                onClick={() => { setSelectedView(view); navigate("/"); }}
                className="bg-white dark:bg-gray-900 hover:shadow-md transition-all"
                style={{
                  borderRadius: "1rem", border: "1px solid", borderColor: "var(--tw-border-color, #f1f5f9)",
                  padding: isMobile ? "1rem" : "1.75rem", display: "flex", flexDirection: "column", gap: isMobile ? "0.75rem" : "1.25rem",
                  cursor: "pointer", textAlign: "left", width: "100%",
                }}
              >
                <div style={{ width: isMobile ? "2.25rem" : "3rem", height: isMobile ? "2.25rem" : "3rem", background: bg, borderRadius: "0.75rem", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon size={isMobile ? 17 : 22} style={{ color }} />
                </div>
                <div>
                  <p className="text-gray-900 dark:text-white text-2xl sm:text-3xl" style={{ fontWeight: 700 }}>{value}</p>
                  <p className="text-gray-500 dark:text-gray-400" style={{ fontSize: "0.8125rem", marginTop: "0.375rem" }}>{label}</p>
                </div>
              </button>
            ))
        }
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-8">
        <div className="bg-white dark:bg-gray-900" style={{ borderRadius: "1rem", border: "1px solid", borderColor: "rgba(241,245,249,1)", padding: "2rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "2rem" }}>
            <BarChart2 size={20} color="#6366f1" />
            <span className="text-gray-900 dark:text-white" style={{ fontWeight: 600 }}>Completion Rate</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
              <span className="text-gray-500 dark:text-gray-400" style={{ fontSize: "0.875rem" }}>Progress</span>
              <span className="text-gray-900 dark:text-white" style={{ fontSize: "2.5rem", fontWeight: 700 }}>{completionRate}%</span>
            </div>
            <div className="bg-gray-100 dark:bg-gray-800" style={{ borderRadius: "999px", height: "1rem" }}>
              <div style={{ background: "#6366f1", borderRadius: "999px", height: "1rem", width: `${completionRate}%`, transition: "width 0.7s ease" }} />
            </div>
            <p className="text-gray-400 dark:text-gray-500" style={{ fontSize: "0.875rem" }}>
              {stats?.completed ?? 0} of {stats?.total ?? 0} tasks completed
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900" style={{ borderRadius: "1rem", border: "1px solid", borderColor: "rgba(241,245,249,1)", padding: "2rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "2rem" }}>
            <AlertTriangle size={20} color="#f97316" />
            <span className="text-gray-900 dark:text-white" style={{ fontWeight: 600 }}>By Priority</span>
          </div>
          {stats?.byPriority?.length ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              {stats.byPriority.map(({ priority, _count }: { priority: string; _count: number }) => {
                const labels: Record<string, string> = { LOW: "Low", MEDIUM: "Medium", HIGH: "High", CRITICAL: "Critical" };
                const colors: Record<string, string> = { LOW: "#22c55e", MEDIUM: "#eab308", HIGH: "#f97316", CRITICAL: "#ef4444" };
                const pct = stats.total ? Math.round((_count / stats.total) * 100) : 0;
                return (
                  <div key={priority} style={{ display: "flex", alignItems: "center", gap: "1rem", fontSize: "0.875rem" }}>
                    <span className="text-gray-500 dark:text-gray-400" style={{ width: "4rem", fontWeight: 500 }}>{labels[priority]}</span>
                    <div className="bg-gray-100 dark:bg-gray-800" style={{ flex: 1, borderRadius: "999px", height: "0.75rem" }}>
                      <div style={{ background: colors[priority], height: "0.75rem", borderRadius: "999px", width: `${pct}%` }} />
                    </div>
                    <span className="text-gray-700 dark:text-gray-300" style={{ width: "1.5rem", textAlign: "right", fontWeight: 600 }}>{_count}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-400 dark:text-gray-500" style={{ fontSize: "0.875rem", textAlign: "center", paddingTop: "2rem" }}>No tasks yet</p>
          )}
        </div>
      </div>

      {/* Streak row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-6">
        {[
          { value: streak, label: "Current streak", Icon: Flame, color: "#f97316", bg: "rgba(249,115,22,0.1)" },
          { value: longestStreak, label: "Longest streak", Icon: Star, color: "#eab308", bg: "rgba(234,179,8,0.1)" },
          { value: tasksCompletedToday, label: "Completed today", Icon: Zap, color: "#22c55e", bg: "rgba(34,197,94,0.1)" },
        ].map(({ value, label, Icon, color, bg }) => (
          <div key={label} className="bg-white dark:bg-gray-900" style={{ borderRadius: "1rem", border: "1px solid rgba(241,245,249,1)", padding: "1.75rem", display: "flex", alignItems: "center", gap: "1.5rem" }}>
            <div style={{ width: "3.5rem", height: "3.5rem", background: bg, borderRadius: "0.875rem", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Icon size={24} style={{ color }} />
            </div>
            <div>
              <p className="text-gray-900 dark:text-white" style={{ fontSize: "2rem", fontWeight: 700 }}>{value}</p>
              <p className="text-gray-500 dark:text-gray-400" style={{ fontSize: "0.875rem", marginTop: "0.25rem" }}>{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Achievements */}
      <div>
        <h2 className="text-gray-900 dark:text-white" style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "2rem" }}>
          Achievements
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-5">
          {ACHIEVEMENTS.map((a) => {
            const unlocked = unlockedAchievements.includes(a.id);
            return (
              <div
                key={a.id}
                className={unlocked ? "bg-white dark:bg-gray-900" : "bg-gray-50 dark:bg-gray-900"}
                style={{
                  borderRadius: "1rem",
                  border: `1px solid ${unlocked ? "rgba(99,102,241,0.3)" : "rgba(241,245,249,1)"}`,
                  padding: "1.5rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "1.25rem",
                  opacity: unlocked ? 1 : 0.4,
                  filter: unlocked ? "none" : "grayscale(1)",
                  transition: "all 0.2s",
                }}
              >
                <span style={{ fontSize: "2.25rem" }}>{a.icon}</span>
                <div>
                  <p className={unlocked ? "text-gray-900 dark:text-white" : "text-gray-400"} style={{ fontWeight: 600 }}>{a.title}</p>
                  <p className="text-gray-400 dark:text-gray-500" style={{ fontSize: "0.8125rem", marginTop: "0.25rem" }}>{a.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
