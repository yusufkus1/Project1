import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import {
  ArrowLeft, Calendar, Clock, RefreshCw, Folder, Tag, Check,
  Plus, Trash2, Archive, Star, CheckSquare, Timer, Play, Sparkles, X, Loader2,
} from "lucide-react";
import { format, isPast, isToday } from "date-fns";
import { tasksApi, Task } from "../api/tasks";
import { projectsApi } from "../api/projects";
import { tagsApi } from "../api/tags";
import { aiApi, AIAnalysis } from "../api/ai";
import { useGamificationStore } from "../store/gamification";
import { useFocusStore } from "../store/focus";
import { RichTextEditor } from "../components/ui/RichTextEditor";
import { AttachmentSection } from "../components/tasks/AttachmentSection";
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
  status: string;
  priority: string;
  dueDate: string;
  reminder: string;
  projectId: string;
  recurrence: string;
  tagIds: string[];
}

function SectionHeader({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "1.25rem" }}>
      <div style={{
        width: "2rem", height: "2rem", borderRadius: "0.5rem",
        background: "rgba(99,102,241,0.1)",
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        <span style={{ color: "#6366f1" }}>{icon}</span>
      </div>
      <span className="text-gray-800 dark:text-gray-200" style={{ fontSize: "0.9375rem", fontWeight: 700 }}>
        {label}
      </span>
    </div>
  );
}

function Divider() {
  return <div className="border-t border-gray-100 dark:border-gray-800" style={{ margin: "0.25rem 0" }} />;
}

export function TaskProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { completeTask, undoTask } = useGamificationStore();
  const focusSessions = useFocusStore((s) => s.sessions);
  const focusStatus = useFocusStore((s) => s.status);
  const focusCurrentTaskId = useFocusStore((s) => s.currentTaskId);
  const setFocusTask = useFocusStore((s) => s.setTask);
  const [newSubtask, setNewSubtask] = useState("");
  const [descriptionHtml, setDescriptionHtml] = useState<string | null>(null);
  const [estimateVal, setEstimateVal] = useState<string>("");
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const [breakdownText, setBreakdownText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<AIAnalysis | null>(null);

  const { data: task, isLoading } = useQuery<Task>({
    queryKey: ["task", id],
    queryFn: () => tasksApi.getOne(id!),
    enabled: !!id,
  });

  const { data: projects = [] } = useQuery({ queryKey: ["projects"], queryFn: projectsApi.getAll });
  const { data: tags = [] } = useQuery({ queryKey: ["tags"], queryFn: tagsApi.getAll });

  const { register, handleSubmit, watch, setValue } = useForm<FormValues>({
    values: task ? {
      title: task.title,
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

  useEffect(() => {
    if (task) setEstimateVal(task.estimatedMinutes != null ? String(task.estimatedMinutes) : "");
  }, [task?.estimatedMinutes]);

  const currentDescription = descriptionHtml ?? (task?.description ?? "");

  const update = useMutation({
    mutationFn: (data: Partial<Task> & { tagIds?: string[] }) => tasksApi.update(id!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["task", id] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  const saveDescription = () => {
    update.mutate({ description: currentDescription || undefined });
  };

  const toggleDone = useMutation({
    mutationFn: () => tasksApi.update(id!, {
      status: task?.status === "COMPLETED" ? "PENDING" : "COMPLETED",
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["task", id] });
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
      qc.invalidateQueries({ queryKey: ["task", id] });
      setNewSubtask("");
    },
  });

  const bulkAddSubtasks = async () => {
    const titles = breakdownText.split("\n").map((l) => l.trim()).filter(Boolean);
    if (!titles.length) return;
    await Promise.all(titles.map((title) => tasksApi.create({ title, parentId: id })));
    qc.invalidateQueries({ queryKey: ["task", id] });
    setBreakdownText("");
    setBreakdownOpen(false);
  };

  const toggleSubtask = useMutation({
    mutationFn: (sub: Task) => tasksApi.update(sub.id, {
      status: sub.status === "COMPLETED" ? "PENDING" : "COMPLETED",
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["task", id] }),
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

  const runAiAnalysis = async () => {
    if (!task) return;
    setAiLoading(true);
    setAiSuggestion(null);
    try {
      const desc = descriptionHtml ?? task.description ?? "";
      const result = await aiApi.analyzeTask(task.title, desc);
      setAiSuggestion(result);
    } catch {
      toast.error("AI analysis failed");
    } finally {
      setAiLoading(false);
    }
  };

  const applyAiSuggestion = () => {
    if (!aiSuggestion) return;
    setValue("priority", aiSuggestion.priority);
    setEstimateVal(String(aiSuggestion.estimatedMinutes));
    update.mutate({
      priority: aiSuggestion.priority,
      estimatedMinutes: aiSuggestion.estimatedMinutes,
    });
    toast.success(`Applied: ${aiSuggestion.priority} priority, ${aiSuggestion.estimatedMinutes}m estimate`);
    setAiSuggestion(null);
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
    width: "100%", fontSize: "0.9375rem", padding: "0.875rem 1.125rem",
    borderRadius: "0.875rem", outline: "none",
    transition: "border-color 0.15s", border: "1px solid",
  };

  return (
    <div style={{ maxWidth: "64rem", display: "flex", flexDirection: "column", gap: "0" }}>

      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition"
        style={{
          display: "inline-flex", alignItems: "center", gap: "0.5rem",
          marginBottom: "1.75rem", fontSize: "0.875rem", fontWeight: 500,
          background: "none", border: "none", cursor: "pointer", padding: 0,
        }}
      >
        <ArrowLeft size={16} />
        Back
      </button>

      <form onSubmit={handleSubmit(save)}>

        {/* ── Hero card ─────────────────────────────────────────── */}
        <div
          className="bg-white dark:bg-gray-900"
          style={{ borderRadius: "1.25rem", padding: "2rem 2.5rem", marginBottom: "1.75rem" }}
        >
          {/* Title */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: "1.125rem", marginBottom: "1.5rem" }}>
            <button
              type="button"
              onClick={() => toggleDone.mutate()}
              style={{
                flexShrink: 0, width: "2.375rem", height: "2.375rem",
                borderRadius: "50%", border: "2.5px solid", marginTop: "0.3rem",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", transition: "all 0.2s",
                background: isDone ? "#6366f1" : "transparent",
                borderColor: isDone ? "#6366f1" : "#d1d5db",
                boxShadow: isDone ? "0 0 0 4px rgba(99,102,241,0.15)" : "none",
              }}
            >
              {isDone && <Check size={14} strokeWidth={3} color="white" />}
            </button>

            <textarea
              rows={2}
              placeholder="Task title"
              className="text-gray-900 dark:text-white bg-transparent placeholder-gray-300 dark:placeholder-gray-600 focus:outline-none resize-none"
              style={{
                flex: 1, fontSize: "1.75rem", fontWeight: 800, lineHeight: 1.3,
                border: "none",
                textDecoration: isDone ? "line-through" : "none",
                opacity: isDone ? 0.5 : 1,
              }}
              {...register("title")}
              onBlur={handleSubmit(save)}
            />
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", paddingLeft: "3.5rem", marginBottom: "1.625rem", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => { setFocusTask(task.id, task.title); navigate("/focus"); }}
              style={{
                display: "flex", alignItems: "center", gap: "0.5rem",
                padding: "0.625rem 1.25rem", borderRadius: "0.75rem",
                background: "#6366f1", color: "white", border: "none",
                fontSize: "0.875rem", fontWeight: 600, cursor: "pointer",
                boxShadow: "0 4px 14px rgba(99,102,241,0.3)",
              }}
            >
              <Play size={13} fill="white" />
              Focus
            </button>

            {/* AI Analyze button */}
            <button
              type="button"
              onClick={runAiAnalysis}
              disabled={aiLoading}
              style={{
                display: "flex", alignItems: "center", gap: "0.5rem",
                padding: "0.625rem 1.25rem", borderRadius: "0.75rem",
                background: "rgba(139,92,246,0.1)", color: "#8b5cf6",
                border: "1.5px solid rgba(139,92,246,0.25)",
                fontSize: "0.875rem", fontWeight: 600,
                cursor: aiLoading ? "default" : "pointer", transition: "all 0.15s",
              }}
              title="AI analyzes this task and suggests priority + time estimate"
            >
              {aiLoading
                ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
                : <Sparkles size={14} />}
              {aiLoading ? "Analyzing…" : "AI Analyze"}
            </button>

            <button
              type="button"
              onClick={() => archiveTask.mutate()}
              className="text-gray-400 hover:text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition rounded-xl"
              style={{ padding: "0.625rem", background: "none", border: "none", cursor: "pointer" }}
              title="Archive"
            >
              <Archive size={18} />
            </button>
            <button
              type="button"
              onClick={() => { if (confirm("Delete this task?")) deleteTask.mutate(); }}
              className="text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition rounded-xl"
              style={{ padding: "0.625rem", background: "none", border: "none", cursor: "pointer" }}
            >
              <Trash2 size={18} />
            </button>
          </div>

          {/* AI suggestion card */}
          {aiSuggestion && (
            <div style={{
              marginBottom: "1.25rem", borderRadius: "1rem",
              padding: "1rem 1.25rem",
              background: "rgba(139,92,246,0.06)",
              border: "1.5px solid rgba(139,92,246,0.25)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.625rem" }}>
                <Sparkles size={14} style={{ color: "#8b5cf6" }} />
                <span style={{ fontWeight: 700, fontSize: "0.8125rem", color: "#8b5cf6", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  AI Suggestion
                </span>
                <button onClick={() => setAiSuggestion(null)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", padding: "0.125rem" }} className="text-gray-400 hover:text-gray-600">
                  <X size={13} />
                </button>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.625rem" }}>
                <span style={{
                  padding: "0.25rem 0.75rem", borderRadius: "999px", fontSize: "0.8125rem", fontWeight: 700,
                  background: `${PRIORITY_COLORS[aiSuggestion.priority]?.bg}`,
                  color: PRIORITY_COLORS[aiSuggestion.priority]?.text,
                }}>
                  ↑ {aiSuggestion.priority.charAt(0) + aiSuggestion.priority.slice(1).toLowerCase()} priority
                </span>
                <span style={{ padding: "0.25rem 0.75rem", borderRadius: "999px", fontSize: "0.8125rem", fontWeight: 700, background: "rgba(245,158,11,0.1)", color: "#d97706" }}>
                  ⏱ {aiSuggestion.estimatedMinutes < 60 ? `${aiSuggestion.estimatedMinutes} min` : `${Math.floor(aiSuggestion.estimatedMinutes / 60)}h ${aiSuggestion.estimatedMinutes % 60}m`}
                </span>
                <span style={{ padding: "0.25rem 0.75rem", borderRadius: "999px", fontSize: "0.8125rem", fontWeight: 700, background: "rgba(99,102,241,0.1)", color: "#6366f1" }}>
                  +{aiSuggestion.xpReward} XP on completion
                </span>
              </div>

              <p style={{ fontSize: "0.8125rem", color: "#6b7280", fontStyle: "italic", marginBottom: "0.875rem" }}>
                {aiSuggestion.rationale}
              </p>

              <button
                type="button"
                onClick={applyAiSuggestion}
                style={{
                  padding: "0.5rem 1.25rem", borderRadius: "0.625rem",
                  background: "#8b5cf6", color: "white", border: "none",
                  fontSize: "0.8125rem", fontWeight: 700, cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(139,92,246,0.3)",
                }}
              >
                Apply suggestion
              </button>
            </div>
          )}

          {/* Badge pills */}
          <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "0.5rem", paddingLeft: "3.5rem" }}>
            <select
              {...register("status")}
              onChange={(e) => update.mutate({ status: e.target.value as Task["status"] })}
              style={{
                background: statusStyle.bg, color: statusStyle.text,
                border: "none", borderRadius: "999px", padding: "0.375rem 1rem",
                fontSize: "0.8125rem", fontWeight: 600, cursor: "pointer", outline: "none",
              }}
            >
              <option value="PENDING">Pending</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
            </select>

            <select
              {...register("priority")}
              onChange={(e) => update.mutate({ priority: e.target.value as Task["priority"] })}
              style={{
                background: priorityStyle.bg, color: priorityStyle.text,
                border: `1px solid ${priorityStyle.border}`, borderRadius: "999px",
                padding: "0.375rem 1rem", fontSize: "0.8125rem",
                fontWeight: 600, cursor: "pointer", outline: "none",
              }}
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>

            <span style={{
              display: "flex", alignItems: "center", gap: "0.3rem",
              background: "rgba(99,102,241,0.1)", color: "#6366f1",
              borderRadius: "999px", padding: "0.375rem 1rem",
              fontSize: "0.8125rem", fontWeight: 600,
            }}>
              <Star size={12} fill="#6366f1" />
              +{XP_BY_PRIORITY[task.priority] ?? 20} XP
            </span>

            {isOverdue && (
              <span style={{
                background: "#fef2f2", color: "#dc2626", borderRadius: "999px",
                padding: "0.375rem 1rem", fontSize: "0.8125rem", fontWeight: 600,
              }}>
                Overdue
              </span>
            )}

            {task.project && (
              <span style={{
                display: "flex", alignItems: "center", gap: "0.375rem",
                background: task.project.color + "18",
                borderRadius: "999px", padding: "0.375rem 1rem",
                fontSize: "0.8125rem", fontWeight: 500, color: "#6b7280",
              }}>
                <span style={{ width: "0.5rem", height: "0.5rem", borderRadius: "3px", background: task.project.color, display: "inline-block", flexShrink: 0 }} />
                {task.project.name}
              </span>
            )}

            {task.tags.map(({ tag }) => (
              <span key={tag.id} style={{
                background: tag.color + "20", color: tag.color,
                borderRadius: "999px", padding: "0.375rem 1rem",
                fontSize: "0.8125rem", fontWeight: 500,
              }}>
                {tag.name}
              </span>
            ))}
          </div>
        </div>

        {/* ── Two-column layout ─────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6" style={{ marginBottom: "3rem" }}>

          {/* ── Left: Notes · Attachments · Subtasks ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

            {/* Notes card */}
            <div
              className="bg-white dark:bg-gray-900"
              style={{ borderRadius: "1rem", padding: "1.75rem 2rem" }}
            >
              <SectionHeader icon={<AlignLeftIcon />} label="Notes" />
              <RichTextEditor
                value={currentDescription}
                onChange={(html) => setDescriptionHtml(html)}
                onBlur={saveDescription}
                placeholder="Add notes, context, links…"
              />
            </div>

            {/* Attachments card */}
            <div
              className="bg-white dark:bg-gray-900"
              style={{ borderRadius: "1rem", padding: "1.75rem 2rem" }}
            >
              <AttachmentSection taskId={id!} attachments={task.attachments ?? []} />
            </div>

            {/* Subtasks card */}
            <div
              className="bg-white dark:bg-gray-900"
              style={{ borderRadius: "1rem", padding: "1.75rem 2rem" }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                  <div style={{ width: "2rem", height: "2rem", borderRadius: "0.5rem", background: "rgba(99,102,241,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ color: "#6366f1" }}><CheckSquare size={15} /></span>
                  </div>
                  <span className="text-gray-800 dark:text-gray-200" style={{ fontSize: "0.9375rem", fontWeight: 700 }}>Subtasks</span>
                </div>
                {totalSubs === 0 && (
                  <button
                    onClick={() => setBreakdownOpen(true)}
                    style={{ display: "flex", alignItems: "center", gap: "0.375rem", padding: "0.375rem 0.875rem", borderRadius: "0.625rem", border: "none", cursor: "pointer", background: "rgba(99,102,241,0.1)", color: "#6366f1", fontSize: "0.8125rem", fontWeight: 600 }}
                    className="hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition"
                  >
                    <Sparkles size={13} /> Break it down
                  </button>
                )}
              </div>

              {/* Breakdown modal */}
              {breakdownOpen && (
                <div style={{ marginBottom: "1rem", background: "rgba(99,102,241,0.05)", borderRadius: "0.875rem", padding: "1rem" }}>
                  <p className="text-gray-600 dark:text-gray-400" style={{ fontSize: "0.8125rem", marginBottom: "0.625rem", fontWeight: 500 }}>One step per line:</p>
                  <textarea
                    value={breakdownText}
                    onChange={(e) => setBreakdownText(e.target.value)}
                    placeholder={"Research options\nDraft outline\nReview with team\nFinalize"}
                    autoFocus
                    rows={5}
                    className="bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-300 dark:placeholder-gray-600 focus:outline-none border-gray-200 dark:border-gray-700"
                    style={{ width: "100%", borderRadius: "0.625rem", padding: "0.75rem", fontSize: "0.875rem", resize: "vertical", border: "1px solid", boxSizing: "border-box", lineHeight: 1.6 }}
                  />
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.625rem" }}>
                    <button onClick={() => { setBreakdownOpen(false); setBreakdownText(""); }} style={{ padding: "0.5rem 1rem", borderRadius: "0.625rem", border: "none", cursor: "pointer", fontSize: "0.8125rem", fontWeight: 500, background: "transparent" }} className="text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition">Cancel</button>
                    <button onClick={bulkAddSubtasks} style={{ padding: "0.5rem 1.25rem", borderRadius: "0.625rem", border: "none", cursor: "pointer", background: "#6366f1", color: "white", fontSize: "0.8125rem", fontWeight: 700 }}>Add steps</button>
                  </div>
                </div>
              )}

              {totalSubs > 0 && (
                <div style={{ marginBottom: "1rem" }}>
                  <div className="bg-gray-100 dark:bg-gray-800" style={{ borderRadius: "999px", height: "0.375rem", marginBottom: "0.5rem" }}>
                    <div style={{
                      background: "#6366f1", borderRadius: "999px", height: "100%",
                      width: `${(completedSubs / totalSubs) * 100}%`, transition: "width 0.4s",
                    }} />
                  </div>
                  <span className="text-gray-400 dark:text-gray-500" style={{ fontSize: "0.75rem" }}>
                    {completedSubs} / {totalSubs} completed
                  </span>
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem", marginBottom: "0.875rem" }}>
                {task.subtasks?.map((sub) => (
                  <div
                    key={sub.id}
                    style={{ display: "flex", alignItems: "center", gap: "0.875rem", padding: "0.75rem 1rem", borderRadius: "0.75rem", cursor: "pointer" }}
                    className="bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
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
                      style={{
                        fontSize: "0.875rem",
                        textDecoration: sub.status === "COMPLETED" ? "line-through" : "none",
                        opacity: sub.status === "COMPLETED" ? 0.5 : 1,
                      }}
                    >
                      {sub.title}
                    </span>
                  </div>
                ))}
              </div>

              <div
                className="border-gray-200 dark:border-gray-700"
                style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem 1rem", borderRadius: "0.75rem", border: "1.5px dashed" }}
              >
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

          {/* ── Right: Metadata · Tags · Focus History ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

            {/* Metadata card */}
            <div
              className="bg-white dark:bg-gray-900"
              style={{ borderRadius: "1rem", padding: "1.75rem 2rem" }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

                <div>
                  <SectionHeader icon={<Calendar size={15} />} label="Due Date" />
                  <input
                    type="datetime-local"
                    {...register("dueDate")}
                    onBlur={handleSubmit(save)}
                    className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 focus:border-indigo-400 dark:focus:border-indigo-500"
                    style={fieldInput}
                  />
                </div>

                <Divider />

                <div>
                  <SectionHeader icon={<Clock size={15} />} label="Reminder" />
                  <input
                    type="datetime-local"
                    {...register("reminder")}
                    onBlur={handleSubmit(save)}
                    className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 focus:border-indigo-400 dark:focus:border-indigo-500"
                    style={fieldInput}
                  />
                </div>

                <Divider />

                <div>
                  <SectionHeader icon={<Timer size={15} />} label="Estimate" />
                  <select
                    value={estimateVal}
                    onChange={(e) => {
                      setEstimateVal(e.target.value);
                      update.mutate({ estimatedMinutes: e.target.value ? Number(e.target.value) : undefined });
                    }}
                    className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 focus:border-indigo-400"
                    style={fieldInput}
                  >
                    <option value="">No estimate</option>
                    {[15, 30, 45, 60, 90, 120, 180, 240, 300, 480].map((m) => (
                      <option key={m} value={m}>
                        {m < 60 ? `${m} min` : `${m / 60}h${m % 60 ? ` ${m % 60}min` : ""}`}
                      </option>
                    ))}
                  </select>
                </div>

                <Divider />

                <div>
                  <SectionHeader icon={<RefreshCw size={15} />} label="Repeat" />
                  <select
                    {...register("recurrence")}
                    onChange={(e) => update.mutate({ recurrence: (e.target.value as Task["recurrence"]) || undefined })}
                    className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 focus:border-indigo-400"
                    style={fieldInput}
                  >
                    <option value="">Does not repeat</option>
                    <option value="DAILY">Daily</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="MONTHLY">Monthly</option>
                    <option value="YEARLY">Yearly</option>
                  </select>
                </div>

                <Divider />

                <div>
                  <SectionHeader icon={<Folder size={15} />} label="List" />
                  <select
                    {...register("projectId")}
                    onChange={(e) => update.mutate({ projectId: e.target.value || undefined })}
                    className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 focus:border-indigo-400"
                    style={fieldInput}
                  >
                    <option value="">No list</option>
                    {projects.map((p: { id: string; name: string }) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Tags card */}
            {tags.length > 0 && (
              <div
                className="bg-white dark:bg-gray-900"
                style={{ borderRadius: "1rem", padding: "1.75rem 2rem" }}
              >
                <SectionHeader icon={<Tag size={15} />} label="Tags" />
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                  {tags.map((tag: { id: string; name: string; color: string }) => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(tag.id)}
                      style={{
                        padding: "0.5rem 1rem", borderRadius: "999px",
                        fontSize: "0.875rem", fontWeight: 500, cursor: "pointer",
                        border: "none", transition: "all 0.15s",
                        background: selectedTagIds.includes(tag.id) ? tag.color : "rgba(156,163,175,0.12)",
                        color: selectedTagIds.includes(tag.id) ? "white" : "#6b7280",
                        boxShadow: selectedTagIds.includes(tag.id) ? `0 2px 8px ${tag.color}40` : "none",
                      }}
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Focus History card */}
            <div
              className="bg-white dark:bg-gray-900"
              style={{ borderRadius: "1rem", padding: "1.75rem 2rem" }}
            >
              <FocusHistory
                taskId={id!}
                taskTitle={task.title}
                sessions={focusSessions}
                isRunning={focusStatus === "running" && focusCurrentTaskId === id}
                onStartFocus={() => { setFocusTask(task.id, task.title); navigate("/focus"); }}
                estimatedMinutes={task.estimatedMinutes}
              />
            </div>

            {/* Timestamps */}
            {(task.createdAt || task.completedAt) && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem", paddingLeft: "0.25rem" }}>
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
            )}
          </div>
        </div>
      </form>
    </div>
  );
}

// ─── Focus History ────────────────────────────────────────────────────────────
import type { FocusSession } from "../store/focus";

function fmtMins(mins: number) {
  if (mins === 0) return "0 min";
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function FocusHistory({
  taskId, taskTitle, sessions, isRunning, onStartFocus, estimatedMinutes,
}: {
  taskId: string;
  taskTitle: string;
  sessions: FocusSession[];
  isRunning: boolean;
  onStartFocus: () => void;
  estimatedMinutes?: number;
}) {
  const taskSessions = sessions.filter((s) => s.taskId === taskId);
  const workSessions    = taskSessions.filter((s) => s.type === "work" && !s.interrupted);
  const shortBreaks     = taskSessions.filter((s) => s.type === "short_break");
  const longBreaks      = taskSessions.filter((s) => s.type === "long_break");
  const interruptedWork = taskSessions.filter((s) => s.type === "work" && s.interrupted);

  const focusMins  = workSessions.reduce((a, s) => a + s.duration, 0);
  const breakMins  = [...shortBreaks, ...longBreaks].reduce((a, s) => a + s.duration, 0);
  const totalMins  = focusMins + breakMins;
  const totalCount = taskSessions.length;

  const rows = [
    { emoji: "🍅", label: "Focus sessions",  count: workSessions.length,      mins: focusMins,  show: true },
    { emoji: "☕", label: "Short breaks",     count: shortBreaks.length,       mins: shortBreaks.reduce((a,s)=>a+s.duration,0),    show: shortBreaks.length > 0 },
    { emoji: "🛌", label: "Long breaks",      count: longBreaks.length,        mins: longBreaks.reduce((a,s)=>a+s.duration,0),     show: longBreaks.length > 0 },
    { emoji: "⚡", label: "Interrupted",      count: interruptedWork.length,   mins: interruptedWork.reduce((a,s)=>a+s.duration,0), show: interruptedWork.length > 0 },
  ];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "1.25rem" }}>
        <div style={{
          width: "2rem", height: "2rem", borderRadius: "0.5rem",
          background: "rgba(99,102,241,0.1)",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <Timer size={15} style={{ color: "#6366f1" }} />
        </div>
        <span className="text-gray-800 dark:text-gray-200" style={{ fontSize: "0.9375rem", fontWeight: 700, flex: 1 }}>
          Focus History
        </span>
        {isRunning && (
          <span style={{
            display: "flex", alignItems: "center", gap: "0.3rem",
            background: "rgba(99,102,241,0.1)", color: "#6366f1",
            borderRadius: "999px", padding: "0.25rem 0.75rem",
            fontSize: "0.6875rem", fontWeight: 700,
          }}>
            <span style={{ width: "0.4rem", height: "0.4rem", borderRadius: "50%", background: "#6366f1", animation: "pulse 2s infinite" }} />
            In progress
          </span>
        )}
      </div>

      {/* Estimated vs Actual */}
      {estimatedMinutes && (
        <div
          className="bg-gray-50 dark:bg-gray-800/50"
          style={{ borderRadius: "0.875rem", padding: "1rem 1.25rem", marginBottom: "1rem" }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
            <span className="text-gray-500 dark:text-gray-400" style={{ fontSize: "0.75rem", fontWeight: 600 }}>Estimated</span>
            <span className="text-gray-500 dark:text-gray-400" style={{ fontSize: "0.75rem", fontWeight: 600 }}>Actual</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.75rem" }}>
            <span className="text-gray-800 dark:text-white" style={{ fontSize: "1.125rem", fontWeight: 700 }}>{fmtMins(estimatedMinutes)}</span>
            <span style={{ fontSize: "1.125rem", fontWeight: 700, color: focusMins > estimatedMinutes ? "#ef4444" : "#10b981" }}>
              {fmtMins(focusMins)}
            </span>
          </div>
          <div className="bg-gray-200 dark:bg-gray-700" style={{ borderRadius: "999px", height: "6px", overflow: "hidden" }}>
            <div style={{
              height: "100%", borderRadius: "999px", transition: "width 0.4s ease",
              width: `${Math.min(100, Math.round((focusMins / estimatedMinutes) * 100))}%`,
              background: focusMins > estimatedMinutes ? "#ef4444" : "#6366f1",
            }} />
          </div>
          <p style={{ fontSize: "0.6875rem", marginTop: "0.5rem", textAlign: "right" }}
            className={focusMins > estimatedMinutes ? "text-red-400" : "text-gray-400"}>
            {focusMins === 0 ? "Not started"
              : focusMins > estimatedMinutes ? `+${fmtMins(focusMins - estimatedMinutes)} over estimate`
              : focusMins === estimatedMinutes ? "On track"
              : `${fmtMins(estimatedMinutes - focusMins)} remaining`}
          </p>
        </div>
      )}

      {totalCount === 0 && !isRunning ? (
        <div
          className="bg-gray-50 dark:bg-gray-800/40"
          style={{ borderRadius: "0.875rem", padding: "1.5rem", textAlign: "center" }}
        >
          <p className="text-gray-300 dark:text-gray-700" style={{ fontSize: "0.875rem" }}>No focus sessions yet</p>
        </div>
      ) : (
        <div
          className="bg-gray-50 dark:bg-gray-800/40"
          style={{ borderRadius: "0.875rem", overflow: "hidden" }}
        >
          {rows.filter((r) => r.show).map((r, i, arr) => (
            <div
              key={r.label}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "0.75rem 1.125rem",
                borderBottom: i < arr.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ fontSize: "0.875rem" }}>{r.emoji}</span>
                <span className="text-gray-600 dark:text-gray-400" style={{ fontSize: "0.875rem" }}>{r.label}</span>
              </div>
              <div style={{ textAlign: "right" }}>
                <span className="text-gray-900 dark:text-white" style={{ fontSize: "0.875rem", fontWeight: 700 }}>
                  {r.count}×
                </span>
                {r.mins > 0 && (
                  <span className="text-gray-400 dark:text-gray-500" style={{ fontSize: "0.75rem", marginLeft: "0.375rem" }}>
                    {fmtMins(r.mins)}
                  </span>
                )}
              </div>
            </div>
          ))}
          <div
            className="bg-white dark:bg-gray-900"
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.875rem 1.125rem", borderTop: "1px solid rgba(0,0,0,0.06)" }}
          >
            <span className="text-gray-500 dark:text-gray-400" style={{ fontSize: "0.875rem", fontWeight: 600 }}>Total</span>
            <span className="text-indigo-600 dark:text-indigo-400" style={{ fontSize: "0.875rem", fontWeight: 700 }}>
              {fmtMins(totalMins)} · {totalCount} sessions
            </span>
          </div>
        </div>
      )}

      <button
        onClick={onStartFocus}
        className="hover:opacity-90 transition"
        style={{
          marginTop: "1rem", width: "100%",
          display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
          padding: "0.75rem 1rem", borderRadius: "0.875rem",
          background: "rgba(99,102,241,0.08)", color: "#6366f1",
          border: "1.5px solid rgba(99,102,241,0.2)", cursor: "pointer",
          fontSize: "0.9375rem", fontWeight: 600,
        }}
      >
        <Play size={14} fill="#6366f1" />
        Start focusing on this task
      </button>
    </div>
  );
}

function AlignLeftIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="21" y1="10" x2="3" y2="10" /><line x1="21" y1="6" x2="3" y2="6" />
      <line x1="21" y1="14" x2="3" y2="14" /><line x1="9" y1="18" x2="3" y2="18" />
    </svg>
  );
}
