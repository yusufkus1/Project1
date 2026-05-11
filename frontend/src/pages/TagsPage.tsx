import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit2, Trash2, Tag } from "lucide-react";
import { tagsApi } from "../api/tags";
import { Modal } from "../components/ui/Modal";
import { Input } from "../components/ui/Input";
import toast from "react-hot-toast";

const COLORS = ["#6366f1","#8b5cf6","#ec4899","#ef4444","#f97316","#eab308","#22c55e","#14b8a6","#3b82f6","#64748b"];

export function TagsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editTag, setEditTag] = useState<{ id: string; name: string; color: string } | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLORS[0]!);

  const { data: tags = [] } = useQuery({ queryKey: ["tags"], queryFn: tagsApi.getAll });

  const createMutation = useMutation({
    mutationFn: () => tagsApi.create({ name, color }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tags"] }); toast.success("Tag created"); closeModal(); },
    onError: (err: { response?: { data?: { error?: string } } }) => toast.error(err.response?.data?.error ?? "Error"),
  });

  const updateMutation = useMutation({
    mutationFn: () => tagsApi.update(editTag!.id, { name, color }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tags"] }); toast.success("Tag updated"); closeModal(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => tagsApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tags"] }); toast.success("Tag deleted"); },
  });

  const openCreate = () => { setEditTag(null); setName(""); setColor(COLORS[0]!); setOpen(true); };
  const openEdit = (tag: { id: string; name: string; color: string }) => {
    setEditTag(tag); setName(tag.name); setColor(tag.color); setOpen(true);
  };
  const closeModal = () => { setOpen(false); setEditTag(null); };
  const handleSubmit = () => { if (!name.trim()) return; editTag ? updateMutation.mutate() : createMutation.mutate(); };

  return (
    <div style={{ maxWidth: "64rem", display: "flex", flexDirection: "column", gap: "2rem" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: "2.25rem", fontWeight: 800, marginBottom: "0.5rem" }}
              className="text-gray-900 dark:text-white">
            Tags
          </h1>
          <p className="text-gray-500 dark:text-gray-400" style={{ fontSize: "1rem" }}>
            {tags.length} tag{tags.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={openCreate}
          style={{
            display: "flex", alignItems: "center", gap: "0.5rem",
            padding: "0.75rem 1.5rem", background: "#6366f1", color: "white",
            border: "none", borderRadius: "0.75rem", fontWeight: 600,
            fontSize: "0.9375rem", cursor: "pointer", whiteSpace: "nowrap",
          }}
        >
          <Plus size={18} /> New Tag
        </button>
      </div>

      {/* Empty state */}
      {tags.length === 0 ? (
        <div className="bg-white dark:bg-gray-900" style={{
          borderRadius: "1.5rem", border: "1px solid rgba(241,245,249,1)",
          padding: "5rem 2rem", display: "flex", flexDirection: "column",
          alignItems: "center", gap: "1.5rem",
        }}>
          <div style={{
            width: "5rem", height: "5rem", borderRadius: "1.5rem",
            background: "rgba(99,102,241,0.1)", display: "flex",
            alignItems: "center", justifyContent: "center",
          }}>
            <Tag size={32} color="#6366f1" />
          </div>
          <div style={{ textAlign: "center" }}>
            <p className="text-gray-900 dark:text-white" style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem" }}>
              No tags yet
            </p>
            <p className="text-gray-500 dark:text-gray-400" style={{ fontSize: "0.9375rem" }}>
              Create tags to organize and filter your tasks
            </p>
          </div>
          <button
            onClick={openCreate}
            style={{
              display: "flex", alignItems: "center", gap: "0.5rem",
              padding: "0.75rem 1.5rem", background: "#6366f1", color: "white",
              border: "none", borderRadius: "0.75rem", fontWeight: 600,
              fontSize: "0.9375rem", cursor: "pointer",
            }}
          >
            <Plus size={18} /> Create First Tag
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
          {tags.map((tag: { id: string; name: string; color: string; _count?: { tasks: number } }) => (
            <div
              key={tag.id}
              className="bg-white dark:bg-gray-900 group hover:shadow-md transition-all"
              style={{
                borderRadius: "1rem", border: "1px solid rgba(241,245,249,1)",
                padding: "1.5rem", display: "flex", alignItems: "center",
                justifyContent: "space-between", gap: "1rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "1rem", minWidth: 0 }}>
                <div style={{
                  width: "3rem", height: "3rem", borderRadius: "0.75rem",
                  background: tag.color + "20", display: "flex",
                  alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <span style={{
                    width: "1.125rem", height: "1.125rem", borderRadius: "50%",
                    background: tag.color, display: "block",
                  }} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <p className="text-gray-900 dark:text-white"
                     style={{ fontWeight: 700, fontSize: "0.9375rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {tag.name}
                  </p>
                  <p className="text-gray-400 dark:text-gray-500" style={{ fontSize: "0.8125rem", marginTop: "0.25rem" }}>
                    {tag._count?.tasks ?? 0} tasks
                  </p>
                </div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition flex-shrink-0">
                <button
                  onClick={() => openEdit(tag)}
                  className="p-2 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                >
                  <Edit2 size={15} />
                </button>
                <button
                  onClick={() => { if (confirm("Delete this tag?")) deleteMutation.mutate(tag.id); }}
                  className="p-2 rounded-lg text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={closeModal} title={editTag ? "Edit Tag" : "New Tag"} size="md">
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>

          {/* Name input */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <label className="text-gray-500 dark:text-gray-400"
                   style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase" }}>
              Tag Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Work, Personal, Urgent"
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400"
              style={{
                width: "100%", padding: "1rem 1.25rem",
                border: "1.5px solid #e2e8f0", borderRadius: "0.875rem",
                fontSize: "1rem", outline: "none",
                boxSizing: "border-box",
                transition: "border-color 0.15s",
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "#6366f1"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "#e2e8f0"; }}
            />
          </div>

          {/* Color picker */}
          <div>
            <label className="text-gray-500 dark:text-gray-400"
                   style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", display: "block", marginBottom: "0.75rem" }}>
              Color
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "0.875rem", padding: "1rem" , borderRadius: "1rem", background: "rgba(0,0,0,0.08)" }}>
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  style={{
                    width: "100%", aspectRatio: "1",
                    borderRadius: "0.875rem",
                    border: color === c ? `3px solid ${c}` : "3px solid transparent",
                    outline: color === c ? `2px solid ${c}40` : "none",
                    outlineOffset: "2px",
                    backgroundColor: c, cursor: "pointer",
                    transform: color === c ? "scale(1.1)" : undefined,
                    transition: "transform 0.15s, outline 0.15s",
                    boxShadow: color === c ? `0 4px 14px ${c}60` : "none",
                  }}
                />
              ))}
            </div>
          </div>

          {/* Preview chip */}
          {name.trim() && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.875rem 1rem", borderRadius: "0.875rem", background: color + "15" }}>
              <span style={{ width: "0.75rem", height: "0.75rem", borderRadius: "50%", background: color, flexShrink: 0, display: "block" }} />
              <span style={{ fontWeight: 600, color }} >{name}</span>
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={createMutation.isPending || updateMutation.isPending || !name.trim()}
            style={{
              width: "100%", padding: "1.0625rem",
              background: !name.trim() ? "#e5e7eb" : "#6366f1",
              color: !name.trim() ? "#9ca3af" : "white",
              border: "none", borderRadius: "0.875rem", fontWeight: 700,
              fontSize: "1rem", cursor: !name.trim() ? "not-allowed" : "pointer",
              transition: "background 0.15s",
            }}
          >
            {createMutation.isPending || updateMutation.isPending ? "Saving…" : editTag ? "Update Tag" : "Create Tag"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
