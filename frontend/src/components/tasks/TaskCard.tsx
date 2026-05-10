import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical, Check, Edit2, Trash2, ChevronDown, ChevronRight,
  Plus, RefreshCw, Clock, Calendar,
} from "lucide-react";
import { format, isPast, isToday } from "date-fns";
import { tasksApi, Task } from "../../api/tasks";
import { PriorityBadge, StatusBadge, TagBadge } from "../ui/Badge";
import { Modal } from "../ui/Modal";
import { TaskForm } from "./TaskForm";
import toast from "react-hot-toast";

interface TaskCardProps {
  task: Task;
  depth?: number;
}

export function TaskCard({ task, depth = 0 }: TaskCardProps) {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [addSubOpen, setAddSubOpen] = useState(false);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    disabled: depth > 0,
  });

  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  const toggleStatus = useMutation({
    mutationFn: () =>
      tasksApi.update(task.id, {
        status: task.status === "COMPLETED" ? "PENDING" : "COMPLETED",
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const deleteTask = useMutation({
    mutationFn: () => tasksApi.delete(task.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Task deleted");
    },
  });

  const archive = useMutation({
    mutationFn: () => tasksApi.update(task.id, { isArchived: true }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Archived");
    },
  });

  const isOverdue = task.dueDate && isPast(new Date(task.dueDate)) && task.status !== "COMPLETED";
  const isDueToday = task.dueDate && isToday(new Date(task.dueDate));

  const RECURRENCE_LABELS: Record<string, string> = {
    DAILY: "Daily", WEEKLY: "Weekly", MONTHLY: "Monthly", YEARLY: "Yearly",
  };

  return (
    <div ref={setNodeRef} style={style} className={depth > 0 ? "ml-8 mt-2" : ""}>
      <div
        className={`group flex items-start gap-4 px-5 py-4 rounded-2xl border transition ${
          task.status === "COMPLETED"
            ? "bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 opacity-70"
            : isOverdue
            ? "bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800"
            : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600"
        }`}
      >
        {depth === 0 && (
          <button
            {...attributes}
            {...listeners}
            className="mt-1 cursor-grab text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition flex-shrink-0"
          >
            <GripVertical size={17} />
          </button>
        )}

        <button
          onClick={() => toggleStatus.mutate()}
          className={`mt-0.5 flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition ${
            task.status === "COMPLETED"
              ? "bg-green-500 border-green-500 text-white"
              : "border-gray-300 dark:border-gray-600 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
          }`}
        >
          {task.status === "COMPLETED" && <Check size={13} />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p
                className={`text-sm font-semibold leading-snug ${
                  task.status === "COMPLETED"
                    ? "line-through text-gray-400 dark:text-gray-500"
                    : "text-gray-900 dark:text-white"
                }`}
              >
                {task.title}
              </p>
              {task.description && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2 leading-relaxed">{task.description}</p>
              )}
            </div>
            <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition">
              {task.subtasks?.length === 0 && !task.parentId && (
                <button
                  onClick={() => setAddSubOpen(true)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition"
                  title="Add subtask"
                >
                  <Plus size={15} />
                </button>
              )}
              <button
                onClick={() => setEditOpen(true)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              >
                <Edit2 size={15} />
              </button>
              <button
                onClick={() => archive.mutate()}
                className="p-1.5 rounded-lg text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition"
                title="Archive"
              >
                <RefreshCw size={15} />
              </button>
              <button
                onClick={() => { if (confirm("Delete this task?")) deleteTask.mutate(); }}
                className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-3">
            <PriorityBadge priority={task.priority} />
            <StatusBadge status={task.status} />
            {task.tags.map(({ tag }) => (
              <TagBadge key={tag.id} label={tag.name} color={tag.color} />
            ))}
            {task.dueDate && (
              <span className={`flex items-center gap-1.5 text-xs font-medium ${
                isOverdue ? "text-red-600 dark:text-red-400" :
                isDueToday ? "text-orange-600 dark:text-orange-400" :
                "text-gray-400 dark:text-gray-500"
              }`}>
                <Calendar size={12} />
                {format(new Date(task.dueDate), "d MMM")}
              </span>
            )}
            {task.reminder && (
              <span className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
                <Clock size={12} />
                {format(new Date(task.reminder), "d MMM HH:mm")}
              </span>
            )}
            {task.recurrence && (
              <span className="flex items-center gap-1.5 text-xs text-indigo-500 dark:text-indigo-400">
                <RefreshCw size={12} />
                {RECURRENCE_LABELS[task.recurrence] ?? task.recurrence}
              </span>
            )}
            {task.project && (
              <span className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: task.project.color }} />
                {task.project.name}
              </span>
            )}
          </div>

          {task.subtasks?.length > 0 && (
            <div className="mt-3">
              <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition"
              >
                {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                {task.subtasks.length} subtasks
              </button>
            </div>
          )}
        </div>
      </div>

      {expanded && task.subtasks?.map((sub) => (
        <TaskCard key={sub.id} task={sub} depth={depth + 1} />
      ))}

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Task" size="lg">
        <TaskForm task={task} onSuccess={() => setEditOpen(false)} />
      </Modal>

      <Modal open={addSubOpen} onClose={() => setAddSubOpen(false)} title="Add Subtask" size="lg">
        <TaskForm parentId={task.id} onSuccess={() => setAddSubOpen(false)} />
      </Modal>
    </div>
  );
}
