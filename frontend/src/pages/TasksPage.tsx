import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { isToday, isFuture, isPast } from "date-fns";
import { Loader2, Archive, MoreHorizontal, ArrowUpDown } from "lucide-react";
import { tasksApi, Task } from "../api/tasks";
import { useUIStore, View } from "../store/ui";
import { TaskRow } from "../components/tasks/TaskRow";
import { InlineAdd } from "../components/tasks/InlineAdd";
import { WeatherWidget } from "../components/WeatherWidget";

const VIEW_TITLES: Record<string, string> = {
  inbox: "Tasks",
  today: "Today",
  upcoming: "Next 7 Days",
  completed: "Completed",
  pending: "Pending",
  in_progress: "In Progress",
  overdue: "Overdue",
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
  const overdue = tasks.filter((t) => t.dueDate && isPast(new Date(t.dueDate)) && !isToday(new Date(t.dueDate)) && t.status !== "COMPLETED");
  const today = tasks.filter((t) => t.dueDate && isToday(new Date(t.dueDate)));
  const noDate = tasks.filter((t) => !t.dueDate && t.status !== "COMPLETED");
  const upcoming = tasks.filter((t) => t.dueDate && isFuture(new Date(t.dueDate)) && !isToday(new Date(t.dueDate)));

  const groups = [];
  if (overdue.length) groups.push({ label: "Overdue", color: "text-red-500", tasks: overdue });
  if (today.length) groups.push({ label: "Today", color: "text-green-600 dark:text-green-400", tasks: today });
  if (noDate.length) groups.push({ label: "No Date", color: "text-gray-400", tasks: noDate });
  if (upcoming.length) groups.push({ label: "Upcoming", color: "text-blue-500", tasks: upcoming });
  return groups;
}

export function TasksPage() {
  const qc = useQueryClient();
  const { selectedView } = useUIStore();

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
    reordered.splice(newIndex, 0, moved);
    reorder.mutate(reordered.map((t, i) => ({ id: t.id, position: i })));
  };

  const projectId = selectedView.startsWith("project:") ? selectedView.slice(8) : undefined;
  const useGroups = selectedView === "inbox";
  const groups = useMemo(
    () => useGroups ? groupByDate(filtered) : [{ label: "", color: "", tasks: filtered }],
    [filtered, useGroups]
  );

  return (
    <div className="flex flex-col max-w-3xl w-full">
      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
          <div className="flex items-center gap-1">
            <button className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition">
              <ArrowUpDown size={16} />
            </button>
            <button className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition">
              <MoreHorizontal size={16} />
            </button>
          </div>
        </div>
        {selectedView === "today" && <WeatherWidget />}
      </div>

      {/* Add task bar */}
      {selectedView !== "completed" && selectedView !== "today" && (
        <div style={{ marginBottom: "2rem" }}>
          <InlineAdd projectId={projectId} />
        </div>
      )}

      {/* Task list */}
      <div className="pb-10">
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 size={28} className="animate-spin text-indigo-400" />
          </div>
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
                <div className="text-5xl mb-4">✓</div>
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
