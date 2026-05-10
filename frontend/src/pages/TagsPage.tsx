import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit2, Trash2, Tag } from "lucide-react";
import { tagsApi } from "../api/tags";
import { Modal } from "../components/ui/Modal";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
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
    <div style={{ maxWidth: "56rem", display: "flex", flexDirection: "column", gap: "2rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 className="text-gray-900 dark:text-white" style={{ fontSize: "1.875rem", fontWeight: 800 }}>Tags</h1>
          <p className="text-gray-500 dark:text-gray-400" style={{ fontSize: "0.875rem", marginTop: "0.25rem" }}>{tags.length} tags</p>
        </div>
        <Button onClick={openCreate}><Plus size={16} /> New Tag</Button>
      </div>

      {tags.length === 0 ? (
        <div className="text-center" style={{ paddingTop: "4rem", paddingBottom: "4rem" }}>
          <Tag size={40} className="text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 dark:text-gray-500">No tags yet</p>
          <Button onClick={openCreate} className="mt-4"><Plus size={16} /> Create First Tag</Button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(13rem, 1fr))", gap: "1rem" }}>
          {tags.map((tag: { id: string; name: string; color: string; _count?: { tasks: number } }) => (
            <div key={tag.id} className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 group" style={{ borderRadius: "0.875rem", border: "1px solid", padding: "1rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div className="flex items-center gap-3">
                <span className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: tag.color }} />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{tag.name}</p>
                  <p className="text-xs text-gray-400">{tag._count?.tasks ?? 0} tasks</p>
                </div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                <button onClick={() => openEdit(tag)} className="p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition">
                  <Edit2 size={14} />
                </button>
                <button
                  onClick={() => { if (confirm("Delete this tag?")) deleteMutation.mutate(tag.id); }}
                  className="p-1 rounded text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={closeModal} title={editTag ? "Edit Tag" : "New Tag"} size="sm">
        <div className="space-y-4">
          <Input label="Tag Name" placeholder="Tag name" value={name} onChange={(e) => setName(e.target.value)} />
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Color</label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full transition ${color === c ? "ring-2 ring-offset-2 ring-gray-400 scale-110" : ""}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <Button
            onClick={handleSubmit}
            loading={createMutation.isPending || updateMutation.isPending}
            className="w-full"
          >
            {editTag ? "Update" : "Create"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
