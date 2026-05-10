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
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { tasksApi, Task } from "../api/tasks";
import { useUIStore } from "../store/ui";

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "bg-gray-100 border-gray-300 text-gray-600 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400",
  MEDIUM: "bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300",
  HIGH: "bg-orange-50 border-orange-300 text-orange-700 dark:bg-orange-900/30 dark:border-orange-700 dark:text-orange-300",
  CRITICAL: "bg-red-50 border-red-300 text-red-700 dark:bg-red-900/30 dark:border-red-700 dark:text-red-300",
};

const PRIORITY_DOT: Record<string, string> = {
  LOW: "bg-gray-400",
  MEDIUM: "bg-blue-500",
  HIGH: "bg-orange-500",
  CRITICAL: "bg-red-500",
};

// ─── Task Mini Card (draggable) ────────────────────────────────────────────────
function TaskMiniCard({ task, overlay = false }: { task: Task; overlay?: boolean }) {
  const { setSelectedTaskId, selectedTaskId } = useUIStore();
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id });

  const isSelected = selectedTaskId === task.id;

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={(e) => { e.stopPropagation(); setSelectedTaskId(isSelected ? null : task.id); }}
      className={`flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs font-medium cursor-grab select-none transition-all ${
        PRIORITY_COLORS[task.priority]
      } ${isDragging ? "opacity-30" : ""} ${overlay ? "shadow-lg rotate-1 scale-105 cursor-grabbing" : "hover:shadow-sm"} ${
        isSelected ? "ring-2 ring-indigo-400 ring-offset-1" : ""
      } ${task.status === "COMPLETED" ? "opacity-50 line-through" : ""}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${PRIORITY_DOT[task.priority]}`} />
      <span className="truncate">{task.title}</span>
    </div>
  );
}

// ─── Day Cell (droppable) ──────────────────────────────────────────────────────
function DayCell({
  date, tasks, isCurrentMonth,
}: {
  date: Date;
  tasks: Task[];
  isCurrentMonth: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: format(date, "yyyy-MM-dd") });
  const today = isToday(date);
  const MAX_VISIBLE = 3;
  const visible = tasks.slice(0, MAX_VISIBLE);
  const overflow = tasks.length - MAX_VISIBLE;

  return (
    <div
      ref={setNodeRef}
      className={`min-h-28 p-2 border-b border-r border-gray-100 dark:border-gray-800 transition-colors flex flex-col gap-1 ${
        isCurrentMonth ? "bg-white dark:bg-gray-950" : "bg-gray-50/60 dark:bg-gray-900/40"
      } ${isOver ? "bg-indigo-50 dark:bg-indigo-900/20" : ""}`}
    >
      {/* Day number */}
      <div className="flex justify-end mb-0.5">
        <span
          className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full ${
            today
              ? "bg-indigo-600 text-white"
              : isCurrentMonth
              ? "text-gray-700 dark:text-gray-300"
              : "text-gray-300 dark:text-gray-700"
          }`}
        >
          {format(date, "d")}
        </span>
      </div>

      {/* Tasks */}
      <div className="flex flex-col gap-1 flex-1">
        {visible.map((task) => (
          <TaskMiniCard key={task.id} task={task} />
        ))}
        {overflow > 0 && (
          <span className="text-xs text-gray-400 dark:text-gray-600 px-1 font-medium">
            +{overflow} more
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
    mutationFn: ({ id, dueDate }: { id: string; dueDate: string }) =>
      tasksApi.update(id, { dueDate }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const tasks: Task[] = data?.tasks ?? [];

  // Build calendar grid
  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  // Group tasks by date
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

  // Tasks without a due date
  const unscheduled = useMemo(
    () => tasks.filter((t) => !t.dueDate && t.status !== "COMPLETED"),
    [tasks]
  );

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id);
    setDraggingTask(task ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setDraggingTask(null);
    const { active, over } = event;
    if (!over) return;
    const taskId = active.id as string;
    const dateStr = over.id as string;
    // Validate it's a date string
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return;
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const currentDateStr = task.dueDate ? format(new Date(task.dueDate), "yyyy-MM-dd") : null;
    if (currentDateStr === dateStr) return;
    updateTask.mutate({ id: taskId, dueDate: new Date(dateStr + "T09:00:00").toISOString() });
  };

  const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className="flex h-full overflow-hidden">
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        {/* Main calendar */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 flex-shrink-0" style={{ padding: "1.5rem 2rem" }}>
            <div className="flex items-center gap-3">
              <Calendar size={20} className="text-indigo-500" />
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                {format(currentMonth, "MMMM yyyy")}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentMonth(new Date())}
                className="px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
              >
                Today
              </button>
              <button
                onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
                className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
                className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
            {WEEKDAYS.map((d) => (
              <div key={d} className="py-2 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider border-r border-gray-100 dark:border-gray-800 last:border-r-0">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-7 border-l border-t border-gray-100 dark:border-gray-800">
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

        {/* Unscheduled sidebar */}
        <div className="w-56 flex-shrink-0 border-l border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 flex flex-col overflow-hidden">
          <div className="px-4 py-4 border-b border-gray-100 dark:border-gray-800">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Unscheduled</p>
            <p className="text-xs text-gray-400 mt-0.5">{unscheduled.length} tasks</p>
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5">
            {unscheduled.length === 0 ? (
              <p className="text-xs text-gray-300 dark:text-gray-700 text-center pt-4">All tasks scheduled</p>
            ) : (
              unscheduled.map((task) => <TaskMiniCard key={task.id} task={task} />)
            )}
          </div>
          <div className="px-3 py-3 border-t border-gray-100 dark:border-gray-800">
            <p className="text-xs text-gray-400 dark:text-gray-600 leading-relaxed">
              Drag tasks onto the calendar to schedule them.
            </p>
          </div>
        </div>

        {/* Drag overlay */}
        <DragOverlay dropAnimation={null}>
          {draggingTask && <TaskMiniCard task={draggingTask} overlay />}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
