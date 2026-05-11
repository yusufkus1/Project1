import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Check, Star, Calendar, GripVertical, MoreHorizontal } from "lucide-react";
import { format, isPast, isToday, isTomorrow } from "date-fns";
import { useNavigate } from "react-router-dom";
import { tasksApi, Task } from "../../api/tasks";
import { useUIStore } from "../../store/ui";
import { useGamificationStore } from "../../store/gamification";
import toast from "react-hot-toast";

const PRIORITY_FLAG: Record<string, string> = {
  LOW: "text-gray-300 dark:text-gray-700",
  MEDIUM: "text-blue-400",
  HIGH: "text-orange-400",
  CRITICAL: "text-red-500",
};

function dueDateLabel(date: string) {
  const d = new Date(date);
  if (isToday(d)) return { label: "Today", color: "#16a34a" };
  if (isTomorrow(d)) return { label: "Tomorrow", color: "#2563eb" };
  if (isPast(d)) return { label: format(d, "MMM d"), color: "#dc2626" };
  return { label: format(d, "MMM d"), color: "#9ca3af" };
}

interface XPPopup { id: number; amount: number }

export function TaskRow({ task, depth = 0 }: { task: Task; depth?: number }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { selectedTaskId, setSelectedTaskId } = useUIStore();
  const { completeTask, undoTask } = useGamificationStore();
  const [xpPopups, setXpPopups] = useState<XPPopup[]>([]);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    disabled: depth > 0,
  });

  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };

  const toggleDone = useMutation({
    mutationFn: () => tasksApi.update(task.id, {
      status: task.status === "COMPLETED" ? "PENDING" : "COMPLETED",
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      if (task.status !== "COMPLETED") {
        const { xpGained, leveledUp, newAchievements } = completeTask(task.priority);
        const popupId = Date.now();
        setXpPopups((prev) => [...prev, { id: popupId, amount: xpGained }]);
        setTimeout(() => setXpPopups((prev) => prev.filter((p) => p.id !== popupId)), 1200);
        if (leveledUp) toast("Level up!", { icon: "⬆️", duration: 3000 });
        newAchievements.forEach((a) => toast(`${a.icon} ${a.title} unlocked!`, { duration: 3500 }));
      } else {
        undoTask(task.priority);
      }
    },
  });

  const isDone = task.status === "COMPLETED";
  const isOverdue = task.dueDate && isPast(new Date(task.dueDate)) && !isToday(new Date(task.dueDate)) && !isDone;
  const due = task.dueDate ? dueDateLabel(task.dueDate) : null;
  const isSelected = selectedTaskId === task.id;

  return (
    <div ref={setNodeRef} style={style} className="relative">

      {/* XP popup */}
      {xpPopups.map((popup) => (
        <div key={popup.id} className="animate-xp-float" style={{
          position: "absolute", right: "3rem", top: 0, zIndex: 10,
          pointerEvents: "none", color: "#6366f1", fontSize: "0.75rem", fontWeight: 700,
        }}>
          +{popup.amount} XP
        </div>
      ))}

      <div
        className={`group flex items-center gap-3 border-b border-gray-50 dark:border-gray-800/60 last:border-b-0 transition-colors ${
          isSelected ? "bg-indigo-50/60 dark:bg-indigo-900/10" : "hover:bg-gray-50 dark:hover:bg-gray-800/30"
        }`}
        style={{ padding: "0.9rem 1.25rem", paddingLeft: depth > 0 ? "3rem" : "1.25rem" }}
      >
        {/* Drag handle */}
        {depth === 0 && (
          <button
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
            className="opacity-0 group-hover:opacity-100 text-gray-300 dark:text-gray-700 cursor-grab flex-shrink-0 transition"
            style={{ background: "none", border: "none", padding: "0.125rem", marginLeft: "-0.25rem" }}
          >
            <GripVertical size={15} />
          </button>
        )}

        {/* Checkbox */}
        <button
          onClick={(e) => { e.stopPropagation(); toggleDone.mutate(); }}
          style={{
            flexShrink: 0, width: "1.125rem", height: "1.125rem", borderRadius: "50%",
            border: "2px solid", display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", transition: "all 0.2s", background: "none", padding: 0,
            borderColor: isDone ? "#6366f1" : isOverdue ? "#ef4444" : "#d1d5db",
            backgroundColor: isDone ? "#6366f1" : "transparent",
          }}
        >
          {isDone && <Check size={9} strokeWidth={3} color="white" />}
        </button>

        {/* Title — click → profile page */}
        <span
          onClick={() => navigate(`/tasks/${task.id}`)}
          className={`flex-1 cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors ${
            isDone ? "line-through text-gray-300 dark:text-gray-600" : "text-gray-800 dark:text-gray-100"
          }`}
          style={{ fontSize: "0.9375rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
        >
          {task.title}
        </span>

        {/* Subtask count */}
        {task.subtasks?.length > 0 && (
          <span className="text-gray-400 dark:text-gray-600" style={{ fontSize: "0.75rem", flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>
            {task.subtasks.filter(s => s.status === "COMPLETED").length}/{task.subtasks.length}
          </span>
        )}

        {/* Tags (max 2) */}
        {task.tags.slice(0, 2).map(({ tag }) => (
          <span
            key={tag.id}
            style={{
              padding: "0.125rem 0.5rem", borderRadius: "4px",
              fontSize: "0.6875rem", fontWeight: 500, color: "white",
              flexShrink: 0, background: tag.color, opacity: 0.8,
            }}
          >
            {tag.name}
          </span>
        ))}

        {/* Due date */}
        {due && (
          <span style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.75rem", fontWeight: 500, flexShrink: 0, color: due.color }}>
            <Calendar size={11} />
            {due.label}
          </span>
        )}

        {/* Priority star */}
        <Star
          size={14}
          className={`flex-shrink-0 transition-opacity ${PRIORITY_FLAG[task.priority]} ${task.priority === "LOW" ? "opacity-0 group-hover:opacity-30" : ""}`}
          fill={task.priority === "HIGH" || task.priority === "CRITICAL" ? "currentColor" : "none"}
        />

        {/* 3-dot → open side panel */}
        <button
          onClick={(e) => { e.stopPropagation(); setSelectedTaskId(isSelected ? null : task.id); }}
          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition rounded-lg"
          style={{ flexShrink: 0, padding: "0.25rem", background: "none", border: "none", cursor: "pointer" }}
          title="Open details"
        >
          <MoreHorizontal size={15} />
        </button>
      </div>

      {task.subtasks?.map((sub) => (
        <TaskRow key={sub.id} task={sub} depth={depth + 1} />
      ))}
    </div>
  );
}
