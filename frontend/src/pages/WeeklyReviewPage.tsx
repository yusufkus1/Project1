import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, CheckCircle2, Clock, Zap, Target, TrendingUp, AlertCircle } from "lucide-react";
import { format, startOfWeek, endOfWeek, addWeeks, eachDayOfInterval, isWithinInterval } from "date-fns";
import { tasksApi, Task } from "../api/tasks";
import { useFocusStore } from "../store/focus";
import { useGamificationStore } from "../store/gamification";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "../hooks/useIsMobile";

function getWeekRange(offset: number) {
  const base = addWeeks(new Date(), offset);
  const start = startOfWeek(base, { weekStartsOn: 1 }); // Monday
  const end = endOfWeek(base, { weekStartsOn: 1 });     // Sunday
  return { start, end };
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function WeeklyReviewPage() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [weekOffset, setWeekOffset] = useState(0);
  const { start, end } = useMemo(() => getWeekRange(weekOffset), [weekOffset]);

  const sessions = useFocusStore((s) => s.sessions);
  const { getWeekXP, streak, longestStreak, totalTasksCompleted } = useGamificationStore();

  const { data: completedData } = useQuery({
    queryKey: ["tasks", "completed-review"],
    queryFn: () => tasksApi.getAll({ status: "COMPLETED", limit: 200 }),
  });
  const { data: pendingData } = useQuery({
    queryKey: ["tasks", "pending-review"],
    queryFn: () => tasksApi.getAll({ limit: 200 }),
  });

  const allCompleted: Task[] = completedData?.tasks ?? [];
  const allPending: Task[] = pendingData?.tasks ?? [];

  const weekInterval = { start, end };

  const weekCompleted = allCompleted.filter((t) =>
    t.completedAt && isWithinInterval(new Date(t.completedAt), weekInterval)
  );

  const weekOverdue = allPending.filter((t) =>
    t.status !== "COMPLETED" && t.dueDate &&
    new Date(t.dueDate) < start &&
    !t.isArchived
  );

  const weekFocusSessions = sessions.filter((s) =>
    isWithinInterval(new Date(s.completedAt), weekInterval)
  );
  const weekWorkSessions = weekFocusSessions.filter((s) => s.type === "work" && !s.interrupted);
  const weekFocusMinutes = weekWorkSessions.reduce((sum, s) => sum + s.duration, 0);
  const weekXP = getWeekXP(start, end);

  const days = eachDayOfInterval({ start, end });
  const completedByDay = days.map((day) => {
    const dayStr = format(day, "yyyy-MM-dd");
    return weekCompleted.filter((t) =>
      t.completedAt && format(new Date(t.completedAt), "yyyy-MM-dd") === dayStr
    ).length;
  });
  const maxDay = Math.max(...completedByDay, 1);
  const bestDayIdx = completedByDay.indexOf(Math.max(...completedByDay));

  const isCurrentWeek = weekOffset === 0;

  const statCard = (icon: React.ReactNode, label: string, value: string | number, sub?: string, color = "#7c6ff7") => (
    <div style={{
      background: "white", borderRadius: "1rem", padding: "1.25rem 1.5rem",
      border: "1px solid var(--color-border)", display: "flex", flexDirection: "column", gap: "0.5rem",
    }} className="dark:bg-gray-900 dark:border-gray-800">
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color }}>
        {icon}
        <span style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
      </div>
      <div style={{ fontSize: isMobile ? "1.5rem" : "2rem", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.03em" }} className="dark:text-white">
        {value}
      </div>
      {sub && <div style={{ fontSize: "0.8125rem", color: "#94a3b8" }}>{sub}</div>}
    </div>
  );

  return (
    <div style={{ maxWidth: "56rem" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "2rem" }}>
        <div>
          <h1 style={{ fontSize: isMobile ? "1.5rem" : "1.75rem", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em", marginBottom: "0.25rem" }} className="dark:text-white">
            Weekly Review
          </h1>
          <p style={{ fontSize: "0.9375rem", color: "#64748b" }}>
            {format(start, "MMM d")} – {format(end, "MMM d, yyyy")}
            {isCurrentWeek && <span style={{ marginLeft: "0.5rem", fontSize: "0.75rem", fontWeight: 600, color: "#7c6ff7", background: "rgba(124,111,247,0.1)", padding: "0.125rem 0.5rem", borderRadius: "999px" }}>This week</span>}
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button onClick={() => setWeekOffset((o) => o - 1)} style={{
            width: "2.25rem", height: "2.25rem", borderRadius: "0.5rem", border: "1px solid #e2e8f0",
            background: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          }} className="dark:bg-gray-900 dark:border-gray-700 text-gray-500 dark:text-gray-400">
            <ChevronLeft size={16} />
          </button>
          <button onClick={() => setWeekOffset((o) => o + 1)} disabled={weekOffset === 0} style={{
            width: "2.25rem", height: "2.25rem", borderRadius: "0.5rem", border: "1px solid #e2e8f0",
            background: "white", cursor: weekOffset === 0 ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            opacity: weekOffset === 0 ? 0.4 : 1,
          }} className="dark:bg-gray-900 dark:border-gray-700 text-gray-500 dark:text-gray-400">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
        {statCard(<CheckCircle2 size={14} />, "Completed", weekCompleted.length, `of ${totalTasksCompleted} total`)}
        {statCard(<Clock size={14} />, "Focus time", `${weekFocusMinutes}m`, `${weekWorkSessions.length} sessions`, "#0ea5e9")}
        {statCard(<Zap size={14} />, "XP earned", weekXP, "this week", "#f59e0b")}
        {statCard(<TrendingUp size={14} />, "Streak", `${streak}d`, `best: ${longestStreak}d`, "#10b981")}
      </div>

      {/* Daily activity chart */}
      <div style={{
        background: "white", borderRadius: "1rem", padding: "1.5rem",
        border: "1px solid var(--color-border)", marginBottom: "2rem",
      }} className="dark:bg-gray-900 dark:border-gray-800">
        <h2 style={{ fontSize: "0.875rem", fontWeight: 700, color: "#0f172a", marginBottom: "1.25rem" }} className="dark:text-white">
          Daily Activity
        </h2>
        <div style={{ display: "flex", alignItems: "flex-end", gap: "0.75rem", height: "100px" }}>
          {days.map((day, i) => {
            const count = completedByDay[i] ?? 0;
            const isBest = i === bestDayIdx && count > 0;
            const isToday = format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
            const barH = count === 0 ? 4 : Math.max(16, Math.round((count / maxDay) * 88));
            return (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
                {count > 0 && (
                  <span style={{ fontSize: "0.6875rem", fontWeight: 700, color: isBest ? "#7c6ff7" : "#94a3b8" }}>{count}</span>
                )}
                <div style={{ width: "100%", display: "flex", alignItems: "flex-end", height: "80px" }}>
                  <div style={{
                    width: "100%", height: `${barH}px`, borderRadius: "4px 4px 2px 2px",
                    background: count === 0 ? "var(--color-border)" : isBest ? "#7c6ff7" : "#c4bbfd",
                    transition: "height 0.3s ease",
                  }} className={count === 0 ? "dark:bg-gray-800" : ""} />
                </div>
                <span style={{ fontSize: "0.6875rem", fontWeight: isToday ? 700 : 500, color: isToday ? "#7c6ff7" : "#94a3b8" }}>
                  {DAY_LABELS[i]}
                </span>
              </div>
            );
          })}
        </div>
        {bestDayIdx >= 0 && completedByDay[bestDayIdx]! > 0 && (
          <p style={{ fontSize: "0.8125rem", color: "#64748b", marginTop: "1rem" }}>
            Best day: <strong style={{ color: "#7c6ff7" }}>{DAY_LABELS[bestDayIdx]}</strong> with {completedByDay[bestDayIdx]} tasks
          </p>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "1rem", marginBottom: "2rem" }}>

        {/* Completed tasks */}
        <div style={{
          background: "white", borderRadius: "1rem", padding: "1.5rem",
          border: "1px solid var(--color-border)",
        }} className="dark:bg-gray-900 dark:border-gray-800">
          <h2 style={{ fontSize: "0.875rem", fontWeight: 700, marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }} className="text-gray-800 dark:text-white">
            <CheckCircle2 size={14} color="#10b981" /> Completed ({weekCompleted.length})
          </h2>
          {weekCompleted.length === 0 ? (
            <p style={{ fontSize: "0.8125rem", color: "#94a3b8" }}>No tasks completed this week.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxHeight: "240px", overflowY: "auto" }}>
              {weekCompleted.map((t) => (
                <div key={t.id} onClick={() => navigate(`/tasks/${t.id}`)} style={{
                  display: "flex", alignItems: "center", gap: "0.5rem",
                  padding: "0.375rem 0", cursor: "pointer", borderRadius: "0.375rem",
                }}>
                  <CheckCircle2 size={13} color="#10b981" style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: "0.8125rem", color: "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} className="dark:text-gray-300 hover:text-indigo-600">
                    {t.title}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Overdue/needs attention */}
        <div style={{
          background: "white", borderRadius: "1rem", padding: "1.5rem",
          border: "1px solid var(--color-border)",
        }} className="dark:bg-gray-900 dark:border-gray-800">
          <h2 style={{ fontSize: "0.875rem", fontWeight: 700, marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }} className="text-gray-800 dark:text-white">
            <AlertCircle size={14} color="#ef4444" /> Overdue ({weekOverdue.length})
          </h2>
          {weekOverdue.length === 0 ? (
            <p style={{ fontSize: "0.8125rem", color: "#94a3b8" }}>No overdue tasks.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxHeight: "240px", overflowY: "auto" }}>
              {weekOverdue.map((t) => (
                <div key={t.id} onClick={() => navigate(`/tasks/${t.id}`)} style={{
                  display: "flex", alignItems: "center", gap: "0.5rem",
                  padding: "0.375rem 0", cursor: "pointer",
                }}>
                  <AlertCircle size={13} color="#ef4444" style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: "0.8125rem", color: "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} className="dark:text-gray-300 hover:text-indigo-600">
                    {t.title}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Focus sessions */}
      {weekFocusSessions.length > 0 && (
        <div style={{
          background: "white", borderRadius: "1rem", padding: "1.5rem",
          border: "1px solid var(--color-border)",
        }} className="dark:bg-gray-900 dark:border-gray-800">
          <h2 style={{ fontSize: "0.875rem", fontWeight: 700, marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }} className="text-gray-800 dark:text-white">
            <Target size={14} color="#7c6ff7" /> Focus Sessions ({weekFocusSessions.length})
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxHeight: "200px", overflowY: "auto" }}>
            {weekFocusSessions.slice(0, 20).map((s) => (
              <div key={s.id} style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.375rem 0", borderBottom: "1px solid #f8fafc" }} className="dark:border-gray-800">
                <span style={{ fontSize: "0.875rem" }}>
                  {s.type === "work" ? "🍅" : s.type === "short_break" ? "☕" : "🛌"}
                </span>
                <span style={{ fontSize: "0.8125rem", color: "#374151", flex: 1 }} className="dark:text-gray-300">
                  {s.taskTitle ?? (s.type === "work" ? "Focus session" : s.type === "short_break" ? "Short break" : "Long break")}
                </span>
                <span style={{ fontSize: "0.75rem", color: "#94a3b8", flexShrink: 0 }}>{s.duration}m</span>
                {s.interrupted && <span style={{ fontSize: "0.6875rem", color: "#f59e0b", background: "rgba(245,158,11,0.1)", padding: "0.1em 0.4em", borderRadius: "4px" }}>interrupted</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
