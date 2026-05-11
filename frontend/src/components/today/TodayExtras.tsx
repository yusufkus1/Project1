import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { Play, Plus, Zap } from "lucide-react";
import { format } from "date-fns";
import { tasksApi, Task } from "../../api/tasks";
import { useFocusStore } from "../../store/focus";
import { useGamificationStore } from "../../store/gamification";
import toast from "react-hot-toast";

// ─── Water tracker ────────────────────────────────────────────────────────────
const WATER_GOAL = 8;

function waterKey() {
  return `todoapp_water_${format(new Date(), "yyyy-MM-dd")}`;
}

function WaterTracker() {
  const [count, setCount] = useState(() => Number(localStorage.getItem(waterKey()) ?? 0));

  const set = (n: number) => {
    setCount(n);
    localStorage.setItem(waterKey(), String(n));
  };

  const handleClick = (i: number) => {
    // clicking the last filled cup removes it; otherwise fill up to i+1
    set(i + 1 === count ? i : i + 1);
  };

  return (
    <div className="bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800"
      style={{ borderRadius: "0.875rem", border: "1px solid", padding: "0.875rem 1.125rem", display: "flex", alignItems: "center", gap: "1rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", flexShrink: 0 }}>
        <span style={{ fontSize: "1.125rem" }}>💧</span>
        <span className="text-gray-700 dark:text-gray-200" style={{ fontSize: "0.8125rem", fontWeight: 700 }}>
          Water
        </span>
      </div>

      {/* Cup buttons */}
      <div style={{ display: "flex", gap: "0.3rem", flex: 1 }}>
        {Array.from({ length: WATER_GOAL }).map((_, i) => (
          <button
            key={i}
            onClick={() => handleClick(i)}
            title={`${i + 1} glass${i + 1 > 1 ? "es" : ""}`}
            style={{
              width: "1.625rem", height: "1.875rem", border: "none", cursor: "pointer",
              borderRadius: "0 0 0.375rem 0.375rem",
              background: i < count ? "#38bdf8" : undefined,
              transition: "all 0.15s",
              display: "flex", alignItems: "flex-end", justifyContent: "center",
              padding: 0,
              position: "relative",
            }}
            className={i < count ? "" : "bg-gray-100 dark:bg-gray-800"}
          >
            {/* cup shape via border-radius */}
            <span style={{
              display: "block", width: "100%", height: "100%",
              borderRadius: "0 0 5px 5px",
              background: i < count
                ? `linear-gradient(180deg, #7dd3fc 0%, #0ea5e9 100%)`
                : undefined,
            }}
              className={i < count ? "" : "bg-gray-200 dark:bg-gray-700"}
            />
          </button>
        ))}
      </div>

      <span style={{ fontSize: "0.8125rem", fontWeight: 700, flexShrink: 0 }}
        className={count >= WATER_GOAL ? "text-sky-500" : "text-gray-400 dark:text-gray-500"}>
        {count}/{WATER_GOAL}
        {count >= WATER_GOAL && " ✓"}
      </span>
    </div>
  );
}

// ─── Quotes ─────────────────────────────────────────────────────────────────
const QUOTES = [
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "Focus on being productive instead of busy.", author: "Tim Ferriss" },
  { text: "Either you run the day or the day runs you.", author: "Jim Rohn" },
  { text: "Do the hard jobs first. The easy jobs will take care of themselves.", author: "Dale Carnegie" },
  { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
  { text: "Success is the sum of small efforts repeated day in and day out.", author: "Robert Collier" },
  { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
  { text: "Energy and persistence conquer all things.", author: "Benjamin Franklin" },
  { text: "A year from now you may wish you had started today.", author: "Karen Lamb" },
  { text: "The best time to plant a tree was 20 years ago. The second best time is now.", author: "" },
  { text: "Motivation is what gets you started. Habit is what keeps you going.", author: "Jim Ryun" },
  { text: "Don't count the days, make the days count.", author: "Muhammad Ali" },
  { text: "We become what we repeatedly do.", author: "Sean Covey" },
  { text: "Your future is created by what you do today, not tomorrow.", author: "" },
  { text: "Small steps every day lead to big results.", author: "" },
  { text: "Simplicity is the ultimate sophistication.", author: "Leonardo da Vinci" },
  { text: "The way to get started is to quit talking and begin doing.", author: "Walt Disney" },
  { text: "Action is the foundational key to all success.", author: "Pablo Picasso" },
  { text: "You are never too old to set a new goal or to dream a new dream.", author: "C.S. Lewis" },
  { text: "Success usually comes to those who are too busy to be looking for it.", author: "Henry David Thoreau" },
  { text: "Everything you've ever wanted is on the other side of fear.", author: "George Addair" },
  { text: "Focus is not about saying yes. It's about saying no to almost everything.", author: "Steve Jobs" },
  { text: "Well begun is half done.", author: "Aristotle" },
  { text: "The harder you work, the luckier you get.", author: "Gary Player" },
  { text: "Productivity is never an accident. It is always the result of commitment.", author: "Paul J. Meyer" },
];

const PRIORITY_ORDER: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
const PRIORITY_COLOR: Record<string, string> = {
  CRITICAL: "#ef4444", HIGH: "#f97316", MEDIUM: "#eab308", LOW: "#94a3b8",
};
const PRIORITY_LABEL: Record<string, string> = {
  CRITICAL: "Critical", HIGH: "High", MEDIUM: "Medium", LOW: "Low",
};

function formatMinutes(mins: number): string {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// ─── Component ───────────────────────────────────────────────────────────────
export function TodayExtras({ todayTasks }: { todayTasks: Task[] }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const focusStore = useFocusStore();
  const { streak } = useGamificationStore();
  const [quickTitle, setQuickTitle] = useState("");

  // Summary stats
  const total = todayTasks.length;
  const completed = todayTasks.filter((t) => t.status === "COMPLETED").length;
  const estimatedMins = todayTasks
    .filter((t) => t.status !== "COMPLETED" && t.estimatedMinutes)
    .reduce((acc, t) => acc + (t.estimatedMinutes ?? 0), 0);
  const completionPct = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Quote — changes daily, consistent throughout the day
  const dayIndex = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  const quote = QUOTES[dayIndex % QUOTES.length]!;

  // Focus suggestion — highest-priority pending task today
  const focusTask = [...todayTasks]
    .filter((t) => t.status !== "COMPLETED")
    .sort((a, b) => PRIORITY_ORDER[a.priority]! - PRIORITY_ORDER[b.priority]!)[0];

  // Quick add
  const addTask = useMutation({
    mutationFn: (title: string) =>
      tasksApi.create({ title, dueDate: new Date().toISOString() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      setQuickTitle("");
    },
    onError: () => toast.error("Failed to add task"),
  });

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim() || addTask.isPending) return;
    addTask.mutate(quickTitle.trim());
  };

  const startFocus = (task: Task) => {
    focusStore.setTask(task.id, task.title);
    navigate("/focus");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1.75rem" }}>

      {/* ── Summary pills ── */}
      {total > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.625rem", alignItems: "center" }}>

          {/* Progress */}
          <div className="bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800"
            style={{ display: "flex", alignItems: "center", gap: "0.625rem", padding: "0.5rem 0.875rem", borderRadius: "999px", border: "1px solid" }}>
            <div style={{ width: "3rem", height: "4px", borderRadius: "2px", background: "#e2e8f0", overflow: "hidden" }}>
              <div style={{ height: "100%", background: "#10b981", width: `${completionPct}%`, borderRadius: "2px", transition: "width 0.4s" }} />
            </div>
            <span className="text-gray-700 dark:text-gray-300" style={{ fontSize: "0.8125rem", fontWeight: 600 }}>
              {completed}/{total} done
            </span>
          </div>

          {/* Estimated time */}
          {estimatedMins > 0 && (
            <div className="bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800"
              style={{ display: "flex", alignItems: "center", gap: "0.375rem", padding: "0.5rem 0.875rem", borderRadius: "999px", border: "1px solid" }}>
              <span style={{ fontSize: "0.875rem" }}>⏱️</span>
              <span className="text-gray-700 dark:text-gray-300" style={{ fontSize: "0.8125rem", fontWeight: 600 }}>
                {formatMinutes(estimatedMins)} remaining
              </span>
            </div>
          )}

          {/* Streak */}
          {streak > 0 && (
            <div className="bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800"
              style={{ display: "flex", alignItems: "center", gap: "0.375rem", padding: "0.5rem 0.875rem", borderRadius: "999px", border: "1px solid" }}>
              <span style={{ fontSize: "0.875rem" }}>🔥</span>
              <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#f97316" }}>{streak} day streak</span>
            </div>
          )}
        </div>
      )}

      {/* ── Water tracker ── */}
      <WaterTracker />

      {/* ── Daily quote ── */}
      <div className="bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800"
        style={{ borderRadius: "0.875rem", border: "1px solid", padding: "0.875rem 1.125rem", display: "flex", gap: "0.875rem", alignItems: "flex-start" }}>
        <span style={{ fontSize: "1.25rem", lineHeight: 1.4, flexShrink: 0 }}>💬</span>
        <div>
          <p className="text-gray-700 dark:text-gray-200" style={{ fontSize: "0.875rem", fontWeight: 500, lineHeight: 1.5, fontStyle: "italic" }}>
            "{quote.text}"
          </p>
          {quote.author && (
            <p className="text-gray-400 dark:text-gray-500" style={{ fontSize: "0.75rem", marginTop: "0.375rem" }}>
              — {quote.author}
            </p>
          )}
        </div>
      </div>

      {/* ── Focus suggestion ── */}
      {focusTask && (
        <div style={{
          borderRadius: "0.875rem", padding: "0.875rem 1.125rem",
          background: "rgba(99,102,241,0.06)", border: "1.5px solid rgba(99,102,241,0.2)",
          display: "flex", alignItems: "center", gap: "0.875rem",
        }}>
          <Zap size={18} style={{ color: "#6366f1", flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#6366f1", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "0.25rem" }}>
              Top priority
            </p>
            <p className="text-gray-800 dark:text-gray-100 truncate" style={{ fontSize: "0.9375rem", fontWeight: 600 }}>
              {focusTask.title}
            </p>
          </div>
          <span style={{
            fontSize: "0.6875rem", fontWeight: 700, padding: "0.25rem 0.625rem",
            borderRadius: "999px", color: "white", flexShrink: 0,
            background: PRIORITY_COLOR[focusTask.priority] ?? "#94a3b8",
          }}>
            {PRIORITY_LABEL[focusTask.priority]}
          </span>
          <button
            onClick={() => startFocus(focusTask)}
            style={{
              display: "flex", alignItems: "center", gap: "0.375rem",
              padding: "0.5rem 0.875rem", background: "#6366f1", color: "white",
              border: "none", borderRadius: "0.5rem", fontWeight: 600,
              fontSize: "0.8125rem", cursor: "pointer", flexShrink: 0,
              whiteSpace: "nowrap",
            }}
          >
            <Play size={13} fill="white" />
            Start Focus
          </button>
        </div>
      )}

      {/* ── Quick add ── */}
      <form onSubmit={handleQuickAdd} style={{ display: "flex", gap: "0.5rem" }}>
        <input
          value={quickTitle}
          onChange={(e) => setQuickTitle(e.target.value)}
          placeholder="Add a task for today…"
          className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100 placeholder-gray-300 dark:placeholder-gray-600"
          style={{
            flex: 1, padding: "0.625rem 1rem", borderRadius: "0.625rem",
            border: "1.5px solid", fontSize: "0.9375rem", outline: "none",
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = "#6366f1"; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = ""; }}
        />
        <button
          type="submit"
          disabled={!quickTitle.trim() || addTask.isPending}
          style={{
            padding: "0.625rem 1rem", borderRadius: "0.625rem",
            background: quickTitle.trim() ? "#6366f1" : "#e2e8f0",
            color: quickTitle.trim() ? "white" : "#9ca3af",
            border: "none", cursor: quickTitle.trim() ? "pointer" : "default",
            display: "flex", alignItems: "center", gap: "0.25rem",
            fontWeight: 600, fontSize: "0.875rem", transition: "all 0.15s",
          }}
        >
          <Plus size={16} />
        </button>
      </form>
    </div>
  );
}
