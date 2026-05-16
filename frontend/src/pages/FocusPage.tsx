import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useIsMobile } from "../hooks/useIsMobile";
import {
  Play, Pause, RotateCcw, SkipForward, Settings, X,
  Flame, Clock, Trophy, CheckCircle, Coffee, Brain, ChevronDown, Users,
} from "lucide-react";
import { format, isToday } from "date-fns";
import { useFocusStore, FocusMode, FocusSession } from "../store/focus";
import { useGamificationStore } from "../store/gamification";
import { tasksApi, Task } from "../api/tasks";
import { focusApi } from "../api/focus";
import { ParkIt } from "../components/ParkIt";
import toast from "react-hot-toast";

// ─── Audio ──────────────────────────────────────────────────────────────────
function playChime() {
  try {
    const ctx = new AudioContext();
    const notes = [880, 1100, 1320];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.18);
      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.18);
      gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + i * 0.18 + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.18 + 0.45);
      osc.start(ctx.currentTime + i * 0.18);
      osc.stop(ctx.currentTime + i * 0.18 + 0.5);
    });
  } catch {
    // AudioContext blocked or unavailable
  }
}

// ─── Circular Timer Ring ────────────────────────────────────────────────────
const RADIUS = 108;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const SIZE = 280;
const CENTER = SIZE / 2;

const MODE_META: Record<FocusMode, { label: string; color: string; dimColor: string; icon: React.ReactNode }> = {
  work:        { label: "Focus",       color: "#7c6ff7", dimColor: "rgba(124,111,247,0.15)",  icon: <Brain size={14} /> },
  short_break: { label: "Short Break", color: "#22c55e", dimColor: "rgba(34,197,94,0.15)",   icon: <Coffee size={14} /> },
  long_break:  { label: "Long Break",  color: "#3b82f6", dimColor: "rgba(59,130,246,0.15)",  icon: <Coffee size={14} /> },
};

function pad(n: number) { return String(n).padStart(2, "0"); }

function TimerRing({
  seconds, totalSeconds, mode, status,
}: {
  seconds: number; totalSeconds: number; mode: FocusMode; status: string;
}) {
  const meta = MODE_META[mode];
  const progress = totalSeconds > 0 ? seconds / totalSeconds : 1;
  const offset = CIRCUMFERENCE * (1 - progress);
  const mm = Math.floor(seconds / 60);
  const ss = seconds % 60;

  return (
    <div style={{ position: "relative", width: SIZE, height: SIZE }}>
      <svg width={SIZE} height={SIZE} style={{ transform: "rotate(-90deg)" }}>
        {/* Track */}
        <circle cx={CENTER} cy={CENTER} r={RADIUS} fill="none"
          stroke="rgba(0,0,0,0.06)" strokeWidth={10} />
        {/* Progress */}
        <circle cx={CENTER} cy={CENTER} r={RADIUS} fill="none"
          stroke={meta.color} strokeWidth={10} strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          style={{ transition: status === "running" ? "stroke-dashoffset 1s linear" : "none" }}
        />
      </svg>

      {/* Center content — overlaid */}
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: "0.375rem",
      }}>
        <div className="text-gray-900 dark:text-white"
          style={{ fontSize: "3.5rem", fontWeight: 900, letterSpacing: "-0.04em", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
          {pad(mm)}:{pad(ss)}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", color: meta.color, fontSize: "0.8125rem", fontWeight: 600 }}>
          {meta.icon}
          {meta.label}
        </div>
      </div>
    </div>
  );
}

// ─── Session Card ───────────────────────────────────────────────────────────
function SessionCard({ session }: { session: FocusSession }) {
  const meta = MODE_META[session.type];
  const isWork = session.type === "work";
  return (
    <div className="bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800"
      style={{ borderRadius: "0.75rem", border: "1px solid", padding: "0.875rem 1rem", display: "flex", alignItems: "center", gap: "0.875rem" }}>
      <div style={{
        width: "2.25rem", height: "2.25rem", borderRadius: "0.5rem",
        background: meta.dimColor, display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0, color: meta.color,
      }}>
        {meta.icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p className="text-gray-700 dark:text-gray-200"
          style={{ fontSize: "0.875rem", fontWeight: 600 }}>
          {session.taskTitle ?? (isWork ? "Focus session" : "Break")}
        </p>
        <p className="text-gray-400 dark:text-gray-500" style={{ fontSize: "0.75rem", marginTop: "0.125rem" }}>
          {session.duration} min · {format(new Date(session.completedAt), "HH:mm")}
          {session.interrupted && " · interrupted"}
        </p>
      </div>
      {isWork && !session.interrupted && (
        <span style={{ fontSize: "1.125rem" }}>🍅</span>
      )}
    </div>
  );
}

// ─── Settings Panel ─────────────────────────────────────────────────────────
function SettingsPanel({ onClose }: { onClose: () => void }) {
  const { settings, updateSettings } = useFocusStore();

  const row = (label: string, key: keyof typeof settings, min: number, max: number, unit: string) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.75rem 0", borderBottom: "1px solid", borderColor: "rgba(0,0,0,0.06)" }}>
      <span className="text-gray-700 dark:text-gray-300" style={{ fontSize: "0.875rem" }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
        <button
          onClick={() => updateSettings({ [key]: Math.max(min, Number(settings[key]) - 1) })}
          className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition"
          style={{ width: "1.75rem", height: "1.75rem", borderRadius: "0.375rem", border: "1px solid rgba(0,0,0,0.1)", background: "none", cursor: "pointer", fontSize: "1rem" }}
        >−</button>
        <span className="text-gray-900 dark:text-white" style={{ minWidth: "2.5rem", textAlign: "center", fontWeight: 600, fontSize: "0.9375rem" }}>
          {settings[key]} {unit}
        </span>
        <button
          onClick={() => updateSettings({ [key]: Math.min(max, Number(settings[key]) + 1) })}
          className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition"
          style={{ width: "1.75rem", height: "1.75rem", borderRadius: "0.375rem", border: "1px solid rgba(0,0,0,0.1)", background: "none", cursor: "pointer", fontSize: "1rem" }}
        >+</button>
      </div>
    </div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={onClose}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.3)" }} />
      <div className="bg-white dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
        style={{ position: "relative", borderRadius: "1.25rem", padding: "1.75rem 2rem", width: "22rem", boxShadow: "0 24px 48px rgba(0,0,0,0.2)", zIndex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
          <h3 className="text-gray-900 dark:text-white" style={{ fontWeight: 700, fontSize: "1.0625rem" }}>Timer Settings</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition"
            style={{ background: "none", border: "none", cursor: "pointer", padding: "0.25rem" }}>
            <X size={18} />
          </button>
        </div>
        {row("Focus duration", "workDuration", 5, 90, "min")}
        {row("Short break", "shortBreakDuration", 1, 30, "min")}
        {row("Long break", "longBreakDuration", 5, 60, "min")}
        {row("Sessions until long break", "sessionsBeforeLongBreak", 2, 8, "")}
        {row("XP per session", "xpPerSession", 5, 50, "xp")}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "0.75rem" }}>
          <span className="text-gray-700 dark:text-gray-300" style={{ fontSize: "0.875rem" }}>Sound</span>
          <button
            onClick={() => updateSettings({ soundEnabled: !settings.soundEnabled })}
            style={{
              width: "3rem", height: "1.625rem", borderRadius: "999px", border: "none", cursor: "pointer",
              background: settings.soundEnabled ? "#7c6ff7" : "#e5e7eb", transition: "background 0.2s", position: "relative",
            }}
          >
            <span style={{
              position: "absolute", top: "0.1875rem",
              left: settings.soundEnabled ? "1.3125rem" : "0.1875rem",
              width: "1.25rem", height: "1.25rem", borderRadius: "50%",
              background: "white", boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
              transition: "left 0.2s",
            }} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Focus Page ─────────────────────────────────────────────────────────────
export function FocusPage() {
  const store = useFocusStore();
  const { addXP, completeFocusSession, getLevel } = useGamificationStore();
  const [showSettings, setShowSettings] = useState(false);
  const [showTaskPicker, setShowTaskPicker] = useState(false);
  const [, forceRender] = useState(0);
  const [focuserCount, setFocuserCount] = useState(0);
  const finishedRef = useRef(false);
  const isMobile = useIsMobile();

  const { data } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => tasksApi.getAll({ isArchived: false, limit: 200 }),
  });
  const tasks: Task[] = (data?.tasks ?? []).filter((t: Task) => t.status !== "COMPLETED");

  // Compute total seconds for current mode
  const { settings, mode, status } = store;
  const totalSeconds =
    mode === "work" ? settings.workDuration * 60
    : mode === "short_break" ? settings.shortBreakDuration * 60
    : settings.longBreakDuration * 60;

  const displaySeconds = store.getDisplaySeconds();

  // Tick & finish detection
  useEffect(() => {
    if (status !== "running") { finishedRef.current = false; return; }

    const interval = setInterval(() => {
      forceRender((n) => n + 1); // re-render so getDisplaySeconds() uses fresh Date.now()

      const secs = store.getDisplaySeconds();
      if (secs <= 0 && !finishedRef.current) {
        finishedRef.current = true;
        const result = store.finishSession(false);

        if (result) {
          if (settings.soundEnabled) playChime();

          if (result.type === "work") {
            const { xpGained, leveledUp } = addXP(settings.xpPerSession);
            const { newAchievements } = completeFocusSession();
            toast.success(`+${xpGained} XP — session complete!`, { icon: "🍅", duration: 4000 });
            if (leveledUp) toast(`Level ${getLevel()}!`, { icon: "⬆️", duration: 4000 });
            newAchievements.forEach((a) => toast(`${a.icon} ${a.title} unlocked!`, { duration: 3500 }));
          } else {
            toast("Break over — ready to focus!", { icon: "💪", duration: 3000 });
          }
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [status, settings.soundEnabled, settings.xpPerSession]);

  // Body doubling: checkin/out + poll count
  useEffect(() => {
    if (status === "running") {
      focusApi.checkin().catch(() => {});
    } else {
      focusApi.checkout().catch(() => {});
    }
  }, [status]);

  useEffect(() => {
    const poll = async () => {
      try { const { count } = await focusApi.count(); setFocuserCount(count); } catch { /* ignore */ }
    };
    poll();
    const id = setInterval(poll, 30_000);
    return () => clearInterval(id);
  }, []);

  // Today's sessions
  const todaySessions = store.sessions.filter((s) => isToday(new Date(s.completedAt)));
  const todayWorkSessions = todaySessions.filter((s) => s.type === "work" && !s.interrupted);
  const todayFocusMinutes = todayWorkSessions.reduce((acc, s) => acc + s.duration, 0);

  const MODES: { id: FocusMode; label: string }[] = [
    { id: "work", label: "Focus" },
    { id: "short_break", label: "Short Break" },
    { id: "long_break", label: "Long Break" },
  ];

  const meta = MODE_META[mode];

  return (
    <div style={{ maxWidth: "40rem", display: "flex", flexDirection: "column", gap: isMobile ? "1.5rem" : "2.5rem" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 className="text-gray-900 dark:text-white" style={{ fontSize: isMobile ? "1.5rem" : "1.875rem", fontWeight: 800 }}>Focus Timer</h1>
          <p className="text-gray-400 dark:text-gray-500" style={{ fontSize: "0.875rem", marginTop: "0.25rem" }}>
            Deep work with the Pomodoro technique
          </p>
        </div>
        <button
          onClick={() => setShowSettings(true)}
          className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          style={{ padding: "0.625rem", borderRadius: "0.625rem", background: "none", border: "none", cursor: "pointer" }}
        >
          <Settings size={20} />
        </button>
      </div>

      {/* Timer card */}
      <div className="bg-white dark:bg-gray-900"
        style={{ borderRadius: "1.5rem", border: "1px solid", borderColor: "rgba(229,231,235,0.8)", padding: isMobile ? "1.5rem 1rem" : "2.5rem 2rem", display: "flex", flexDirection: "column", alignItems: "center", gap: isMobile ? "1.25rem" : "2rem" }}>

        {/* Mode tabs */}
        <div className="bg-gray-100 dark:bg-gray-800"
          style={{ display: "flex", borderRadius: "0.75rem", padding: "0.25rem", gap: "0.25rem" }}>
          {MODES.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => store.setMode(id)}
              style={{
                padding: "0.5rem 1rem", borderRadius: "0.5rem", border: "none", cursor: "pointer",
                fontSize: "0.8125rem", fontWeight: 600, transition: "all 0.15s",
                background: mode === id ? MODE_META[id].color : "transparent",
                color: mode === id ? "white" : undefined,
              }}
              className={mode !== id ? "text-gray-500 dark:text-gray-400" : ""}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Ring */}
        <TimerRing seconds={displaySeconds} totalSeconds={totalSeconds} mode={mode} status={status} />

        {/* Session dots */}
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {Array.from({ length: settings.sessionsBeforeLongBreak }).map((_, i) => (
            <div key={i} style={{
              width: "0.625rem", height: "0.625rem", borderRadius: "50%",
              background: i < (store.completedWorkSessions % settings.sessionsBeforeLongBreak)
                ? meta.color : "rgba(0,0,0,0.1)",
              transition: "background 0.3s",
            }} />
          ))}
        </div>

        {/* Task picker */}
        <div style={{ width: "100%", position: "relative" }}>
          <button
            onClick={() => setShowTaskPicker(!showTaskPicker)}
            className="bg-gray-50 dark:bg-gray-800 border-gray-100 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-indigo-300 dark:hover:border-indigo-700 transition"
            style={{
              width: "100%", padding: "0.75rem 1rem", borderRadius: "0.75rem", border: "1px solid",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              cursor: "pointer", fontSize: "0.875rem",
            }}
          >
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, textAlign: "left" }}>
              {store.currentTaskTitle ?? "Working on… (optional)"}
            </span>
            <ChevronDown size={15} style={{ flexShrink: 0, marginLeft: "0.5rem" }} />
          </button>

          {showTaskPicker && (
            <div className="bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800"
              style={{
                position: "absolute", top: "calc(100% + 0.5rem)", left: 0, right: 0,
                borderRadius: "0.875rem", border: "1px solid", boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                zIndex: 20, maxHeight: "14rem", overflowY: "auto",
              }}>
              <button
                onClick={() => { store.setTask(null, null); setShowTaskPicker(false); }}
                className="text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                style={{ width: "100%", padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.875rem", background: "none", border: "none", cursor: "pointer", borderBottom: "1px solid rgba(0,0,0,0.04)" }}
              >
                No specific task
              </button>
              {tasks.map((t) => (
                <button
                  key={t.id}
                  onClick={() => { store.setTask(t.id, t.title); setShowTaskPicker(false); }}
                  className="text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                  style={{
                    width: "100%", padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.875rem",
                    background: store.currentTaskId === t.id ? "rgba(124,111,247,0.06)" : "none",
                    border: "none", cursor: "pointer", borderBottom: "1px solid rgba(0,0,0,0.04)",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}
                >
                  {t.title}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <button
            onClick={store.reset}
            className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            style={{ padding: "0.75rem", borderRadius: "50%", background: "none", border: "none", cursor: "pointer" }}
            title="Reset"
          >
            <RotateCcw size={20} />
          </button>

          {/* Start / Pause */}
          <button
            onClick={status === "running" ? store.pause : store.start}
            style={{
              width: "4.5rem", height: "4.5rem", borderRadius: "50%", border: "none",
              background: meta.color, color: "white", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: `0 8px 24px ${meta.color}55`,
              transition: "transform 0.15s, box-shadow 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.06)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            {status === "running" ? <Pause size={24} fill="white" /> : <Play size={24} fill="white" style={{ marginLeft: "3px" }} />}
          </button>

          <button
            onClick={() => {
              const result = store.skip();
              if (result?.recorded && result.type === "work") {
                const { xpGained, leveledUp } = addXP(settings.xpPerSession);
                const { newAchievements } = completeFocusSession();
                toast.success(`+${xpGained} XP — session complete!`, { icon: "🍅", duration: 3000 });
                if (leveledUp) toast(`Level ${getLevel()}!`, { icon: "⬆️", duration: 4000 });
                newAchievements.forEach((a) => toast(`${a.icon} ${a.title} unlocked!`, { duration: 3500 }));
              }
            }}
            className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            style={{ padding: "0.75rem", borderRadius: "50%", background: "none", border: "none", cursor: "pointer" }}
            title="Skip"
          >
            <SkipForward size={20} />
          </button>
        </div>
      </div>

      {/* Body doubling counter */}
      {focuserCount > 1 && (
        <div style={{
          display: "flex", alignItems: "center", gap: "0.75rem",
          padding: "0.875rem 1.25rem", borderRadius: "0.875rem",
          background: "rgba(167,139,250,0.08)", border: "1.5px solid rgba(167,139,250,0.2)",
        }}>
          <Users size={16} style={{ color: "#a78bfa", flexShrink: 0 }} />
          <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#a78bfa" }}>
            {focuserCount} people are focusing with you right now
          </span>
        </div>
      )}

      {/* Live in-progress banner */}
      {status === "running" && (
        <div style={{
          display: "flex", alignItems: "center", gap: "0.75rem",
          padding: "0.875rem 1.25rem", borderRadius: "0.875rem",
          background: `${meta.color}12`, border: `1.5px solid ${meta.color}30`,
        }}>
          <span style={{
            width: "0.5rem", height: "0.5rem", borderRadius: "50%",
            background: meta.color, flexShrink: 0,
            boxShadow: `0 0 0 3px ${meta.color}30`,
            animation: "pulse 2s infinite",
          }} />
          <span style={{ fontSize: "0.875rem", fontWeight: 600, color: meta.color }}>
            Session in progress
          </span>
          {store.currentTaskTitle && (
            <span className="text-gray-500 dark:text-gray-400" style={{ fontSize: "0.875rem" }}>
              · {store.currentTaskTitle}
            </span>
          )}
          <span className="text-gray-400 dark:text-gray-500" style={{ fontSize: "0.8125rem", marginLeft: "auto" }}>
            Stats update when session ends
          </span>
        </div>
      )}

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(3, 1fr)", gap: "0.75rem" }}>
        {[
          {
            value: todayFocusMinutes >= 60
              ? `${Math.floor(todayFocusMinutes / 60)}h ${todayFocusMinutes % 60}m`
              : `${todayFocusMinutes}m`,
            label: "Focus today",
            icon: <Clock size={18} />,
            color: "#7c6ff7",
            bg: "rgba(124,111,247,0.1)",
          },
          {
            value: `${todayWorkSessions.length} 🍅`,
            label: "Sessions today",
            icon: <Flame size={18} />,
            color: "#fb923c",
            bg: "rgba(251,146,60,0.1)",
          },
          {
            value: store.totalFocusMinutes >= 60
              ? `${Math.floor(store.totalFocusMinutes / 60)}h`
              : `${store.totalFocusMinutes}m`,
            label: "All-time focus",
            icon: <Trophy size={18} />,
            color: "#eab308",
            bg: "rgba(234,179,8,0.1)",
          },
        ].map(({ value, label, icon, color, bg }) => (
          <div key={label} className="bg-white dark:bg-gray-900"
            style={{ borderRadius: "1rem", border: "1px solid rgba(229,231,235,0.8)", padding: isMobile ? "0.875rem" : "1.25rem", display: "flex", flexDirection: "column", gap: "0.625rem" }}>
            <div style={{ width: "2.25rem", height: "2.25rem", background: bg, borderRadius: "0.625rem", display: "flex", alignItems: "center", justifyContent: "center", color }}>
              {icon}
            </div>
            <div>
              <p className="text-gray-900 dark:text-white" style={{ fontSize: "1.5rem", fontWeight: 700 }}>{value}</p>
              <p className="text-gray-500 dark:text-gray-400" style={{ fontSize: "0.8125rem", marginTop: "0.125rem" }}>{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Session history */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
          <h2 className="text-gray-900 dark:text-white" style={{ fontSize: "1rem", fontWeight: 700 }}>
            Today's Sessions
          </h2>
          {store.sessions.length > 0 && (
            <button
              onClick={() => { if (confirm("Clear all session history?")) store.clearHistory(); }}
              className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition"
              style={{ fontSize: "0.75rem", background: "none", border: "none", cursor: "pointer" }}
            >
              Clear history
            </button>
          )}
        </div>

        {todaySessions.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800"
            style={{ borderRadius: "1rem", border: "1px solid", padding: "3rem 1rem", textAlign: "center" }}>
            <p style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>🍅</p>
            <p className="text-gray-400 dark:text-gray-500" style={{ fontSize: "0.9375rem" }}>No sessions yet today</p>
            <p className="text-gray-300 dark:text-gray-700" style={{ fontSize: "0.8125rem", marginTop: "0.375rem" }}>Start the timer to begin focusing</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
            {todaySessions.map((s) => <SessionCard key={s.id} session={s} />)}
          </div>
        )}

        {/* Past sessions (not today) */}
        {store.sessions.filter((s) => !isToday(new Date(s.completedAt))).length > 0 && (
          <details style={{ marginTop: "1.5rem" }}>
            <summary className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition"
              style={{ fontSize: "0.8125rem", fontWeight: 600, cursor: "pointer", listStyle: "none", display: "flex", alignItems: "center", gap: "0.375rem", marginBottom: "0.75rem" }}>
              <CheckCircle size={14} />
              Previous sessions ({store.sessions.filter((s) => !isToday(new Date(s.completedAt))).length})
            </summary>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {store.sessions
                .filter((s) => !isToday(new Date(s.completedAt)))
                .slice(0, 20)
                .map((s) => <SessionCard key={s.id} session={s} />)}
            </div>
          </details>
        )}
      </div>

      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}

      {/* Close task picker on outside click */}
      {showTaskPicker && (
        <div style={{ position: "fixed", inset: 0, zIndex: 10 }} onClick={() => setShowTaskPicker(false)} />
      )}

      {/* Park It — floating thought capture (only during active focus) */}
      {status === "running" && <ParkIt />}
    </div>
  );
}
