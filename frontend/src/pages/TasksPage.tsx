import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { isToday, isFuture, isPast, format } from "date-fns";
import { Loader2, Archive, List, LayoutGrid, Calendar } from "lucide-react";
import { tasksApi, Task } from "../api/tasks";
import { useUIStore, View } from "../store/ui";
import { TaskRow } from "../components/tasks/TaskRow";
import { InlineAdd } from "../components/tasks/InlineAdd";
import { WeatherWidget } from "../components/WeatherWidget";
import { TodayExtras } from "../components/today/TodayExtras";

const VIEW_TITLES: Record<string, string> = {
  inbox: "Tasks", today: "Today", upcoming: "Next 7 Days",
  completed: "Completed", pending: "Pending", in_progress: "In Progress", overdue: "Overdue",
};

const PRIORITY_PILL: Record<string, { bg: string; color: string; dot: string }> = {
  LOW:      { bg: "rgba(99,102,241,0.1)",  color: "#6366f1", dot: "#818cf8" },
  MEDIUM:   { bg: "rgba(16,185,129,0.1)",  color: "#059669", dot: "#34d399" },
  HIGH:     { bg: "rgba(249,115,22,0.1)",  color: "#ea580c", dot: "#fb923c" },
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
        borderColor: isSelected ? "#6366f1" : "rgba(226,232,240,0.8)",
        padding: "1.125rem 1.25rem",
        cursor: "pointer",
        boxShadow: isSelected
          ? "0 0 0 2px rgba(99,102,241,0.2)"
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
            background: isDone ? "#6366f1" : "transparent",
            borderColor: isDone ? "#6366f1" : "#d1d5db",
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
  if (tasks.length === 0) return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>✓</div>
      <p className="text-gray-400 dark:text-gray-600 font-medium">You're all caught up!</p>
    </div>
  );

  return (
    <div style={{ columns: "2", columnGap: "0.875rem" }} className="sm:columns-2 md:columns-3">
      {tasks.map((task) => <TaskCard key={task.id} task={task} />)}
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

  return (
    <div className="flex flex-col max-w-3xl w-full">

      {/* Header */}
      <div style={{ marginBottom: "1.75rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
          <h1 className="text-gray-900 dark:text-white" style={{ fontSize: "2rem", fontWeight: 800 }}>
            {title}
          </h1>

          {/* View toggle */}
          {showToggle && (
            <div className="bg-gray-100 dark:bg-gray-800" style={{ display: "flex", borderRadius: "0.625rem", padding: "0.25rem", gap: "0.25rem", flexShrink: 0 }}>
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
                  <Icon size={16} />
                </button>
              ))}
            </div>
          )}
        </div>
        {selectedView === "today" && <WeatherWidget />}
      </div>

      {selectedView === "today" && <TodayExtras todayTasks={filtered} />}

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
