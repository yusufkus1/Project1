import { useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "../hooks/useIsMobile";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { isToday, isFuture, isPast, format } from "date-fns";
import { Loader2, Archive, List, LayoutGrid, Calendar, Sparkles, Zap, X, AlertTriangle } from "lucide-react";
import { tasksApi, Task } from "../api/tasks";
import { skillsApi, Skill, parseDays } from "../api/skills";
import { useUIStore, View } from "../store/ui";
import { TaskRow } from "../components/tasks/TaskRow";
import { InlineAdd } from "../components/tasks/InlineAdd";
import { WeatherWidget } from "../components/WeatherWidget";
import { TodayExtras } from "../components/today/TodayExtras";
import { PanicMode } from "../components/PanicMode";
import confetti from "canvas-confetti";

const VIEW_TITLES: Record<string, string> = {
  inbox: "Tasks", today: "Today", upcoming: "Next 7 Days",
  completed: "Completed", pending: "Pending", in_progress: "In Progress", overdue: "Overdue",
};

const PRIORITY_PILL: Record<string, { bg: string; color: string; dot: string }> = {
  LOW:      { bg: "rgba(124,111,247,0.1)",  color: "#7c6ff7", dot: "#a89df9" },
  MEDIUM:   { bg: "rgba(16,185,129,0.1)",  color: "#059669", dot: "#34d399" },
  HIGH:     { bg: "rgba(251,146,60,0.1)",  color: "#ea580c", dot: "#fb923c" },
  CRITICAL: { bg: "rgba(239,68,68,0.1)",   color: "#dc2626", dot: "#f87171" },
};

function filterTasks(tasks: Task[], view: View): Task[] {
  if (view === "completed") return tasks.filter((t) => t.status === "COMPLETED");
  if (view === "today") return tasks.filter((t) => t.dueDate && isToday(new Date(t.dueDate)));
  if (view === "upcoming") return tasks.filter((t) => t.dueDate && isFuture(new Date(t.dueDate)) && !isToday(new Date(t.dueDate)));
  if (view === "pending") return tasks.filter((t) => t.status === "PENDING");
  if (view === "in_progress") return tasks.filter((t) => t.status === "IN_PROGRESS");
  if (view === "overdue") return tasks.filter((t) => t.dueDate && isPast(new Date(t.dueDate)) && !isToday(new Date(t.dueDate)) && t.status !== "COMPLETED");
  if (view.startsWith("project:")) {
    const pid = view.slice(8);
    return tasks.filter((t) => t.projectId === pid && t.status !== "COMPLETED");
  }
  if (view.startsWith("tag:")) {
    const tid = view.slice(4);
    return tasks.filter((t) => t.tags.some((tt) => tt.tag.id === tid) && t.status !== "COMPLETED");
  }
  return tasks.filter((t) => t.status !== "COMPLETED");
}

function groupByDate(tasks: Task[]): { label: string; color: string; tasks: Task[] }[] {
  const overdue  = tasks.filter((t) => t.dueDate && isPast(new Date(t.dueDate)) && !isToday(new Date(t.dueDate)) && t.status !== "COMPLETED");
  const today    = tasks.filter((t) => t.dueDate && isToday(new Date(t.dueDate)));
  const noDate   = tasks.filter((t) => !t.dueDate && t.status !== "COMPLETED");
  const upcoming = tasks.filter((t) => t.dueDate && isFuture(new Date(t.dueDate)) && !isToday(new Date(t.dueDate)));
  const groups = [];
  if (overdue.length)  groups.push({ label: "Overdue",  color: "text-red-500", tasks: overdue });
  if (today.length)    groups.push({ label: "Today",    color: "text-green-600 dark:text-green-400", tasks: today });
  if (noDate.length)   groups.push({ label: "No Date",  color: "text-gray-400", tasks: noDate });
  if (upcoming.length) groups.push({ label: "Upcoming", color: "text-blue-500", tasks: upcoming });
  return groups;
}

// ─── Next Task Suggestion ─────────────────────────────────────────────────────
const PRIORITY_RANK: Record<string, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };

function pickNextTask(tasks: Task[]): Task | null {
  const candidates = tasks.filter((t) => t.status !== "COMPLETED");
  if (!candidates.length) return null;
  return candidates.sort((a, b) => {
    const aOverdue = a.dueDate && isPast(new Date(a.dueDate)) && !isToday(new Date(a.dueDate));
    const bOverdue = b.dueDate && isPast(new Date(b.dueDate)) && !isToday(new Date(b.dueDate));
    if (aOverdue && !bOverdue) return -1;
    if (!aOverdue && bOverdue) return 1;
    const aToday = a.dueDate && isToday(new Date(a.dueDate));
    const bToday = b.dueDate && isToday(new Date(b.dueDate));
    if (aToday && !bToday) return -1;
    if (!aToday && bToday) return 1;
    const priDiff = (PRIORITY_RANK[b.priority] ?? 0) - (PRIORITY_RANK[a.priority] ?? 0);
    if (priDiff !== 0) return priDiff;
    if (a.estimatedMinutes && b.estimatedMinutes) return a.estimatedMinutes - b.estimatedMinutes;
    return 0;
  })[0] ?? null;
}

function NextTaskCard({ tasks }: { tasks: Task[] }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [dismissed, setDismissed] = useState(false);
  const next = useMemo(() => pickNextTask(tasks), [tasks]);

  const complete = useMutation({
    mutationFn: () => tasksApi.update(next!.id, { status: "COMPLETED" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.5 }, colors: ["#7c6ff7", "#22c55e", "#f59e0b"] });
      setDismissed(false);
    },
  });

  if (!next || dismissed) return null;

  const isOverdue = next.dueDate && isPast(new Date(next.dueDate)) && !isToday(new Date(next.dueDate));
  const isQuick = next.estimatedMinutes != null && next.estimatedMinutes <= 2;

  return (
    <div style={{
      background: "linear-gradient(135deg, #7c6ff7, #a78bfa)",
      borderRadius: "1.25rem", padding: "1.5rem 1.75rem",
      marginBottom: "1.75rem", color: "white",
      boxShadow: "0 8px 24px rgba(124,111,247,0.3)",
      position: "relative",
    }}>
      <button onClick={() => setDismissed(true)} style={{ position: "absolute", top: "1rem", right: "1rem", background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "50%", width: "1.5rem", height: "1.5rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>
        <X size={12} />
      </button>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem", opacity: 0.85 }}>
        <Sparkles size={14} />
        <span style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>Focus on this next</span>
      </div>
      <p style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "1rem", lineHeight: 1.35 }}>{next.title}</p>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
        {isOverdue && <span style={{ background: "rgba(239,68,68,0.3)", borderRadius: "999px", padding: "0.25rem 0.75rem", fontSize: "0.75rem", fontWeight: 700 }}>Overdue</span>}
        {isQuick && <span style={{ background: "rgba(34,197,94,0.25)", borderRadius: "999px", padding: "0.25rem 0.75rem", fontSize: "0.75rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.25rem" }}><Zap size={10} fill="white" /> 2 min</span>}
        {next.estimatedMinutes && !isQuick && <span style={{ opacity: 0.8, fontSize: "0.75rem" }}>~{next.estimatedMinutes}min</span>}
        <div style={{ flex: 1 }} />
        <button
          onClick={() => complete.mutate()}
          style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: "0.625rem", padding: "0.5rem 1rem", color: "white", fontWeight: 600, fontSize: "0.8125rem", cursor: "pointer", transition: "background 0.15s" }}
          className="hover:bg-white/30"
        >Done ✓</button>
        <button
          onClick={() => navigate(`/tasks/${next.id}`)}
          style={{ background: "white", border: "none", borderRadius: "0.625rem", padding: "0.5rem 1rem", color: "#7c6ff7", fontWeight: 700, fontSize: "0.8125rem", cursor: "pointer" }}
        >Open →</button>
      </div>
    </div>
  );
}

// ─── Brain Dump ───────────────────────────────────────────────────────────────
function BrainDump({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [lines, setLines] = useState<string[]>([""]);
  const [saving, setSaving] = useState(false);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const saveAll = async () => {
    const titles = lines.map((l) => l.trim()).filter(Boolean);
    if (!titles.length) { onClose(); return; }
    setSaving(true);
    await Promise.all(titles.map((title) => tasksApi.create({ title })));
    qc.invalidateQueries({ queryKey: ["tasks"] });
    confetti({ particleCount: 60, spread: 65, origin: { y: 0.5 }, colors: ["#7c6ff7", "#22c55e"] });
    setSaving(false);
    onClose();
  };

  const handleKey = (e: React.KeyboardEvent, idx: number) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const next = [...lines];
      next.splice(idx + 1, 0, "");
      setLines(next);
      setTimeout(() => refs.current[idx + 1]?.focus(), 0);
    }
    if (e.key === "Backspace" && lines[idx] === "" && lines.length > 1) {
      e.preventDefault();
      const next = lines.filter((_, i) => i !== idx);
      setLines(next);
      setTimeout(() => refs.current[Math.max(0, idx - 1)]?.focus(), 0);
    }
    if (e.key === "Escape") onClose();
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(6px)" }} onClick={onClose} />
      <div className="bg-white dark:bg-gray-900" style={{ position: "relative", zIndex: 1, width: "min(640px, 92vw)", borderRadius: "1.5rem", boxShadow: "0 32px 80px rgba(0,0,0,0.25)", overflow: "hidden" }}>
        <div className="border-b border-gray-100 dark:border-gray-800" style={{ padding: "1.25rem 1.75rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={{ width: "2rem", height: "2rem", borderRadius: "0.5rem", background: "rgba(124,111,247,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Zap size={15} style={{ color: "#7c6ff7" }} />
          </div>
          <div style={{ flex: 1 }}>
            <p className="text-gray-900 dark:text-white" style={{ fontWeight: 800, fontSize: "1rem" }}>Brain Dump</p>
            <p className="text-gray-400 dark:text-gray-500" style={{ fontSize: "0.75rem" }}>Type everything on your mind — one task per line, Enter to add more</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: "0.25rem", borderRadius: "0.5rem" }} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
        </div>
        <div style={{ padding: "1.5rem 1.75rem", maxHeight: "60vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {lines.map((line, idx) => (
            <div key={idx} style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <span className="text-gray-200 dark:text-gray-700" style={{ fontSize: "0.8125rem", fontWeight: 700, width: "1.25rem", textAlign: "right", flexShrink: 0 }}>{idx + 1}</span>
              <input
                ref={(el) => { refs.current[idx] = el; }}
                value={line}
                onChange={(e) => { const next = [...lines]; next[idx] = e.target.value; setLines(next); }}
                onKeyDown={(e) => handleKey(e, idx)}
                placeholder={idx === 0 ? "What's on your mind?" : "Another task…"}
                autoFocus={idx === 0}
                className="text-gray-800 dark:text-gray-100 placeholder-gray-300 dark:placeholder-gray-600 bg-transparent focus:outline-none"
                style={{ flex: 1, fontSize: "1rem", border: "none", padding: "0.375rem 0" }}
              />
            </div>
          ))}
        </div>
        <div className="border-t border-gray-100 dark:border-gray-800" style={{ padding: "1rem 1.75rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span className="text-gray-400" style={{ fontSize: "0.75rem", flex: 1 }}>{lines.filter(l => l.trim()).length} tasks ready to save</span>
          <button onClick={onClose} style={{ padding: "0.625rem 1.25rem", borderRadius: "0.75rem", border: "1px solid", fontSize: "0.875rem", fontWeight: 500, cursor: "pointer", background: "transparent" }} className="border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400">Cancel</button>
          <button
            onClick={saveAll}
            disabled={saving || !lines.some(l => l.trim())}
            style={{ padding: "0.625rem 1.5rem", borderRadius: "0.75rem", border: "none", background: "#7c6ff7", color: "white", fontSize: "0.875rem", fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 12px rgba(124,111,247,0.3)" }}
          >{saving ? "Saving…" : `Save ${lines.filter(l => l.trim()).length} tasks`}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Card Wall ────────────────────────────────────────────────────────────────
function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function TaskCard({ task }: { task: Task }) {
  const { setSelectedTaskId, selectedTaskId } = useUIStore();
  const qc = useQueryClient();
  const isSelected = selectedTaskId === task.id;
  const pill = PRIORITY_PILL[task.priority] ?? PRIORITY_PILL.LOW;
  const isDone = task.status === "COMPLETED";
  const isOverdue = task.dueDate && isPast(new Date(task.dueDate)) && !isToday(new Date(task.dueDate)) && !isDone;

  const toggleDone = useMutation({
    mutationFn: () => tasksApi.update(task.id, {
      status: isDone ? "PENDING" : "COMPLETED",
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const notes = task.description ? stripHtml(task.description) : "";

  return (
    <div
      onClick={() => setSelectedTaskId(isSelected ? null : task.id)}
      style={{
        breakInside: "avoid", marginBottom: "0.875rem",
        borderRadius: "1rem", border: "1px solid",
        borderColor: isSelected ? "#7c6ff7" : "rgba(226,232,240,0.8)",
        padding: "1.125rem 1.25rem",
        cursor: "pointer",
        boxShadow: isSelected
          ? "0 0 0 2px rgba(124,111,247,0.2)"
          : "0 1px 6px rgba(0,0,0,0.05)",
        transition: "box-shadow 0.15s, border-color 0.15s",
        opacity: isDone ? 0.55 : 1,
      }}
      className="bg-white dark:bg-gray-900 hover:shadow-md transition-shadow"
    >
      {/* Title row */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: "0.625rem", marginBottom: notes || task.dueDate || task.tags.length ? "0.875rem" : 0 }}>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); toggleDone.mutate(); }}
          style={{
            flexShrink: 0, marginTop: "0.125rem",
            width: "1.125rem", height: "1.125rem", borderRadius: "50%",
            border: "2px solid", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            background: isDone ? "#7c6ff7" : "transparent",
            borderColor: isDone ? "#7c6ff7" : "#d1d5db",
            transition: "all 0.15s",
          }}
        >
          {isDone && (
            <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
              <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
        <p className="text-gray-900 dark:text-white" style={{
          fontSize: "0.9375rem", fontWeight: 600, lineHeight: 1.4,
          textDecoration: isDone ? "line-through" : "none",
          flex: 1,
        }}>
          {task.title}
        </p>
      </div>

      {/* Notes preview */}
      {notes && (
        <p className="text-gray-500 dark:text-gray-400" style={{
          fontSize: "0.8125rem", lineHeight: 1.55,
          marginBottom: "0.875rem",
          display: "-webkit-box", WebkitLineClamp: 4,
          WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>
          {notes}
        </p>
      )}

      {/* Footer */}
      <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
        {/* Priority */}
        <span style={{
          display: "inline-flex", alignItems: "center", gap: "0.3rem",
          padding: "0.2rem 0.625rem", borderRadius: "999px",
          background: pill.bg, fontSize: "0.6875rem", fontWeight: 700,
        }}>
          <span style={{ width: "0.4375rem", height: "0.4375rem", borderRadius: "50%", background: pill.dot }} />
          <span style={{ color: pill.color }}>{task.priority.charAt(0) + task.priority.slice(1).toLowerCase()}</span>
        </span>

        {/* Due date */}
        {task.dueDate && (
          <span style={{
            display: "inline-flex", alignItems: "center", gap: "0.3rem",
            fontSize: "0.6875rem", fontWeight: 600,
            color: isOverdue ? "#ef4444" : "#9ca3af",
          }}>
            <Calendar size={10} />
            {format(new Date(task.dueDate), "MMM d")}
          </span>
        )}

        {/* Tags */}
        {task.tags.slice(0, 2).map(({ tag }) => (
          <span key={tag.id} style={{
            padding: "0.2rem 0.5rem", borderRadius: "999px",
            background: tag.color + "18", color: tag.color,
            fontSize: "0.6875rem", fontWeight: 600,
          }}>
            {tag.name}
          </span>
        ))}
      </div>
    </div>
  );
}

function CardWall({ tasks }: { tasks: Task[] }) {
  const isMobile = useIsMobile();

  if (tasks.length === 0) return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>✓</div>
      <p className="text-gray-400 dark:text-gray-600 font-medium">You're all caught up!</p>
    </div>
  );

  return (
    <div style={{ columns: isMobile ? "1" : "2", columnGap: "0.875rem" }} className="md:columns-3">
      {tasks.map((task) => <TaskCard key={task.id} task={task} />)}
    </div>
  );
}

// ─── Today Skills ─────────────────────────────────────────────────────────────
function TodaySkills() {
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);
  const dow = (new Date().getDay() + 6) % 7; // Mon=0…Sun=6

  const { data: skills = [] } = useQuery<Skill[]>({
    queryKey: ["skills"],
    queryFn: skillsApi.getAll,
  });

  const todaySkills = skills.filter((s) => parseDays(s).includes(dow));

  const toggle = useMutation({
    mutationFn: (id: string) => skillsApi.toggle(id, today),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["skills"] }),
  });

  if (todaySkills.length === 0) return null;

  function fmtDuration(min: number) {
    if (min < 60) return `${min}m`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
  }

  return (
    <div style={{ marginBottom: "1.5rem" }}>
      <p style={{ fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.5rem" }}
         className="text-gray-400 dark:text-gray-600">
        Skills
      </p>
      <div className="bg-white dark:bg-gray-900"
           style={{ borderRadius: "0.875rem", border: "1px solid var(--color-border)", overflow: "hidden" }}>
        {todaySkills.map((skill, i) => {
          const done = skill.sessions.some((s) => s.date === today);
          return (
            <div key={skill.id}
                 style={{
                   display: "flex", alignItems: "center", gap: "0.75rem",
                   padding: "0.75rem 1rem",
                   borderTop: i > 0 ? "1px solid var(--color-border)" : "none",
                 }}>
              <div style={{ width: "0.5rem", height: "0.5rem", borderRadius: "50%", background: skill.color, flexShrink: 0 }} />
              <span className="text-gray-800 dark:text-gray-200" style={{ flex: 1, fontSize: "0.875rem", fontWeight: 600 }}>
                {skill.name}
              </span>
              <span className="text-gray-400" style={{ fontSize: "0.75rem", fontWeight: 500 }}>
                {fmtDuration(skill.duration)}
              </span>
              <button
                onClick={() => toggle.mutate(skill.id)}
                style={{
                  width: "1.75rem", height: "1.75rem", borderRadius: "50%", flexShrink: 0,
                  border: `2px solid ${done ? skill.color : "#d1d5db"}`,
                  background: done ? skill.color : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", transition: "all 0.2s",
                }}
              >
                {done && (
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export function TasksPage() {
  const qc = useQueryClient();
  const { selectedView } = useUIStore();
  const [viewMode, setViewMode] = useState<"list" | "cards">("list");

  const { data, isLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => tasksApi.getAll({ isArchived: false, limit: 200 }),
  });

  const { data: archivedData } = useQuery({
    queryKey: ["tasks", { isArchived: true }],
    queryFn: () => tasksApi.getAll({ isArchived: true, limit: 200 }),
    enabled: selectedView === "completed",
  });

  const reorder = useMutation({
    mutationFn: tasksApi.reorder,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const allTasks: Task[] = data?.tasks ?? [];
  const filtered = useMemo(() => filterTasks(allTasks, selectedView), [allTasks, selectedView]);

  const title = selectedView.startsWith("project:")
    ? (allTasks.find((t) => t.projectId === selectedView.slice(8))?.project?.name ?? "List")
    : selectedView.startsWith("tag:")
    ? `#${selectedView.slice(4)}`
    : VIEW_TITLES[selectedView] ?? selectedView;

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = filtered.findIndex((t) => t.id === active.id);
    const newIndex = filtered.findIndex((t) => t.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = [...filtered];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved!);
    reorder.mutate(reordered.map((t, i) => ({ id: t.id, position: i })));
  };

  const projectId = selectedView.startsWith("project:") ? selectedView.slice(8) : undefined;
  const useGroups = selectedView === "inbox" && viewMode === "list";
  const groups = useMemo(
    () => useGroups ? groupByDate(filtered) : [{ label: "", color: "", tasks: filtered }],
    [filtered, useGroups]
  );

  const showToggle = selectedView !== "completed" && selectedView !== "today";
  const [brainDumpOpen, setBrainDumpOpen] = useState(false);
  const [panicOpen, setPanicOpen] = useState(false);
  const isMobile = useIsMobile();

  return (
    <div className="flex flex-col max-w-3xl w-full">
      {brainDumpOpen && <BrainDump onClose={() => setBrainDumpOpen(false)} />}
      {panicOpen && <PanicMode tasks={allTasks} onClose={() => setPanicOpen(false)} />}

      {/* Header */}
      <div style={{ marginBottom: "1.75rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap" }}>
          <h1 className="text-gray-900 dark:text-white" style={{ fontSize: isMobile ? "1.625rem" : "2rem", fontWeight: 800 }}>
            {title}
          </h1>

          <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", flexShrink: 0 }}>
            {/* Brain dump button */}
            {selectedView !== "completed" && (
              <button
                onClick={() => setBrainDumpOpen(true)}
                style={{ display: "flex", alignItems: "center", gap: "0.3rem", padding: isMobile ? "0.4375rem 0.625rem" : "0.5rem 0.875rem", borderRadius: "0.625rem", border: "none", cursor: "pointer", fontSize: "0.75rem", fontWeight: 600, background: "rgba(124,111,247,0.1)", color: "#7c6ff7" }}
                className="hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition"
                title="Brain dump"
              >
                <Zap size={13} /> {isMobile ? "" : "Dump"}
              </button>
            )}

            {/* Panic mode button */}
            {selectedView !== "completed" && (
              <button
                onClick={() => setPanicOpen(true)}
                style={{ display: "flex", alignItems: "center", gap: "0.3rem", padding: isMobile ? "0.4375rem 0.625rem" : "0.5rem 0.875rem", borderRadius: "0.625rem", border: "none", cursor: "pointer", fontSize: "0.75rem", fontWeight: 600, background: "rgba(239,68,68,0.08)", color: "#ef4444" }}
                className="hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                title="Panic mode — one task at a time"
              >
                <AlertTriangle size={13} /> {isMobile ? "" : "Panic"}
              </button>
            )}

            {/* View toggle */}
            {showToggle && (
              <div className="bg-gray-100 dark:bg-gray-800" style={{ display: "flex", borderRadius: "0.625rem", padding: "0.25rem", gap: "0.25rem" }}>
                {([
                  { mode: "list",  Icon: List },
                  { mode: "cards", Icon: LayoutGrid },
                ] as const).map(({ mode, Icon }) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    style={{
                      padding: "0.375rem 0.625rem", borderRadius: "0.4375rem",
                      border: "none", cursor: "pointer", display: "flex",
                      alignItems: "center", justifyContent: "center",
                      background: viewMode === mode ? "white" : "transparent",
                      boxShadow: viewMode === mode ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
                      transition: "all 0.15s",
                    }}
                    className={viewMode === mode ? "text-gray-900 dark:text-white dark:bg-gray-700" : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"}
                  >
                    <Icon size={15} />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        {selectedView === "today" && <WeatherWidget />}
      </div>

      {selectedView === "today" && <TodayExtras todayTasks={filtered} />}
      {selectedView === "today" && <TodaySkills />}

      {/* Next task suggestion — Today + Inbox */}
      {(selectedView === "today" || selectedView === "inbox") && !isLoading && (
        <NextTaskCard tasks={filtered} />
      )}

      {/* Add task */}
      {selectedView !== "completed" && selectedView !== "today" && (
        <div style={{ marginBottom: "1.75rem" }}>
          <InlineAdd projectId={projectId} />
        </div>
      )}

      {/* Content */}
      <div className="pb-10">
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 size={28} className="animate-spin text-indigo-400" />
          </div>
        ) : viewMode === "cards" && showToggle ? (
          <CardWall tasks={filtered} />
        ) : (
          <>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={filtered.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                {groups.map(({ label, color, tasks }) => (
                  <div key={label} style={{ marginBottom: "1.5rem" }}>
                    {label && (
                      <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", padding: "0.5rem 0", marginBottom: "0.75rem" }}>
                        <span className={`text-sm font-bold uppercase tracking-widest ${color}`}>{label}</span>
                        <span className="text-sm font-medium text-gray-300 dark:text-gray-600">{tasks.length}</span>
                      </div>
                    )}
                    <div className="bg-white dark:bg-gray-900" style={{ borderRadius: "0.875rem", border: "1px solid", borderColor: "var(--task-border)", overflow: "hidden" }}>
                      {tasks.map((task) => <TaskRow key={task.id} task={task} />)}
                      {tasks.length === 0 && (
                        <div className="text-gray-300 dark:text-gray-700 text-sm text-center" style={{ padding: "2rem" }}>No tasks</div>
                      )}
                    </div>
                  </div>
                ))}
              </SortableContext>
            </DndContext>

            {filtered.length === 0 && !isLoading && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>✓</div>
                <p className="text-gray-400 dark:text-gray-600 font-medium">You're all caught up!</p>
                <p className="text-sm text-gray-300 dark:text-gray-700 mt-1">No tasks here</p>
              </div>
            )}

            {selectedView === "completed" && archivedData?.tasks?.length > 0 && (
              <div style={{ marginTop: "2rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
                  <Archive size={13} className="text-gray-400" />
                  <span className="text-sm font-bold uppercase tracking-widest text-gray-400">Archived</span>
                </div>
                <div className="bg-white dark:bg-gray-900" style={{ borderRadius: "0.875rem", border: "1px solid", overflow: "hidden" }}>
                  {archivedData.tasks.map((task: Task) => <TaskRow key={task.id} task={task} />)}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
