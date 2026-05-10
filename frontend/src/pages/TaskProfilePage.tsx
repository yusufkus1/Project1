import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import {
  ArrowLeft, Calendar, Clock, RefreshCw, Folder, Tag, Flag, Check,
  Plus, Trash2, Archive, Star, CheckSquare,
} from "lucide-react";
import { format, isPast, isToday } from "date-fns";
import { tasksApi, Task } from "../api/tasks";
import { projectsApi } from "../api/projects";
import { tagsApi } from "../api/tags";
import { useGamificationStore } from "../store/gamification";
import toast from "react-hot-toast";

const PRIORITY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  LOW:      { bg: "#f0fdf4", text: "#16a34a", border: "#86efac" },
  MEDIUM:   { bg: "#fefce8", text: "#ca8a04", border: "#fde047" },
  HIGH:     { bg: "#fff7ed", text: "#ea580c", border: "#fdba74" },
  CRITICAL: { bg: "#fef2f2", text: "#dc2626", border: "#fca5a5" },
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  PENDING:     { bg: "#f3f4f6", text: "#6b7280" },
  IN_PROGRESS: { bg: "#eff6ff", text: "#2563eb" },
  COMPLETED:   { bg: "#f0fdf4", text: "#16a34a" },
};

const XP_BY_PRIORITY: Record<string, number> = { LOW: 10, MEDIUM: 20, HIGH: 35, CRITICAL: 50 };

interface FormValues {
  title: string;
  description: string;
  status: string;
  priority: string;
  dueDate: string;
  reminder: string;
  projectId: string;
  recurrence: string;
  tagIds: string[];
}

export function TaskProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { completeTask, undoTask } = useGamificationStore();
  const [newSubtask, setNewSubtask] = useState("");

  const { data: task, isLoading } = useQuery<Task>({
    queryKey: ["tasks", id],
    queryFn: () => tasksApi.getOne(id!),
    enabled: !!id,
  });

  const { data: projects = [] } = useQuery({ queryKey: ["projects"], queryFn: projectsApi.getAll });
  const { data: tags = [] } = useQuery({ queryKey: ["tags"], queryFn: tagsApi.getAll });

  const { register, handleSubmit, watch, setValue } = useForm<FormValues>({
    values: task ? {
      title: task.title,
      description: task.description ?? "",
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate ? task.dueDate.slice(0, 16) : "",
      reminder: task.reminder ? task.reminder.slice(0, 16) : "",
      projectId: task.projectId ?? "",
      recurrence: task.recurrence ?? "",
      tagIds: task.tags.map((t) => t.tag.id),
    } : undefined,
  });

  const selectedTagIds = watch("tagIds") ?? [];

  const update = useMutation({
    mutationFn: (data: Partial<Task> & { tagIds?: string[] }) => tasksApi.update(id!, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks", id] }),
  });

  const toggleDone = useMutation({
    mutationFn: () => tasksApi.update(id!, {
      status: task?.status === "COMPLETED" ? "PENDING" : "COMPLETED",
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks", id] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
      if (task?.status !== "COMPLETED") {
        const { xpGained, leveledUp, newAchievements } = completeTask(task?.priority ?? "MEDIUM");
        toast.success(`+${xpGained} XP`, { icon: "⚡" });
        if (leveledUp) toast("Level up!", { icon: "⬆️", duration: 3000 });
        newAchievements.forEach((a) => toast(`${a.icon} ${a.title} unlocked!`, { duration: 3500 }));
      } else {
        undoTask(task?.priority ?? "MEDIUM");
      }
    },
  });

  const addSubtask = useMutation({
    mutationFn: () => tasksApi.create({ title: newSubtask.trim(), parentId: id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks", id] });
      setNewSubtask("");
    },
  });

  const toggleSubtask = useMutation({
    mutationFn: (sub: Task) => tasksApi.update(sub.id, {
      status: sub.status === "COMPLETED" ? "PENDING" : "COMPLETED",
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks", id] }),
  });

  const deleteTask = useMutation({
    mutationFn: () => tasksApi.delete(id!),
    onSuccess: () => { navigate(-1); toast.success("Task deleted"); },
  });

  const archiveTask = useMutation({
    mutationFn: () => tasksApi.update(id!, { isArchived: true }),
    onSuccess: () => { navigate(-1); toast.success("Archived"); },
  });

  const save = (data: FormValues) => update.mutate({
    title: data.title,
    description: data.description || undefined,
    status: data.status as Task["status"],
    priority: data.priority as Task["priority"],
    dueDate: data.dueDate || undefined,
    reminder: data.reminder || undefined,
    projectId: data.projectId || undefined,
    recurrence: (data.recurrence as Task["recurrence"]) || undefined,
    tagIds: data.tagIds,
  });

  const toggleTag = (tagId: string) => {
    const next = selectedTagIds.includes(tagId)
      ? selectedTagIds.filter((t) => t !== tagId)
      : [...selectedTagIds, tagId];
    setValue("tagIds", next);
    update.mutate({ tagIds: next });
  };

  if (isLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "50vh" }}>
        <div className="text-gray-400 dark:text-gray-500" style={{ fontSize: "0.875rem" }}>Loading…</div>
      </div>
    );
  }

  if (!task) return null;

  const isDone = task.status === "COMPLETED";
  const isOverdue = task.dueDate && isPast(new Date(task.dueDate)) && !isToday(new Date(task.dueDate)) && !isDone;
  const priorityStyle = PRIORITY_COLORS[task.priority] ?? PRIORITY_COLORS.MEDIUM;
  const statusStyle = STATUS_COLORS[task.status] ?? STATUS_COLORS.PENDING;
  const completedSubs = task.subtasks?.filter((s) => s.status === "COMPLETED").length ?? 0;
  const totalSubs = task.subtasks?.length ?? 0;

  const fieldInput: React.CSSProperties = {
    width: "100%", fontSize: "0.875rem", padding: "0.625rem 0.875rem",
    border: "1px solid", borderRadius: "0.625rem", outline: "none",
    transition: "border-color 0.15s",
  };

  const sectionTitle = (label: string, icon: React.ReactNode) => (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.875rem" }}>
      <span className="text-gray-400">{icon}</span>
      <span className="text-gray-500 dark:text-gray-400" style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase" }}>
        {label}
      </span>
    </div>
  );

  return (
    <div style={{ maxWidth: "52rem", margin: "0 auto" }}>

      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition"
        style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "2rem", fontSize: "0.875rem", background: "none", border: "none", cursor: "pointer", padding: 0 }}
      >
        <ArrowLeft size={16} />
        <span>Back</span>
      </button>

      <form onSubmit={handleSubmit(save)}>

        {/* Title + completion */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: "1.25rem", marginBottom: "2rem" }}>
          <button
            type="button"
            onClick={() => toggleDone.mutate()}
            style={{
              flexShrink: 0, width: "2rem", height: "2rem", borderRadius: "50%",
              border: "2px solid", marginTop: "0.25rem",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", transition: "all 0.2s",
              background: isDone ? "#6366f1" : "transparent",
              borderColor: isDone ? "#6366f1" : "#d1d5db",
            }}
          >
            {isDone && <Check size={14} strokeWidth={3} color="white" />}
          </button>

          <textarea
            rows={2}
            placeholder="Task title"
            className="text-gray-900 dark:text-white bg-transparent placeholder-gray-300 dark:placeholder-gray-600 focus:outline-none resize-none"
            style={{
              flex: 1, fontSize: "1.75rem", fontWeight: 700, lineHeight: 1.3,
              border: "none", textDecoration: isDone ? "line-through" : "none",
              color: isDone ? "#9ca3af" : undefined,
            }}
            {...register("title")}
            onBlur={handleSubmit(save)}
          />

          {/* Actions */}
          <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => archiveTask.mutate()}
              className="text-gray-400 hover:text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition rounded-lg"
              style={{ padding: "0.5rem", background: "none", border: "none", cursor: "pointer" }}
              title="Archive"
            >
              <Archive size={16} />
            </button>
            <button
              type="button"
              onClick={() => { if (confirm("Delete this task?")) deleteTask.mutate(); }}
              className="text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition rounded-lg"
              style={{ padding: "0.5rem", background: "none", border: "none", cursor: "pointer" }}
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {/* Badge row */}
        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "0.75rem", marginBottom: "3rem" }}>
          {/* Status */}
          <select
            {...register("status")}
            onChange={(e) => update.mutate({ status: e.target.value as Task["status"] })}
            style={{
              background: statusStyle.bg, color: statusStyle.text,
              border: "none", borderRadius: "999px", padding: "0.3125rem 0.875rem",
              fontSize: "0.8125rem", fontWeight: 600, cursor: "pointer", outline: "none",
            }}
          >
            <option value="PENDING">Pending</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
          </select>

          {/* Priority */}
          <select
            {...register("priority")}
            onChange={(e) => update.mutate({ priority: e.target.value as Task["priority"] })}
            style={{
              background: priorityStyle.bg, color: priorityStyle.text,
              border: `1px solid ${priorityStyle.border}`, borderRadius: "999px",
              padding: "0.3125rem 0.875rem", fontSize: "0.8125rem",
              fontWeight: 600, cursor: "pointer", outline: "none",
            }}
          >
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>

          {/* XP badge */}
          <span style={{
            display: "flex", alignItems: "center", gap: "0.3rem",
            background: "rgba(99,102,241,0.1)", color: "#6366f1",
            borderRadius: "999px", padding: "0.3125rem 0.875rem",
            fontSize: "0.8125rem", fontWeight: 600,
          }}>
            <Star size={12} fill="#6366f1" />
            +{XP_BY_PRIORITY[task.priority] ?? 20} XP
          </span>

          {/* Overdue */}
          {isOverdue && (
            <span style={{
              background: "#fef2f2", color: "#dc2626", borderRadius: "999px",
              padding: "0.3125rem 0.875rem", fontSize: "0.8125rem", fontWeight: 600,
            }}>
              Overdue
            </span>
          )}

          {/* Project */}
          {task.project && (
            <span style={{ display: "flex", alignItems: "center", gap: "0.375rem", fontSize: "0.8125rem", color: "#6b7280" }}>
              <span style={{ width: "0.625rem", height: "0.625rem", borderRadius: "2px", background: task.project.color, display: "inline-block" }} />
              {task.project.name}
            </span>
          )}

          {/* Tags */}
          {task.tags.map(({ tag }) => (
            <span key={tag.id} style={{
              background: tag.color + "20", color: tag.color,
              borderRadius: "999px", padding: "0.3125rem 0.875rem",
              fontSize: "0.8125rem", fontWeight: 500,
            }}>
              {tag.name}
            </span>
          ))}
        </div>

        {/* Two-column layout */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2.5rem", marginBottom: "3rem" }}>

          {/* Left: notes + subtasks */}
          <div style={{ display: "flex", flexDirection: "column", gap: "2.5rem" }}>

            {/* Notes */}
            <div>
              {sectionTitle("Notes", <AlignLeftIcon />)}
              <textarea
                rows={6}
                placeholder="Add notes, context, links…"
                className="bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 placeholder-gray-300 dark:placeholder-gray-600 focus:border-indigo-400 dark:focus:border-indigo-600 resize-none"
                style={{ ...fieldInput, lineHeight: 1.6 }}
                {...register("description")}
                onBlur={handleSubmit(save)}
              />
            </div>

            {/* Subtasks */}
            <div>
              {sectionTitle("Subtasks", <CheckSquare size={14} />)}
              {totalSubs > 0 && (
                <div style={{ marginBottom: "0.75rem" }}>
                  <div className="bg-gray-100 dark:bg-gray-800" style={{ borderRadius: "999px", height: "0.375rem", marginBottom: "0.5rem" }}>
                    <div style={{ background: "#6366f1", borderRadius: "999px", height: "100%", width: `${(completedSubs / totalSubs) * 100}%`, transition: "width 0.4s" }} />
                  </div>
                  <span className="text-gray-400 dark:text-gray-500" style={{ fontSize: "0.75rem" }}>
                    {completedSubs} / {totalSubs} completed
                  </span>
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem", marginBottom: "0.75rem" }}>
                {task.subtasks?.map((sub) => (
                  <div
                    key={sub.id}
                    style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.625rem 0.875rem", borderRadius: "0.625rem", cursor: "pointer" }}
                    className="bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition"
                    onClick={() => toggleSubtask.mutate(sub)}
                  >
                    <div style={{
                      width: "1.125rem", height: "1.125rem", borderRadius: "50%", border: "2px solid", flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: sub.status === "COMPLETED" ? "#6366f1" : "transparent",
                      borderColor: sub.status === "COMPLETED" ? "#6366f1" : "#d1d5db",
                    }}>
                      {sub.status === "COMPLETED" && <Check size={9} strokeWidth={3} color="white" />}
                    </div>
                    <span
                      className="text-gray-700 dark:text-gray-300"
                      style={{ fontSize: "0.875rem", textDecoration: sub.status === "COMPLETED" ? "line-through" : "none", opacity: sub.status === "COMPLETED" ? 0.5 : 1 }}
                    >
                      {sub.title}
                    </span>
                  </div>
                ))}
              </div>

              {/* Add subtask */}
              <div className="bg-white dark:bg-gray-900" style={{ display: "flex", alignItems: "center", gap: "0.625rem", padding: "0.625rem 0.875rem", borderRadius: "0.625rem", border: "1px dashed" }} >
                <Plus size={14} className="text-gray-400" style={{ flexShrink: 0 }} />
                <input
                  value={newSubtask}
                  onChange={(e) => setNewSubtask(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newSubtask.trim()) { e.preventDefault(); addSubtask.mutate(); }
                  }}
                  placeholder="Add subtask…"
                  className="bg-transparent text-gray-700 dark:text-gray-300 placeholder-gray-300 dark:placeholder-gray-600 focus:outline-none"
                  style={{ flex: 1, fontSize: "0.875rem", border: "none", outline: "none" }}
                />
              </div>
            </div>
          </div>

          {/* Right: metadata */}
          <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>

            {/* Due Date */}
            <div>
              {sectionTitle("Due Date", <Calendar size={14} />)}
              <input
                type="datetime-local"
                {...register("dueDate")}
                onBlur={handleSubmit(save)}
                className="bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 focus:border-indigo-400 dark:focus:border-indigo-600"
                style={fieldInput}
              />
            </div>

            {/* Reminder */}
            <div>
              {sectionTitle("Reminder", <Clock size={14} />)}
              <input
                type="datetime-local"
                {...register("reminder")}
                onBlur={handleSubmit(save)}
                className="bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 focus:border-indigo-400 dark:focus:border-indigo-600"
                style={fieldInput}
              />
            </div>

            {/* Repeat */}
            <div>
              {sectionTitle("Repeat", <RefreshCw size={14} />)}
              <select
                {...register("recurrence")}
                onChange={(e) => update.mutate({ recurrence: (e.target.value as Task["recurrence"]) || undefined })}
                className="bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 focus:border-indigo-400"
                style={fieldInput}
              >
                <option value="">Does not repeat</option>
                <option value="DAILY">Daily</option>
                <option value="WEEKLY">Weekly</option>
                <option value="MONTHLY">Monthly</option>
                <option value="YEARLY">Yearly</option>
              </select>
            </div>

            {/* List */}
            <div>
              {sectionTitle("List", <Folder size={14} />)}
              <select
                {...register("projectId")}
                onChange={(e) => update.mutate({ projectId: e.target.value || undefined })}
                className="bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 focus:border-indigo-400"
                style={fieldInput}
              >
                <option value="">No list</option>
                {projects.map((p: { id: string; name: string }) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* Tags */}
            {tags.length > 0 && (
              <div>
                {sectionTitle("Tags", <Tag size={14} />)}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                  {tags.map((tag: { id: string; name: string; color: string }) => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(tag.id)}
                      style={{
                        padding: "0.375rem 0.875rem", borderRadius: "999px",
                        fontSize: "0.8125rem", fontWeight: 500, cursor: "pointer",
                        border: "none", transition: "all 0.15s",
                        background: selectedTagIds.includes(tag.id) ? tag.color : "rgba(156,163,175,0.12)",
                        color: selectedTagIds.includes(tag.id) ? "white" : "#6b7280",
                      }}
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Timestamps */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", paddingTop: "0.5rem" }}>
              {task.createdAt && (
                <p className="text-gray-400 dark:text-gray-600" style={{ fontSize: "0.75rem" }}>
                  Created {format(new Date(task.createdAt), "MMM d, yyyy · HH:mm")}
                </p>
              )}
              {task.completedAt && (
                <p className="text-gray-400 dark:text-gray-600" style={{ fontSize: "0.75rem" }}>
                  Completed {format(new Date(task.completedAt), "MMM d, yyyy · HH:mm")}
                </p>
              )}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

function AlignLeftIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="21" y1="10" x2="3" y2="10" /><line x1="21" y1="6" x2="3" y2="6" />
      <line x1="21" y1="14" x2="3" y2="14" /><line x1="9" y1="18" x2="3" y2="18" />
    </svg>
  );
}
