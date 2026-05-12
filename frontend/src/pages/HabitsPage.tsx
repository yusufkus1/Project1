import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Check, Flame, X } from "lucide-react";
import { format, subDays } from "date-fns";
import { habitsApi, Habit } from "../api/habits";
import { useGamificationStore } from "../store/gamification";
import toast from "react-hot-toast";

const ICONS = ["⭐", "💪", "📚", "🧘", "🏃", "💧", "🥗", "😴", "✍️", "🎯", "🎵", "🌿", "🧠", "❤️", "🚴"];
const COLORS = ["#7c6ff7", "#10b981", "#f59e0b", "#ef4444", "#a78bfa", "#06b6d4", "#fb923c", "#ec4899", "#14b8a6", "#84cc16"];

function getLast21Days() {
  return Array.from({ length: 21 }, (_, i) => {
    const d = subDays(new Date(), 20 - i);
    return format(d, "yyyy-MM-dd");
  });
}

function getStreak(logs: { date: string }[]): number {
  const logSet = new Set(logs.map((l) => l.date));
  let streak = 0;
  let d = new Date();
  // If today not done, start from yesterday for streak calc
  const today = format(d, "yyyy-MM-dd");
  if (!logSet.has(today)) d = subDays(d, 1);
  while (logSet.has(format(d, "yyyy-MM-dd"))) {
    streak++;
    d = subDays(d, 1);
  }
  return streak;
}

function HabitCard({ habit }: { habit: Habit }) {
  const qc = useQueryClient();
  const { addXP } = useGamificationStore();
  const days = getLast21Days();
  const today = format(new Date(), "yyyy-MM-dd");
  const logSet = new Set(habit.logs.map((l) => l.date));
  const isDoneToday = logSet.has(today);
  const streak = getStreak(habit.logs);

  const toggle = useMutation({
    mutationFn: () => habitsApi.toggle(habit.id, today),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["habits"] });
      if (data.done) {
        addXP(5);
        toast.success(`+5 XP · ${habit.icon} ${habit.title}`, { duration: 1800 });
      }
    },
  });

  const deleteHabit = useMutation({
    mutationFn: () => habitsApi.delete(habit.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["habits"] }),
  });

  return (
    <div style={{
      background: "white", borderRadius: "1rem", padding: "1.25rem",
      border: "1px solid var(--color-border)", display: "flex", flexDirection: "column", gap: "1rem",
    }} className="dark:bg-gray-900 dark:border-gray-800">

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <div style={{
          width: "2.5rem", height: "2.5rem", borderRadius: "0.75rem",
          background: `${habit.color}20`, display: "flex", alignItems: "center",
          justifyContent: "center", fontSize: "1.25rem", flexShrink: 0,
        }}>
          {habit.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontWeight: 700, fontSize: "0.9375rem", color: "#0f172a" }} className="dark:text-white truncate">
            {habit.title}
          </p>
          {streak > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
              <Flame size={11} color="#fb923c" />
              <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#fb923c" }}>{streak} day streak</span>
            </div>
          )}
        </div>

        {/* Today checkbox */}
        <button
          onClick={() => toggle.mutate()}
          disabled={toggle.isPending}
          style={{
            width: "2rem", height: "2rem", borderRadius: "50%", border: "2px solid",
            borderColor: isDoneToday ? habit.color : "#e2e8f0",
            background: isDoneToday ? habit.color : "transparent",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", flexShrink: 0, transition: "all 0.2s",
          }}
        >
          {isDoneToday && <Check size={12} color="white" strokeWidth={3} />}
        </button>

        <button
          onClick={() => { if (confirm("Delete this habit?")) deleteHabit.mutate(); }}
          style={{ background: "none", border: "none", cursor: "pointer", padding: "0.25rem", borderRadius: "0.375rem" }}
          className="text-gray-300 hover:text-red-400 dark:text-gray-700 dark:hover:text-red-400"
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* 21-day dot grid */}
      <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap" }}>
        {days.map((day) => {
          const done = logSet.has(day);
          const isToday = day === today;
          return (
            <div
              key={day}
              title={day}
              style={{
                width: "1.125rem", height: "1.125rem", borderRadius: "3px",
                background: done ? habit.color : isToday ? `${habit.color}30` : "var(--color-border)",
                border: isToday ? `1.5px solid ${habit.color}` : "none",
                transition: "background 0.15s",
                cursor: "default",
              }}
              className={!done && !isToday ? "dark:bg-gray-800" : ""}
            />
          );
        })}
      </div>

      {/* Progress this week */}
      {(() => {
        const weekDone = days.slice(-7).filter((d) => logSet.has(d)).length;
        return (
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <div className="bg-gray-100 dark:bg-gray-800" style={{ flex: 1, borderRadius: "999px", height: "4px", overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: "999px", background: habit.color, width: `${(weekDone / 7) * 100}%`, transition: "width 0.3s" }} />
            </div>
            <span style={{ fontSize: "0.6875rem", fontWeight: 600 }} className="text-gray-400">{weekDone}/7 this week</span>
          </div>
        );
      })()}
    </div>
  );
}

function NewHabitModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [color, setColor] = useState(COLORS[0]!);
  const [icon, setIcon] = useState(ICONS[0]!);

  const create = useMutation({
    mutationFn: () => habitsApi.create({ title: title.trim(), color, icon }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["habits"] }); onClose(); },
    onError: () => toast.error("Failed to create habit"),
  });

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(2px)" }} />
      <div style={{
        position: "relative", background: "white", borderRadius: "1.25rem",
        padding: "1.75rem", width: "100%", maxWidth: "400px", zIndex: 1,
        boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
      }} className="dark:bg-gray-900">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
          <h2 style={{ fontWeight: 800, fontSize: "1.125rem" }} className="text-gray-900 dark:text-white">New Habit</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }} className="text-gray-400"><X size={18} /></button>
        </div>

        {/* Icon picker */}
        <p style={{ fontSize: "0.75rem", fontWeight: 700, marginBottom: "0.5rem" }} className="text-gray-500 dark:text-gray-400">ICON</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem", marginBottom: "1rem" }}>
          {ICONS.map((ic) => (
            <button key={ic} onClick={() => setIcon(ic)} style={{
              width: "2.25rem", height: "2.25rem", borderRadius: "0.5rem", fontSize: "1.125rem",
              border: `2px solid ${icon === ic ? color : "transparent"}`,
              background: icon === ic ? `${color}20` : "#f8fafc",
              cursor: "pointer",
            }} className={icon !== ic ? "dark:bg-gray-800" : ""}>
              {ic}
            </button>
          ))}
        </div>

        {/* Color picker */}
        <p style={{ fontSize: "0.75rem", fontWeight: 700, marginBottom: "0.5rem" }} className="text-gray-500 dark:text-gray-400">COLOR</p>
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
          {COLORS.map((c) => (
            <button key={c} onClick={() => setColor(c)} style={{
              width: "1.75rem", height: "1.75rem", borderRadius: "50%", background: c,
              border: `3px solid ${color === c ? "#0f172a" : "transparent"}`, cursor: "pointer",
            }} />
          ))}
        </div>

        {/* Title */}
        <p style={{ fontSize: "0.75rem", fontWeight: 700, marginBottom: "0.5rem" }} className="text-gray-500 dark:text-gray-400">NAME</p>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && title.trim() && create.mutate()}
          placeholder="e.g. Read 30 minutes"
          autoFocus
          style={{
            width: "100%", padding: "0.75rem 1rem", border: "1.5px solid #e2e8f0",
            borderRadius: "0.625rem", fontSize: "0.9375rem", outline: "none",
            boxSizing: "border-box", marginBottom: "1.25rem",
          }}
          className="dark:bg-gray-800 dark:border-gray-700 dark:text-white"
          onFocus={(e) => { e.target.style.borderColor = color; }}
          onBlur={(e) => { e.target.style.borderColor = "#e2e8f0"; }}
        />

        <button
          onClick={() => create.mutate()}
          disabled={!title.trim() || create.isPending}
          style={{
            width: "100%", padding: "0.8125rem", background: title.trim() ? color : "#e2e8f0",
            color: "white", border: "none", borderRadius: "0.625rem",
            fontWeight: 700, fontSize: "0.9375rem", cursor: title.trim() ? "pointer" : "not-allowed",
          }}
        >
          Create Habit
        </button>
      </div>
    </div>
  );
}

export function HabitsPage() {
  const [showModal, setShowModal] = useState(false);
  const { data: habits = [], isLoading } = useQuery({ queryKey: ["habits"], queryFn: habitsApi.getAll });
  const today = format(new Date(), "EEEE, MMM d");

  const totalDoneToday = habits.filter((h) => h.logs.some((l) => l.date === format(new Date(), "yyyy-MM-dd"))).length;

  return (
    <div style={{ maxWidth: "56rem", margin: "0 auto" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "2rem" }}>
        <div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: "0.25rem" }} className="text-gray-900 dark:text-white">
            Habits
          </h1>
          <p style={{ fontSize: "0.9375rem" }} className="text-gray-500 dark:text-gray-400">
            {today} · {totalDoneToday}/{habits.length} done today
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{
            display: "flex", alignItems: "center", gap: "0.5rem",
            padding: "0.625rem 1.125rem", background: "#7c6ff7", color: "white",
            border: "none", borderRadius: "0.75rem", fontWeight: 600,
            fontSize: "0.875rem", cursor: "pointer",
          }}
        >
          <Plus size={16} /> New Habit
        </button>
      </div>

      {isLoading ? (
        <div style={{ textAlign: "center", padding: "4rem 0", color: "#94a3b8" }}>Loading…</div>
      ) : habits.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "4rem 2rem", border: "2px dashed #e2e8f0",
          borderRadius: "1.25rem",
        }} className="dark:border-gray-800">
          <p style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>🌱</p>
          <p style={{ fontWeight: 700, fontSize: "1rem", marginBottom: "0.375rem" }} className="text-gray-700 dark:text-gray-300">No habits yet</p>
          <p style={{ fontSize: "0.875rem", marginBottom: "1.5rem" }} className="text-gray-400">Start building your daily routines</p>
          <button
            onClick={() => setShowModal(true)}
            style={{
              padding: "0.625rem 1.5rem", background: "#7c6ff7", color: "white",
              border: "none", borderRadius: "0.75rem", fontWeight: 600, cursor: "pointer",
            }}
          >
            Create your first habit
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1rem" }}>
          {habits.map((h) => <HabitCard key={h.id} habit={h} />)}
        </div>
      )}

      {showModal && <NewHabitModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
