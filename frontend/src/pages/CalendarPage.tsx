import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors, useDroppable, useDraggable,
} from "@dnd-kit/core";
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, format, isSameMonth, isToday,
  isSameDay, addMonths, subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { tasksApi, Task } from "../api/tasks";
import { useUIStore } from "../store/ui";

// Softer palette — works in both light and dark
const PILL: Record<string, { bg: string; dot: string; text: string }> = {
  LOW:      { bg: "rgba(99,102,241,0.12)",  dot: "#818cf8", text: "#6366f1" },
  MEDIUM:   { bg: "rgba(16,185,129,0.12)",  dot: "#34d399", text: "#059669" },
  HIGH:     { bg: "rgba(249,115,22,0.12)",  dot: "#fb923c", text: "#ea580c" },
  CRITICAL: { bg: "rgba(239,68,68,0.12)",   dot: "#f87171", text: "#dc2626" },
};

// ─── Task Pill ─────────────────────────────────────────────────────────────────
function TaskPill({ task, overlay = false }: { task: Task; overlay?: boolean }) {
  const { setSelectedTaskId, selectedTaskId } = useUIStore();
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id });
  const isSelected = selectedTaskId === task.id;
  const style = PILL[task.priority] ?? PILL.LOW;

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={(e) => { e.stopPropagation(); setSelectedTaskId(isSelected ? null : task.id); }}
      style={{
        display: "flex", alignItems: "center", gap: "0.375rem",
        padding: "0.25rem 0.625rem",
        borderRadius: "999px",
        background: style.bg,
        border: `1.5px solid ${isSelected ? style.dot : "transparent"}`,
        cursor: overlay ? "grabbing" : "grab",
        opacity: isDragging ? 0.3 : task.status === "COMPLETED" ? 0.45 : 1,
        transform: overlay ? "rotate(2deg) scale(1.04)" : undefined,
        boxShadow: overlay ? "0 8px 24px rgba(0,0,0,0.18)" : undefined,
        transition: "opacity 0.15s",
        userSelect: "none",
        maxWidth: "100%",
      }}
    >
      <span style={{
        width: "0.4375rem", height: "0.4375rem", borderRadius: "50%",
        background: style.dot, flexShrink: 0,
      }} />
      <span style={{
        fontSize: "0.6875rem", fontWeight: 600, color: style.text,
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        textDecoration: task.status === "COMPLETED" ? "line-through" : undefined,
      }}>
        {task.title}
      </span>
    </div>
  );
}

// ─── Day Cell ─────────────────────────────────────────────────────────────────
function DayCell({ date, tasks, isCurrentMonth }: { date: Date; tasks: Task[]; isCurrentMonth: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: format(date, "yyyy-MM-dd") });
  const today = isToday(date);
  const visible = tasks.slice(0, 3);
  const overflow = tasks.length - 3;

  return (
    <div
      ref={setNodeRef}
      style={{
        minHeight: "clamp(4rem, 14vw, 7rem)",
        padding: "0.375rem 0.4rem",
        borderBottom: "1px solid rgba(241,245,249,1)",
        borderRight: "1px solid rgba(241,245,249,1)",
        background: isOver
          ? "rgba(99,102,241,0.06)"
          : today
          ? "rgba(99,102,241,0.03)"
          : isCurrentMonth
          ? undefined
          : "rgba(248,250,252,0.5)",
        display: "flex", flexDirection: "column", gap: "0.25rem",
        transition: "background 0.15s",
      }}
      className={isCurrentMonth ? "bg-white dark:bg-gray-950" : "bg-gray-50/40 dark:bg-gray-900/30"}
    >
      {/* Day number */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "0.125rem" }}>
        <span style={{
          width: "1.5rem", height: "1.5rem",
          borderRadius: "50%",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "0.6875rem", fontWeight: today ? 800 : 500,
          background: today ? "#6366f1" : "transparent",
          color: today ? "white" : isCurrentMonth ? undefined : "rgba(156,163,175,1)",
          flexShrink: 0,
        }} className={!today ? (isCurrentMonth ? "text-gray-700 dark:text-gray-400" : "text-gray-300 dark:text-gray-700") : ""}>
          {format(date, "d")}
        </span>
      </div>

      {/* Pills */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", overflow: "hidden" }}>
        {visible.map((t) => <TaskPill key={t.id} task={t} />)}
        {overflow > 0 && (
          <span style={{ fontSize: "0.625rem", fontWeight: 600, color: "#9ca3af", paddingLeft: "0.25rem" }}>
            +{overflow}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Calendar Page ─────────────────────────────────────────────────────────────
export function CalendarPage() {
  const qc = useQueryClient();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [draggingTask, setDraggingTask] = useState<Task | null>(null);

  const { data } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => tasksApi.getAll({ isArchived: false, limit: 500 }),
  });

  const updateTask = useMutation({
    mutationFn: ({ id, dueDate }: { id: string; dueDate: string }) => tasksApi.update(id, { dueDate }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const tasks: Task[] = data?.tasks ?? [];

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const tasksByDate = useMemo(() => {
    const map: Record<string, Task[]> = {};
    for (const task of tasks) {
      if (!task.dueDate) continue;
      const key = format(new Date(task.dueDate), "yyyy-MM-dd");
      if (!map[key]) map[key] = [];
      map[key]!.push(task);
    }
    return map;
  }, [tasks]);

  const unscheduled = useMemo(
    () => tasks.filter((t) => !t.dueDate && t.status !== "COMPLETED"),
    [tasks]
  );

  const todayCount = tasks.filter(
    (t) => t.dueDate && isSameDay(new Date(t.dueDate), new Date())
  ).length;

  const handleDragStart = (e: DragStartEvent) => {
    setDraggingTask(tasks.find((t) => t.id === e.active.id) ?? null);
  };

  const handleDragEnd = (e: DragEndEvent) => {
    setDraggingTask(null);
    const { active, over } = e;
    if (!over) return;
    const dateStr = over.id as string;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return;
    const task = tasks.find((t) => t.id === active.id);
    if (!task) return;
    const cur = task.dueDate ? format(new Date(task.dueDate), "yyyy-MM-dd") : null;
    if (cur === dateStr) return;
    updateTask.mutate({ id: task.id, dueDate: new Date(dateStr + "T09:00:00").toISOString() });
  };

  const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div style={{ display: "flex", height: "100%", gap: "1.25rem", padding: "0.25rem", overflow: "hidden" }}>
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>

        {/* ── Main calendar card ── */}
        <div className="bg-white dark:bg-gray-900" style={{
          flex: 1, display: "flex", flexDirection: "column", overflow: "hidden",
          borderRadius: "1.25rem",
          border: "1px solid rgba(226,232,240,0.8)",
          boxShadow: "0 2px 16px rgba(0,0,0,0.06)",
        }}>

          {/* Header */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "1.25rem 1.5rem", flexShrink: 0,
            borderBottom: "1px solid rgba(241,245,249,1)",
          }} className="dark:border-gray-800">
            <div>
              <h1 className="text-gray-900 dark:text-white"
                  style={{ fontSize: "1.5rem", fontWeight: 800, lineHeight: 1.1 }}>
                {format(currentMonth, "MMMM yyyy")}
              </h1>
              {todayCount > 0 && (
                <p style={{ fontSize: "0.75rem", color: "#6366f1", fontWeight: 600, marginTop: "0.2rem" }}>
                  {todayCount} task{todayCount !== 1 ? "s" : ""} today
                </p>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <button
                onClick={() => setCurrentMonth(new Date())}
                style={{
                  padding: "0.5rem 1.125rem", borderRadius: "0.75rem",
                  background: "rgba(99,102,241,0.1)", color: "#6366f1",
                  border: "none", fontWeight: 700, fontSize: "0.8125rem", cursor: "pointer",
                }}
              >
                Today
              </button>
              <button
                onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
                style={{
                  width: "2.25rem", height: "2.25rem", borderRadius: "0.625rem",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  border: "none", cursor: "pointer", background: "transparent",
                }}
                className="text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              >
                <ChevronLeft size={17} />
              </button>
              <button
                onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
                style={{
                  width: "2.25rem", height: "2.25rem", borderRadius: "0.625rem",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  border: "none", cursor: "pointer", background: "transparent",
                }}
                className="text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              >
                <ChevronRight size={17} />
              </button>
            </div>
          </div>

          {/* Weekday headers */}
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(7, 1fr)",
            borderBottom: "1px solid rgba(241,245,249,1)", flexShrink: 0,
          }} className="dark:border-gray-800">
            {WEEKDAYS.map((d, i) => (
              <div key={d} style={{
                padding: "0.625rem 0", textAlign: "center",
                fontSize: "0.6875rem", fontWeight: 700,
                letterSpacing: "0.06em", textTransform: "uppercase",
                borderRight: i < 6 ? "1px solid rgba(241,245,249,1)" : "none",
              }} className="text-gray-400 dark:text-gray-600 dark:border-gray-800">
                <span className="hidden sm:inline">{d}</span>
                <span className="sm:hidden">{d[0]}</span>
              </div>
            ))}
          </div>

          {/* Grid */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
              {days.map((date) => {
                const key = format(date, "yyyy-MM-dd");
                return (
                  <DayCell
                    key={key}
                    date={date}
                    tasks={tasksByDate[key] ?? []}
                    isCurrentMonth={isSameMonth(date, currentMonth)}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Unscheduled sidebar card (desktop only) ── */}
        <div className="hidden md:flex flex-col bg-white dark:bg-gray-900" style={{
          width: "14rem", flexShrink: 0, overflow: "hidden",
          borderRadius: "1.25rem",
          border: "1px solid rgba(226,232,240,0.8)",
          boxShadow: "0 2px 16px rgba(0,0,0,0.06)",
        }}>
          {/* Sidebar header */}
          <div style={{
            padding: "1.25rem 1.125rem 1rem",
            borderBottom: "1px solid rgba(241,245,249,1)",
          }} className="dark:border-gray-800">
            <p className="text-gray-900 dark:text-white"
               style={{ fontSize: "0.875rem", fontWeight: 700, marginBottom: "0.25rem" }}>
              Unscheduled
            </p>
            <p className="text-gray-400 dark:text-gray-500" style={{ fontSize: "0.75rem" }}>
              {unscheduled.length} task{unscheduled.length !== 1 ? "s" : ""} · drag to calendar
            </p>
          </div>

          {/* Task list */}
          <div style={{ flex: 1, overflowY: "auto", padding: "1rem 0.875rem" }}>
            {unscheduled.length === 0 ? (
              <div style={{ paddingTop: "2.5rem", textAlign: "center" }}>
                <div style={{
                  fontSize: "2.5rem", marginBottom: "0.75rem", lineHeight: 1,
                }}>🎉</div>
                <p className="text-gray-400 dark:text-gray-600"
                   style={{ fontSize: "0.8125rem", fontWeight: 500 }}>
                  All tasks scheduled!
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {unscheduled.map((task) => <TaskPill key={task.id} task={task} />)}
              </div>
            )}
          </div>
        </div>

        <DragOverlay dropAnimation={null}>
          {draggingTask && <TaskPill task={draggingTask} overlay />}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
