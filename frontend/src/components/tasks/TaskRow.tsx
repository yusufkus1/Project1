import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Check, Star, Calendar, GripVertical, MoreHorizontal, Repeat2, Zap } from "lucide-react";
import { format, isPast, isToday, isTomorrow, differenceInDays } from "date-fns";
import { useNavigate } from "react-router-dom";
import { tasksApi, Task } from "../../api/tasks";
import { useUIStore } from "../../store/ui";
import { useGamificationStore } from "../../store/gamification";
import { useIsMobile } from "../../hooks/useIsMobile";
import confetti from "canvas-confetti";
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
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      if (task.status !== "COMPLETED") {
        const { xpGained, leveledUp, newAchievements } = completeTask(task.priority);
        const popupId = Date.now();
        setXpPopups((prev) => [...prev, { id: popupId, amount: xpGained }]);
        setTimeout(() => setXpPopups((prev) => prev.filter((p) => p.id !== popupId)), 1200);
        confetti({ particleCount: task.priority === "CRITICAL" ? 120 : 60, spread: 70, origin: { y: 0.6 }, colors: ["#7c6ff7", "#a78bfa", "#22c55e", "#f59e0b"] });
        if ((data as { recycled?: boolean }).recycled) {
          toast("Recurring task rescheduled", { icon: "🔁", duration: 2500 });
        } else {
          if (leveledUp) toast("Level up!", { icon: "⬆️", duration: 3000 });
          newAchievements.forEach((a) => toast(`${a.icon} ${a.title} unlocked!`, { duration: 3500 }));
        }
      } else {
        undoTask(task.priority);
      }
    },
  });

  const isDone = task.status === "COMPLETED";
  const isOverdue = task.dueDate && isPast(new Date(task.dueDate)) && !isToday(new Date(task.dueDate)) && !isDone;
  const due = task.dueDate ? dueDateLabel(task.dueDate) : null;
  const isSelected = selectedTaskId === task.id;
  const isQuick = !isDone && task.estimatedMinutes != null && task.estimatedMinutes <= 2;
  const daysOpen = !isDone && task.createdAt ? differenceInDays(new Date(), new Date(task.createdAt)) : 0;
  const isMobile = useIsMobile();

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(task.title);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const renameTask = useMutation({
    mutationFn: (title: string) => tasksApi.update(task.id, { title }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const commitRename = () => {
    const trimmed = titleDraft.trim();
    if (trimmed && trimmed !== task.title) renameTask.mutate(trimmed);
    else setTitleDraft(task.title);
    setEditingTitle(false);
  };

  const handleTitleClick = () => {
    if (clickTimer.current) return;
    clickTimer.current = setTimeout(() => {
      clickTimer.current = null;
      navigate(`/tasks/${task.id}`);
    }, 220);
  };

  const handleTitleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (clickTimer.current) { clearTimeout(clickTimer.current); clickTimer.current = null; }
    setTitleDraft(task.title);
    setEditingTitle(true);
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">

      {/* XP popup */}
      {xpPopups.map((popup) => (
        <div key={popup.id} className="animate-xp-float" style={{
          position: "absolute", right: "3rem", top: 0, zIndex: 10,
          pointerEvents: "none", color: "#7c6ff7", fontSize: "0.75rem", fontWeight: 700,
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
        {/* Drag handle — hidden on mobile */}
        {depth === 0 && !isMobile && (
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
            borderColor: isDone ? "#7c6ff7" : isOverdue ? "#ef4444" : "#d1d5db",
            backgroundColor: isDone ? "#7c6ff7" : "transparent",
          }}
        >
          {isDone && <Check size={9} strokeWidth={3} color="white" />}
        </button>

        {/* Title — single click → profile, double click → inline edit */}
        {editingTitle ? (
          <input
            ref={titleInputRef}
            value={titleDraft}
            autoFocus
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") { setTitleDraft(task.title); setEditingTitle(false); } }}
            onClick={(e) => e.stopPropagation()}
            className="text-gray-800 dark:text-gray-100 bg-transparent"
            style={{ flex: 1, fontSize: "0.9375rem", border: "none", outline: "none", borderBottom: "1.5px solid #7c6ff7", minWidth: 0, padding: "0 2px" }}
          />
        ) : (
          <span
            onClick={handleTitleClick}
            onDoubleClick={handleTitleDoubleClick}
            className={`flex-1 cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors ${
              isDone ? "line-through text-gray-300 dark:text-gray-600" : "text-gray-800 dark:text-gray-100"
            }`}
            style={{ fontSize: "0.9375rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
          >
            {task.title}
          </span>
        )}

        {/* Subtask count */}
        {task.subtasks?.length > 0 && (
          <span className="text-gray-400 dark:text-gray-600" style={{ fontSize: "0.75rem", flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>
            {task.subtasks.filter(s => s.status === "COMPLETED").length}/{task.subtasks.length}
          </span>
        )}

        {/* Tags — hide on mobile to save space */}
        {!isMobile && task.tags.slice(0, 2).map(({ tag }) => (
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

        {/* 2-min rule badge */}
        {isQuick && (
          <span title="Quick win — under 2 min" style={{ display: "flex", alignItems: "center", gap: "0.2rem", background: "rgba(34,197,94,0.12)", color: "#16a34a", borderRadius: "999px", padding: "0.125rem 0.5rem", fontSize: "0.625rem", fontWeight: 700, flexShrink: 0 }}>
            <Zap size={9} fill="#16a34a" /> {isMobile ? "2m" : "2min"}
          </span>
        )}

        {/* Days open — only on desktop */}
        {!isMobile && daysOpen >= 3 && (
          <span title={`Open for ${daysOpen} days`} style={{ background: daysOpen >= 7 ? "rgba(239,68,68,0.1)" : "rgba(251,146,60,0.1)", color: daysOpen >= 7 ? "#dc2626" : "#ea580c", borderRadius: "999px", padding: "0.125rem 0.5rem", fontSize: "0.625rem", fontWeight: 700, flexShrink: 0 }}>
            {daysOpen}d
          </span>
        )}

        {/* Recurrence indicator */}
        {task.recurrence && !isMobile && (
          <Repeat2 size={12} style={{ flexShrink: 0, color: "#7c6ff7", opacity: 0.7 }} />
        )}

        {/* Due date */}
        {due && (
          <span style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.75rem", fontWeight: 500, flexShrink: 0, color: due.color }}>
            <Calendar size={11} />
            {due.label}
          </span>
        )}

        {/* Priority star — hide LOW on mobile */}
        {(!isMobile || task.priority !== "LOW") && (
          <Star
            size={14}
            className={`flex-shrink-0 transition-opacity ${PRIORITY_FLAG[task.priority]} ${task.priority === "LOW" ? "opacity-0 group-hover:opacity-30" : ""}`}
            fill={task.priority === "HIGH" || task.priority === "CRITICAL" ? "currentColor" : "none"}
          />
        )}

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
