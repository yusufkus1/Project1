import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Sparkles, Loader2, Plus, Trash2, Calendar, Flag } from "lucide-react";
import { aiApi, ParsedTask, getStoredAIKey } from "../api/ai";
import { tasksApi } from "../api/tasks";
import toast from "react-hot-toast";

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "#22c55e",
  MEDIUM: "#eab308",
  HIGH: "#fb923c",
  CRITICAL: "#ef4444",
};

interface EditableTask extends ParsedTask {
  _id: number;
}

export function ImportNotesModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [step, setStep] = useState<"input" | "preview">("input");
  const [text, setText] = useState("");
  const [tasks, setTasks] = useState<EditableTask[]>([]);

  const parse = useMutation({
    mutationFn: () => aiApi.parseNotes(text),
    onSuccess: (data) => {
      setTasks(data.tasks.map((t, i) => ({ ...t, _id: i })));
      setStep("preview");
    },
    onError: (err: { response?: { data?: { error?: string } } }) => {
      toast.error(err.response?.data?.error ?? "AI parsing failed");
    },
  });

  const createAll = useMutation({
    mutationFn: async () => {
      for (const t of tasks) {
        await tasksApi.create({
          title: t.title,
          description: t.description ?? undefined,
          priority: t.priority,
          dueDate: t.dueDate ? new Date(t.dueDate).toISOString() : undefined,
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      toast.success(`${tasks.length} task${tasks.length > 1 ? "s" : ""} created`);
      onClose();
    },
    onError: () => toast.error("Failed to create tasks"),
  });

  const removeTask = (id: number) => setTasks((prev) => prev.filter((t) => t._id !== id));

  const updateTask = (id: number, field: keyof ParsedTask, value: string | null) => {
    setTasks((prev) => prev.map((t) => t._id === id ? { ...t, [field]: value } : t));
  };

  const hasKey = !!getStoredAIKey();

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(3px)" }} />

      <div style={{
        position: "relative", zIndex: 1,
        background: "var(--color-surface)", borderRadius: "1.25rem",
        width: "100%", maxWidth: step === "preview" ? "640px" : "520px",
        maxHeight: "90vh", display: "flex", flexDirection: "column",
        boxShadow: "0 24px 64px rgba(0,0,0,0.2)",
        border: "1px solid var(--color-border)",
      }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "1.25rem 1.5rem", borderBottom: "1px solid var(--color-border)" }}>
          <div style={{ width: "2rem", height: "2rem", borderRadius: "0.625rem", background: "rgba(124,111,247,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Sparkles size={15} color="#7c6ff7" />
          </div>
          <div>
            <p className="text-gray-900 dark:text-white" style={{ fontWeight: 700, fontSize: "0.9375rem" }}>
              {step === "input" ? "Import from Notes" : "Review Extracted Tasks"}
            </p>
            {step === "preview" && (
              <p className="text-gray-400 dark:text-gray-500" style={{ fontSize: "0.75rem" }}>
                {tasks.length} task{tasks.length !== 1 ? "s" : ""} found — edit before creating
              </p>
            )}
          </div>
          <button onClick={onClose} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", padding: "0.25rem", borderRadius: "0.375rem" }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X size={17} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem" }}>

          {step === "input" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {!hasKey && (
                <div style={{ background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.25)", borderRadius: "0.75rem", padding: "0.875rem 1rem", fontSize: "0.8125rem" }} className="text-yellow-700 dark:text-yellow-400">
                  ⚠️ No API key found. Add your Anthropic key in <strong>Settings → AI Features</strong>.
                </div>
              )}
              <div>
                <p className="text-gray-500 dark:text-gray-400" style={{ fontSize: "0.8125rem", marginBottom: "0.5rem" }}>
                  Paste any text — meeting notes, a brain dump, a to-do list. AI will extract the tasks.
                </p>
                <textarea
                  autoFocus
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={"Meeting notes:\n- Follow up with design team by Friday\n- Fix login bug (urgent)\n- Update docs\n- Schedule 1:1 with Ahmet next week"}
                  rows={12}
                  style={{
                    width: "100%", boxSizing: "border-box",
                    padding: "0.875rem 1rem", borderRadius: "0.75rem",
                    border: "1.5px solid var(--color-border)",
                    fontSize: "0.875rem", lineHeight: 1.6, resize: "vertical",
                    fontFamily: "inherit", outline: "none",
                  }}
                  className="bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-300 dark:placeholder-gray-600 focus:border-indigo-400"
                />
              </div>
            </div>
          )}

          {step === "preview" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {tasks.length === 0 && (
                <p className="text-gray-400" style={{ textAlign: "center", padding: "2rem 0" }}>
                  No tasks found. Go back and try different text.
                </p>
              )}
              {tasks.map((task) => (
                <div key={task._id} style={{
                  border: "1px solid var(--color-border)", borderRadius: "0.875rem",
                  padding: "1rem", display: "flex", flexDirection: "column", gap: "0.625rem",
                }} className="bg-gray-50 dark:bg-gray-800/50">

                  {/* Title */}
                  <input
                    value={task.title}
                    onChange={(e) => updateTask(task._id, "title", e.target.value)}
                    style={{
                      fontWeight: 600, fontSize: "0.9375rem", border: "none",
                      background: "transparent", outline: "none", width: "100%",
                    }}
                    className="text-gray-900 dark:text-white"
                  />

                  {/* Meta row */}
                  <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", flexWrap: "wrap" }}>
                    {/* Priority */}
                    <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                      <Flag size={11} color={PRIORITY_COLORS[task.priority]} />
                      <select
                        value={task.priority}
                        onChange={(e) => updateTask(task._id, "priority", e.target.value)}
                        style={{
                          fontSize: "0.75rem", fontWeight: 600, border: "none",
                          background: "transparent", cursor: "pointer", outline: "none",
                          color: PRIORITY_COLORS[task.priority],
                        }}
                      >
                        <option value="LOW">Low</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HIGH">High</option>
                        <option value="CRITICAL">Critical</option>
                      </select>
                    </div>

                    {/* Due date */}
                    <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                      <Calendar size={11} className="text-gray-400" />
                      <input
                        type="date"
                        value={task.dueDate ?? ""}
                        onChange={(e) => updateTask(task._id, "dueDate", e.target.value || null)}
                        style={{
                          fontSize: "0.75rem", border: "none", background: "transparent",
                          cursor: "pointer", outline: "none",
                        }}
                        className="text-gray-500 dark:text-gray-400"
                      />
                    </div>

                    <button
                      onClick={() => removeTask(task._id)}
                      style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", padding: "0.2rem", borderRadius: "0.375rem" }}
                      className="text-gray-300 hover:text-red-400 dark:text-gray-600 dark:hover:text-red-400"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  {/* Description */}
                  {task.description && (
                    <p className="text-gray-400 dark:text-gray-500" style={{ fontSize: "0.8125rem", lineHeight: 1.5 }}>
                      {task.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "1.25rem 1.5rem", borderTop: "1px solid var(--color-border)", display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
          {step === "preview" && (
            <button
              onClick={() => setStep("input")}
              style={{ padding: "0.625rem 1.125rem", borderRadius: "0.75rem", border: "1px solid var(--color-border)", background: "transparent", cursor: "pointer", fontSize: "0.875rem", fontWeight: 500 }}
              className="text-gray-600 dark:text-gray-400"
            >
              Back
            </button>
          )}

          {step === "input" ? (
            <button
              onClick={() => parse.mutate()}
              disabled={!text.trim() || parse.isPending || !hasKey}
              style={{
                display: "flex", alignItems: "center", gap: "0.5rem",
                padding: "0.625rem 1.25rem", borderRadius: "0.75rem",
                background: text.trim() && hasKey ? "#7c6ff7" : "#e2e8f0",
                color: text.trim() && hasKey ? "white" : "#94a3b8",
                border: "none", cursor: text.trim() && hasKey ? "pointer" : "not-allowed",
                fontWeight: 600, fontSize: "0.875rem",
              }}
            >
              {parse.isPending ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
              {parse.isPending ? "Analysing…" : "Extract Tasks"}
            </button>
          ) : (
            <button
              onClick={() => createAll.mutate()}
              disabled={tasks.length === 0 || createAll.isPending}
              style={{
                display: "flex", alignItems: "center", gap: "0.5rem",
                padding: "0.625rem 1.25rem", borderRadius: "0.75rem",
                background: tasks.length > 0 ? "#7c6ff7" : "#e2e8f0",
                color: tasks.length > 0 ? "white" : "#94a3b8",
                border: "none", cursor: tasks.length > 0 ? "pointer" : "not-allowed",
                fontWeight: 600, fontSize: "0.875rem",
              }}
            >
              {createAll.isPending ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
              {createAll.isPending ? "Creating…" : `Create ${tasks.length} Task${tasks.length !== 1 ? "s" : ""}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
