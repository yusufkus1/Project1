import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { RotateCcw, Trash2, Loader2 } from "lucide-react";
import { tasksApi, Task } from "../api/tasks";
import { PriorityBadge, StatusBadge } from "../components/ui/Badge";
import toast from "react-hot-toast";

export function ArchivePage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["tasks", { isArchived: true }],
    queryFn: () => tasksApi.getAll({ isArchived: true }),
  });

  const unarchive = useMutation({
    mutationFn: (id: string) => tasksApi.update(id, { isArchived: false }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tasks"] }); toast.success("Restored from archive"); },
  });

  const deleteTask = useMutation({
    mutationFn: (id: string) => tasksApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tasks"] }); toast.success("Deleted"); },
  });

  const tasks: Task[] = data?.tasks ?? [];

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Archive</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{tasks.length} archived tasks</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-indigo-500" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-gray-400 dark:text-gray-500">No archived tasks</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center gap-4 p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 line-through">{task.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  <PriorityBadge priority={task.priority} />
                  <StatusBadge status={task.status} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => unarchive.mutate(task.id)}
                  className="p-2 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition"
                  title="Restore from archive"
                >
                  <RotateCcw size={16} />
                </button>
                <button
                  onClick={() => { if (confirm("Permanently delete this task?")) deleteTask.mutate(task.id); }}
                  className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
