import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { X, Trash2, Archive, Calendar, Clock, RefreshCw, AlignLeft, Tag, Folder, Flag, CheckSquare, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { tasksApi, Task } from "../../api/tasks";
import { projectsApi } from "../../api/projects";
import { tagsApi } from "../../api/tags";
import { useUIStore } from "../../store/ui";
import toast from "react-hot-toast";

const PRIORITY_OPTIONS = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "CRITICAL", label: "Critical" },
];

const STATUS_OPTIONS = [
  { value: "PENDING", label: "Pending" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "COMPLETED", label: "Completed" },
];

const RECURRENCE_OPTIONS = [
  { value: "", label: "Does not repeat" },
  { value: "DAILY", label: "Daily" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "YEARLY", label: "Yearly" },
];

interface FormValues {
  title: string; description: string; priority: string; status: string;
  dueDate: string; reminder: string; projectId: string; recurrence: string; tagIds: string[];
}

const sectionLabel: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.375rem",
  fontSize: "0.6875rem",
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  marginBottom: "0.5rem",
  color: "#9ca3af",
};

const fieldStyle: React.CSSProperties = {
  width: "100%",
  fontSize: "0.875rem",
  border: "1px solid",
  borderRadius: "0.5rem",
  padding: "0.625rem 0.75rem",
  outline: "none",
  transition: "border-color 0.15s",
};

export function TaskDetailPanel() {
  const qc = useQueryClient();
  const { selectedTaskId, setSelectedTaskId } = useUIStore();

  const { data: task } = useQuery<Task>({
    queryKey: ["tasks", selectedTaskId],
    queryFn: () => tasksApi.getOne(selectedTaskId!),
    enabled: !!selectedTaskId,
  });

  const { data: projects = [] } = useQuery({ queryKey: ["projects"], queryFn: projectsApi.getAll });
  const { data: tags = [] } = useQuery({ queryKey: ["tags"], queryFn: tagsApi.getAll });

  const { register, handleSubmit, reset, watch, setValue } = useForm<FormValues>();
  const selectedTagIds = watch("tagIds") ?? [];
  const [estimateVal, setEstimateVal] = useState("");

  useEffect(() => {
    if (task) {
      reset({
        title: task.title,
        description: task.description ?? "",
        priority: task.priority,
        status: task.status,
        dueDate: task.dueDate ? format(new Date(task.dueDate), "yyyy-MM-dd'T'HH:mm") : "",
        reminder: task.reminder ? format(new Date(task.reminder), "yyyy-MM-dd'T'HH:mm") : "",
        projectId: task.projectId ?? "",
        recurrence: task.recurrence ?? "",
        tagIds: task.tags.map((t) => t.tag.id),
      });
      setEstimateVal(task.estimatedMinutes != null ? String(task.estimatedMinutes) : "");
    }
  }, [task, reset]);

  const update = useMutation({
    mutationFn: (data: Partial<Task> & { tagIds?: string[] }) => tasksApi.update(selectedTaskId!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["tasks", selectedTaskId] });
    },
  });

  const deleteTask = useMutation({
    mutationFn: () => tasksApi.delete(selectedTaskId!),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tasks"] }); setSelectedTaskId(null); toast.success("Task deleted"); },
  });

  const archiveTask = useMutation({
    mutationFn: () => tasksApi.update(selectedTaskId!, { isArchived: true }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tasks"] }); setSelectedTaskId(null); toast.success("Archived"); },
  });

  const save = (data: FormValues) => {
    update.mutate({
      title: data.title,
      description: data.description || undefined,
      priority: data.priority as Task["priority"],
      status: data.status as Task["status"],
      dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : undefined,
      reminder: data.reminder ? new Date(data.reminder).toISOString() : undefined,
      projectId: data.projectId || undefined,
      recurrence: (data.recurrence as Task["recurrence"]) || undefined,
      tagIds: data.tagIds,
    });
  };

  const toggleTag = (id: string) => {
    const next = selectedTagIds.includes(id)
      ? selectedTagIds.filter((t) => t !== id)
      : [...selectedTagIds, id];
    setValue("tagIds", next);
    update.mutate({ tagIds: next });
  };

  if (!selectedTaskId) return null;

  if (!task) return (
    <aside className="bg-white dark:bg-gray-900 border-l border-gray-100 dark:border-gray-800" style={{ width: "22rem", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Loader2 size={20} className="text-indigo-500 animate-spin" />
    </aside>
  );

  return (
    <aside
      className="bg-white dark:bg-gray-900 border-l border-gray-100 dark:border-gray-800"
      style={{ width: "22rem", flexShrink: 0, display: "flex", flexDirection: "column" }}
    >
      {/* Header */}
      <div
        className="border-b border-gray-100 dark:border-gray-800"
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.25rem 1.5rem" }}
      >
        <span style={{ fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }} className="text-gray-400">
          Task Detail
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
          <button
            onClick={() => archiveTask.mutate()}
            className="text-gray-400 hover:text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition rounded-lg"
            style={{ padding: "0.375rem" }}
            title="Archive"
          >
            <Archive size={14} />
          </button>
          <button
            onClick={() => { if (confirm("Delete this task?")) deleteTask.mutate(); }}
            className="text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition rounded-lg"
            style={{ padding: "0.375rem" }}
          >
            <Trash2 size={14} />
          </button>
          <button
            onClick={() => setSelectedTaskId(null)}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition rounded-lg"
            style={{ padding: "0.375rem" }}
          >
            <X size={14} />
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit(save)} style={{ flex: 1, overflowY: "auto", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>

        {/* Title */}
        <textarea
          rows={2}
          className="text-gray-900 dark:text-white bg-transparent placeholder-gray-200 dark:placeholder-gray-700 focus:outline-none resize-none"
          style={{ width: "100%", fontSize: "1rem", fontWeight: 600, lineHeight: 1.5, border: "none" }}
          placeholder="Task title"
          {...register("title")}
          onBlur={handleSubmit(save)}
        />

        {/* Status & Priority */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div>
            <p style={sectionLabel} className="text-gray-400">
              <CheckSquare size={11} /> Status
            </p>
            <select
              {...register("status")}
              onChange={(e) => update.mutate({ status: e.target.value as Task["status"] })}
              className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-indigo-500"
              style={fieldStyle}
            >
              {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <p style={sectionLabel} className="text-gray-400">
              <Flag size={11} /> Priority
            </p>
            <select
              {...register("priority")}
              onChange={(e) => update.mutate({ priority: e.target.value as Task["priority"] })}
              className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-indigo-500"
              style={fieldStyle}
            >
              {PRIORITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        {/* Due Date */}
        <div>
          <p style={sectionLabel} className="text-gray-400"><Calendar size={11} /> Due Date</p>
          <input
            type="datetime-local"
            {...register("dueDate")}
            onBlur={handleSubmit(save)}
            className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-indigo-500"
            style={fieldStyle}
          />
        </div>

        {/* Reminder */}
        <div>
          <p style={sectionLabel} className="text-gray-400"><Clock size={11} /> Reminder</p>
          <input
            type="datetime-local"
            {...register("reminder")}
            onBlur={handleSubmit(save)}
            className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-indigo-500"
            style={fieldStyle}
          />
        </div>

        {/* Estimated time */}
        <div>
          <p style={sectionLabel} className="text-gray-400"><Clock size={11} /> Estimate</p>
          <select
            value={estimateVal}
            onChange={(e) => {
              setEstimateVal(e.target.value);
              update.mutate({ estimatedMinutes: e.target.value ? Number(e.target.value) : undefined });
            }}
            className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-indigo-500"
            style={fieldStyle}
          >
            <option value="">No estimate</option>
            {[15, 30, 45, 60, 90, 120, 180, 240, 300, 480].map((m) => (
              <option key={m} value={m}>{m < 60 ? `${m}m` : `${m / 60}h${m % 60 ? ` ${m % 60}m` : ""}`}</option>
            ))}
          </select>
        </div>

        {/* Repeat */}
        <div>
          <p style={sectionLabel} className="text-gray-400"><RefreshCw size={11} /> Repeat</p>
          <select
            {...register("recurrence")}
            onChange={(e) => update.mutate({ recurrence: (e.target.value as Task["recurrence"]) || undefined })}
            className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-indigo-500"
            style={fieldStyle}
          >
            {RECURRENCE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {/* List */}
        <div>
          <p style={sectionLabel} className="text-gray-400"><Folder size={11} /> List</p>
          <select
            {...register("projectId")}
            onChange={(e) => update.mutate({ projectId: e.target.value || undefined })}
            className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-indigo-500"
            style={fieldStyle}
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
            <p style={sectionLabel} className="text-gray-400"><Tag size={11} /> Tags</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              {tags.map((tag: { id: string; name: string; color: string }) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTag(tag.id)}
                  style={{
                    padding: "0.3125rem 0.75rem",
                    borderRadius: "999px",
                    fontSize: "0.75rem",
                    fontWeight: 500,
                    border: "none",
                    cursor: "pointer",
                    transition: "all 0.15s",
                    background: selectedTagIds.includes(tag.id) ? tag.color : "rgba(156,163,175,0.15)",
                    color: selectedTagIds.includes(tag.id) ? "white" : "#9ca3af",
                  }}
                >
                  {tag.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        <div>
          <p style={sectionLabel} className="text-gray-400"><AlignLeft size={11} /> Notes</p>
          <textarea
            rows={4}
            placeholder="Add notes..."
            className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 placeholder-gray-300 dark:placeholder-gray-600 focus:ring-2 focus:ring-indigo-500 resize-none"
            style={fieldStyle}
            {...register("description")}
            onBlur={handleSubmit(save)}
          />
        </div>

        {task.createdAt && (
          <p className="text-gray-300 dark:text-gray-600" style={{ fontSize: "0.75rem" }}>
            Created {format(new Date(task.createdAt), "MMM d, yyyy · HH:mm")}
          </p>
        )}
      </form>
    </aside>
  );
}
