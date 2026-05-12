import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors, useDroppable, useDraggable,
} from "@dnd-kit/core";
import { useNavigate } from "react-router-dom";
import { Check, Calendar, GripVertical } from "lucide-react";
import { format, isPast, isToday } from "date-fns";
import { tasksApi, Task } from "../api/tasks";
import { useGamificationStore } from "../store/gamification";
import toast from "react-hot-toast";

type QuadrantId = "critical" | "high" | "medium" | "low";

const QUADRANTS: {
  id: QuadrantId;
  priority: Task["priority"];
  label: string;
  sublabel: string;
  color: string;
  bg: string;
  border: string;
  headerBg: string;
  dot: string;
}[] = [
  {
    id: "critical",
    priority: "CRITICAL",
    label: "Do First",
    sublabel: "Urgent + Important",
    color: "#dc2626",
    bg: "rgba(239,68,68,0.03)",
    border: "rgba(239,68,68,0.18)",
    headerBg: "rgba(239,68,68,0.07)",
    dot: "#ef4444",
  },
  {
    id: "high",
    priority: "HIGH",
    label: "Schedule",
    sublabel: "Not Urgent + Important",
    color: "#2563eb",
    bg: "rgba(59,130,246,0.03)",
    border: "rgba(59,130,246,0.18)",
    headerBg: "rgba(59,130,246,0.07)",
    dot: "#3b82f6",
  },
  {
    id: "medium",
    priority: "MEDIUM",
    label: "Delegate",
    sublabel: "Urgent + Not Important",
    color: "#d97706",
    bg: "rgba(234,179,8,0.03)",
    border: "rgba(234,179,8,0.18)",
    headerBg: "rgba(234,179,8,0.07)",
    dot: "#f59e0b",
  },
  {
    id: "low",
    priority: "LOW",
    label: "Eliminate",
    sublabel: "Not Urgent + Not Important",
    color: "#6b7280",
    bg: "rgba(107,114,128,0.03)",
    border: "rgba(107,114,128,0.12)",
    headerBg: "rgba(107,114,128,0.05)",
    dot: "#9ca3af",
  },
];

function dueDateChip(date: string) {
  const d = new Date(date);
  if (isToday(d)) return { label: "Today", color: "#16a34a" };
  if (isPast(d)) return { label: format(d, "MMM d"), color: "#dc2626" };
  return { label: format(d, "MMM d"), color: "#9ca3af" };
}

// ─── Task Card (draggable) ─────────────────────────────────────────────────────
function TaskCard({
  task,
  quadrantColor,
  overlay = false,
}: {
  task: Task;
  quadrantColor?: string;
  overlay?: boolean;
}) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { completeTask, undoTask } = useGamificationStore();
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id });

  const toggleDone = useMutation({
    mutationFn: () =>
      tasksApi.update(task.id, {
        status: task.status === "COMPLETED" ? "PENDING" : "COMPLETED",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      if (task.status !== "COMPLETED") {
        const { xpGained, leveledUp, newAchievements } = completeTask(task.priority);
        toast.success(`+${xpGained} XP`, { duration: 1500 });
        if (leveledUp) toast("Level up!", { icon: "⬆️", duration: 3000 });
        newAchievements.forEach((a) => toast(`${a.icon} ${a.title} unlocked!`, { duration: 3500 }));
      } else {
        undoTask(task.priority);
      }
    },
  });

  const isDone = task.status === "COMPLETED";
  const due = task.dueDate ? dueDateChip(task.dueDate) : null;

  return (
    <div
      ref={setNodeRef}
      className="bg-white dark:bg-gray-900"
      style={{
        borderRadius: "0.625rem",
        border: "1px solid",
        borderColor: "rgba(229,231,235,0.8)",
        padding: "0.75rem",
        display: "flex",
        alignItems: "flex-start",
        gap: "0.625rem",
        opacity: isDragging ? 0.35 : 1,
        boxShadow: overlay ? "0 8px 24px rgba(0,0,0,0.12)" : "0 1px 3px rgba(0,0,0,0.04)",
        transform: overlay ? "rotate(1.5deg) scale(1.02)" : "none",
        cursor: overlay ? "grabbing" : "default",
        transition: "box-shadow 0.15s, border-color 0.15s",
      }}
    >
      {/* Grip handle */}
      <button
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        style={{
          flexShrink: 0, background: "none", border: "none", padding: "0.125rem",
          cursor: "grab", color: "#d1d5db", marginTop: "0.1rem",
        }}
        className="hover:text-gray-400 dark:hover:text-gray-600 transition-colors"
      >
        <GripVertical size={13} />
      </button>

      {/* Checkbox */}
      <button
        onClick={(e) => { e.stopPropagation(); toggleDone.mutate(); }}
        style={{
          flexShrink: 0, width: "1rem", height: "1rem", borderRadius: "50%",
          border: "2px solid", display: "flex", alignItems: "center",
          justifyContent: "center", cursor: "pointer", background: "none",
          padding: 0, marginTop: "0.15rem",
          borderColor: isDone ? (quadrantColor ?? "#7c6ff7") : "#d1d5db",
          backgroundColor: isDone ? (quadrantColor ?? "#7c6ff7") : "transparent",
          transition: "all 0.2s",
        }}
      >
        {isDone && <Check size={7} strokeWidth={3} color="white" />}
      </button>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          onClick={() => navigate(`/tasks/${task.id}`)}
          className={`cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors ${
            isDone ? "line-through text-gray-300 dark:text-gray-600" : "text-gray-800 dark:text-gray-100"
          }`}
          style={{
            fontSize: "0.8125rem", fontWeight: 500,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}
        >
          {task.title}
        </p>
        {due && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", marginTop: "0.375rem", color: due.color }}>
            <Calendar size={10} />
            <span style={{ fontSize: "0.6875rem", fontWeight: 500 }}>{due.label}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Quadrant Panel (droppable) ────────────────────────────────────────────────
function QuadrantPanel({
  quadrant,
  tasks,
}: {
  quadrant: typeof QUADRANTS[number];
  tasks: Task[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: quadrant.id });
  const active = tasks.filter((t) => t.status !== "COMPLETED");
  const done = tasks.filter((t) => t.status === "COMPLETED");

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        borderRadius: "1rem",
        border: "1.5px solid",
        borderColor: isOver ? quadrant.color : quadrant.border,
        background: isOver ? quadrant.headerBg : quadrant.bg,
        overflow: "hidden",
        transition: "border-color 0.15s, background 0.15s",
        boxShadow: isOver ? `0 0 0 3px ${quadrant.color}22` : "none",
      }}
      className="bg-white dark:bg-gray-900/60"
    >
      {/* Header */}
      <div
        style={{
          padding: "1rem 1.25rem",
          background: quadrant.headerBg,
          borderBottom: "1px solid",
          borderColor: quadrant.border,
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
            <span style={{
              width: "0.625rem", height: "0.625rem", borderRadius: "50%",
              background: quadrant.dot, flexShrink: 0,
            }} />
            <span style={{ fontWeight: 700, fontSize: "0.9375rem", color: quadrant.color }}>
              {quadrant.label}
            </span>
          </div>
          <span
            style={{
              fontSize: "0.75rem", fontWeight: 600, padding: "0.125rem 0.5rem",
              borderRadius: "999px", background: `${quadrant.dot}22`, color: quadrant.color,
            }}
          >
            {active.length}
          </span>
        </div>
        <p className="text-gray-400 dark:text-gray-500" style={{ fontSize: "0.75rem", marginTop: "0.25rem" }}>
          {quadrant.sublabel}
        </p>
      </div>

      {/* Task list */}
      <div
        ref={setNodeRef}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "0.875rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
        }}
      >
        {active.length === 0 && done.length === 0 && (
          <div style={{ textAlign: "center", padding: "2rem 1rem" }}>
            <p className="text-gray-300 dark:text-gray-700" style={{ fontSize: "0.8125rem" }}>No tasks</p>
            <p className="text-gray-200 dark:text-gray-800" style={{ fontSize: "0.75rem", marginTop: "0.25rem" }}>
              Drag tasks here
            </p>
          </div>
        )}

        {active.map((task) => (
          <TaskCard key={task.id} task={task} quadrantColor={quadrant.dot} />
        ))}

        {done.length > 0 && (
          <>
            <div style={{
              display: "flex", alignItems: "center", gap: "0.5rem",
              padding: "0.375rem 0", marginTop: active.length > 0 ? "0.5rem" : 0,
            }}>
              <div style={{ flex: 1, height: "1px", background: "rgba(0,0,0,0.06)" }} />
              <span className="text-gray-300 dark:text-gray-700" style={{ fontSize: "0.6875rem", fontWeight: 600 }}>
                {done.length} done
              </span>
              <div style={{ flex: 1, height: "1px", background: "rgba(0,0,0,0.06)" }} />
            </div>
            {done.map((task) => (
              <TaskCard key={task.id} task={task} quadrantColor={quadrant.dot} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Eisenhower Page ───────────────────────────────────────────────────────────
export function EisenhowerPage() {
  const qc = useQueryClient();
  const [draggingTask, setDraggingTask] = useState<Task | null>(null);

  const { data } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => tasksApi.getAll({ isArchived: false, limit: 500 }),
  });

  const tasks: Task[] = data?.tasks ?? [];

  const updatePriority = useMutation({
    mutationFn: ({ id, priority }: { id: string; priority: Task["priority"] }) =>
      tasksApi.update(id, { priority }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const tasksByQuadrant = useMemo(() => {
    const map: Record<QuadrantId, Task[]> = {
      critical: [], high: [], medium: [], low: [],
    };
    for (const task of tasks) {
      const q = task.priority.toLowerCase() as QuadrantId;
      map[q].push(task);
    }
    return map;
  }, [tasks]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragStart = (e: DragStartEvent) => {
    setDraggingTask(tasks.find((t) => t.id === e.active.id) ?? null);
  };

  const handleDragEnd = (e: DragEndEvent) => {
    setDraggingTask(null);
    const { active, over } = e;
    if (!over) return;
    const task = tasks.find((t) => t.id === active.id);
    if (!task) return;
    const target = QUADRANTS.find((q) => q.id === over.id);
    if (!target || task.priority === target.priority) return;
    updatePriority.mutate({ id: task.id, priority: target.priority });
  };

  const draggingQuadrant = draggingTask
    ? QUADRANTS.find((q) => q.priority === draggingTask.priority)
    : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>

      {/* Page header */}
      <div style={{ marginBottom: "2rem" }}>
        <h1
          className="text-gray-900 dark:text-white"
          style={{ fontSize: "1.875rem", fontWeight: 800 }}
        >
          Eisenhower Matrix
        </h1>
        <p className="text-gray-400 dark:text-gray-500" style={{ fontSize: "0.9375rem", marginTop: "0.375rem" }}>
          Drag tasks between quadrants to reprioritize. Click a title to open the task.
        </p>
      </div>

      {/* Axis labels */}
      <div style={{ display: "flex", marginBottom: "0.5rem", paddingLeft: "calc(50% + 0.625rem)" }}>
        <span className="text-gray-400 dark:text-gray-500" style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>
          Not Urgent →
        </span>
      </div>

      <div style={{ display: "flex", gap: "1.25rem", flex: 1, minHeight: "calc(100vh - 20rem)" }}>

        {/* Urgent label (vertical, left) */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", writingMode: "vertical-rl", transform: "rotate(180deg)", flexShrink: 0 }}>
          <span className="text-gray-400 dark:text-gray-500" style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>
            ← Urgent
          </span>
        </div>

        {/* 2×2 Grid */}
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div style={{
            flex: 1,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gridTemplateRows: "1fr 1fr",
            gap: "1.25rem",
          }}>
            {QUADRANTS.map((q) => (
              <QuadrantPanel key={q.id} quadrant={q} tasks={tasksByQuadrant[q.id]} />
            ))}
          </div>

          <DragOverlay dropAnimation={null}>
            {draggingTask && (
              <TaskCard task={draggingTask} quadrantColor={draggingQuadrant?.dot} overlay />
            )}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}
