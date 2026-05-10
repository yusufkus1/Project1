import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { tasksApi } from "../../api/tasks";
import toast from "react-hot-toast";

interface InlineAddProps {
  projectId?: string;
  parentId?: string;
}

export function InlineAdd({ projectId, parentId }: InlineAddProps) {
  const qc = useQueryClient();
  const [active, setActive] = useState(false);
  const [title, setTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const create = useMutation({
    mutationFn: () => tasksApi.create({ title: title.trim(), projectId, parentId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      setTitle("");
      inputRef.current?.focus();
    },
    onError: () => toast.error("Failed to add task"),
  });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && title.trim()) create.mutate();
    if (e.key === "Escape") { setActive(false); setTitle(""); }
  };

  if (!active) {
    return (
      <button
        onClick={() => { setActive(true); setTimeout(() => inputRef.current?.focus(), 0); }}
        className="bg-white dark:bg-gray-900 text-gray-400 dark:text-gray-500 hover:text-indigo-500 dark:hover:text-indigo-400 border-gray-200 dark:border-gray-800 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all group"
        style={{
          display: "flex", alignItems: "center", gap: "0.75rem",
          width: "100%", padding: "0.875rem 1.25rem",
          borderRadius: "0.875rem", border: "1.5px dashed",
          fontSize: "0.9375rem", cursor: "pointer",
        }}
      >
        <Plus size={17} style={{ flexShrink: 0 }} />
        <span>Add task</span>
      </button>
    );
  }

  return (
    <div
      className="bg-white dark:bg-gray-900 border-indigo-400 dark:border-indigo-600"
      style={{
        display: "flex", alignItems: "center", gap: "0.75rem",
        padding: "0.875rem 1.25rem", borderRadius: "0.875rem",
        border: "1.5px solid", boxShadow: "0 4px 12px rgba(99,102,241,0.12)",
      }}
    >
      <div style={{
        width: "1.125rem", height: "1.125rem", borderRadius: "50%",
        border: "2px dashed #818cf8", flexShrink: 0,
      }} />
      <input
        ref={inputRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => { if (!title.trim()) setActive(false); }}
        placeholder="Task name…  Enter to save, Esc to cancel"
        className="text-gray-800 dark:text-gray-100 placeholder-gray-300 dark:placeholder-gray-600 bg-transparent focus:outline-none"
        style={{ flex: 1, fontSize: "0.9375rem" }}
        autoFocus
      />
    </div>
  );
}
