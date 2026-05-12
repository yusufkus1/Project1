import { useQuery } from "@tanstack/react-query";
import { X, Star } from "lucide-react";
import { isToday } from "date-fns";
import { tasksApi, Task } from "../api/tasks";
import { useFocusStore } from "../store/focus";
import { useGamificationStore } from "../store/gamification";

const MESSAGES = [
  "Great work today! Every task is a step forward.",
  "You showed up. That's what matters.",
  "Consistency beats perfection. Keep going!",
  "Rest well. Tomorrow you'll do it again.",
  "Progress, not perfection. You're doing great!",
];

export function DaySummary({ onClose }: { onClose: () => void }) {
  const { data } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => tasksApi.getAll({ isArchived: false, limit: 200 }),
  });
  const allTasks: Task[] = data?.tasks ?? [];
  const completedToday = allTasks.filter(
    (t) => t.status === "COMPLETED" && t.updatedAt && isToday(new Date(t.updatedAt))
  );

  const { sessions } = useFocusStore();
  const { xp, streak } = useGamificationStore();
  const todaySessions = sessions.filter((s) => isToday(new Date(s.completedAt)));
  const workSessions = todaySessions.filter((s) => s.type === "work" && !s.interrupted);
  const focusMinutes = workSessions.reduce((acc, s) => acc + s.duration, 0);

  const dayIdx = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  const message = MESSAGES[dayIdx % MESSAGES.length]!;

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 150, display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(6px)" }} />
      <div className="bg-white dark:bg-gray-900"
        style={{ position: "relative", zIndex: 1, width: "min(480px, 92vw)", borderRadius: "1.5rem", boxShadow: "0 32px 80px rgba(0,0,0,0.25)", overflow: "hidden" }}>

        {/* Hero */}
        <div style={{ background: "linear-gradient(135deg, #1e1b4b, #312e81, #4c1d95)", padding: "2rem 1.75rem 1.75rem", textAlign: "center", position: "relative" }}>
          <button onClick={onClose} style={{ position: "absolute", top: "1rem", right: "1rem", background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "50%", width: "2rem", height: "2rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>
            <X size={14} />
          </button>
          <div style={{ fontSize: "3.5rem", marginBottom: "0.75rem" }}>
            {completedToday.length > 5 ? "🌟" : completedToday.length > 2 ? "✨" : "🌙"}
          </div>
          <p style={{ color: "white", fontWeight: 900, fontSize: "1.5rem", marginBottom: "0.375rem" }}>Day Complete</p>
          <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.875rem" }}>{message}</p>
        </div>

        {/* Stats */}
        <div style={{ padding: "1.5rem 1.75rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.875rem", marginBottom: "1.25rem" }}>
            {[
              { icon: "✅", label: "Tasks completed", value: completedToday.length },
              { icon: "🍅", label: "Focus sessions", value: workSessions.length },
              { icon: "⏱️", label: "Focus time", value: focusMinutes >= 60 ? `${Math.floor(focusMinutes / 60)}h ${focusMinutes % 60}m` : `${focusMinutes}m` },
              { icon: "🔥", label: "Day streak", value: streak > 0 ? `${streak} days` : "—" },
            ].map(({ icon, label, value }) => (
              <div key={label} className="bg-gray-50 dark:bg-gray-800" style={{ borderRadius: "0.875rem", padding: "1rem" }}>
                <span style={{ fontSize: "1.25rem" }}>{icon}</span>
                <p className="text-gray-900 dark:text-white" style={{ fontWeight: 800, fontSize: "1.375rem", marginTop: "0.25rem" }}>{value}</p>
                <p className="text-gray-400" style={{ fontSize: "0.75rem" }}>{label}</p>
              </div>
            ))}
          </div>

          {/* XP banner */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "1rem 1.125rem", borderRadius: "0.875rem", background: "rgba(124,111,247,0.08)", border: "1.5px solid rgba(124,111,247,0.2)" }}>
            <Star size={18} style={{ color: "#7c6ff7", flexShrink: 0 }} />
            <p style={{ color: "#7c6ff7", fontWeight: 600, fontSize: "0.9375rem" }}>{xp} total XP earned — keep it up!</p>
          </div>
        </div>

        <div style={{ padding: "0 1.75rem 1.75rem" }}>
          <button
            onClick={onClose}
            style={{ width: "100%", padding: "0.875rem", borderRadius: "0.875rem", border: "none", background: "linear-gradient(135deg, #7c6ff7, #a78bfa)", color: "white", fontWeight: 700, fontSize: "0.9375rem", cursor: "pointer", boxShadow: "0 4px 12px rgba(124,111,247,0.3)" }}
          >
            Rest well 🌙
          </button>
        </div>
      </div>
    </div>
  );
}
