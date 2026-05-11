import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit2, Trash2, Folder, ListTodo } from "lucide-react";
import { projectsApi, Project } from "../api/projects";
import { Modal } from "../components/ui/Modal";
import { Input } from "../components/ui/Input";
import { useNavigate } from "react-router-dom";
import { useFiltersStore } from "../store/filters";
import toast from "react-hot-toast";

const COLORS = ["#6366f1","#8b5cf6","#ec4899","#ef4444","#f97316","#22c55e","#14b8a6","#3b82f6","#64748b","#a16207"];

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4 block">Color</label>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "0.875rem", padding: "1rem", borderRadius: "1rem", background: "rgba(0,0,0,0.08)" }}>
        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            style={{
              width: "100%", aspectRatio: "1",
              borderRadius: "0.875rem", border: "none", cursor: "pointer",
              backgroundColor: c,
              border: value === c ? `3px solid ${c}` : "3px solid transparent",
              outline: value === c ? `2px solid ${c}40` : "none",
              outlineOffset: "2px",
              transform: value === c ? "scale(1.1)" : undefined,
              boxShadow: value === c ? `0 4px 14px ${c}60` : "none",
              transition: "transform 0.15s, box-shadow 0.15s",
            }}
          />
        ))}
      </div>
    </div>
  );
}

export function ProjectsNewPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(COLORS[0]!);

  const mutation = useMutation({
    mutationFn: () => projectsApi.create({ name, description, color }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      toast.success("List created");
      navigate("/tasks");
    },
    onError: () => toast.error("Failed to create list"),
  });

  return (
    <div style={{ maxWidth: "48rem", display: "flex", flexDirection: "column", gap: "2rem" }}>

      {/* Header */}
      <div>
        <h1 style={{ fontSize: "2.25rem", fontWeight: 800, marginBottom: "0.5rem" }}
            className="text-gray-900 dark:text-white">
          New List
        </h1>
        <p className="text-gray-500 dark:text-gray-400" style={{ fontSize: "1rem" }}>
          Group related tasks together in a list
        </p>
      </div>

      {/* Form card */}
      <div className="bg-white dark:bg-gray-900"
           style={{ borderRadius: "1rem", border: "1px solid rgba(241,245,249,1)", padding: "2.5rem", display: "flex", flexDirection: "column", gap: "1.75rem" }}>
        <Input label="List Name" placeholder="e.g. Work, Personal, Side Project" value={name} onChange={(e) => setName(e.target.value)} />

        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
          <textarea
            rows={3}
            className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            style={{ padding: "0.875rem 1rem" }}
            placeholder="What is this list for? (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <ColorPicker value={color} onChange={setColor} />

        {/* Preview */}
        {name.trim() && (
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "1rem 1.25rem", borderRadius: "0.875rem", background: color + "12", border: `1.5px solid ${color}30` }}>
            <div style={{ width: "2.75rem", height: "2.75rem", borderRadius: "0.75rem", background: color + "20", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Folder size={20} style={{ color }} />
            </div>
            <div>
              <p style={{ fontWeight: 700, fontSize: "0.9375rem", color }} >{name}</p>
              {description && <p className="text-gray-500 dark:text-gray-400" style={{ fontSize: "0.8125rem", marginTop: "0.25rem" }}>{description}</p>}
            </div>
          </div>
        )}

        <button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || !name.trim()}
          style={{
            padding: "0.9375rem", background: !name.trim() ? "#e5e7eb" : mutation.isPending ? "#a5b4fc" : "#6366f1",
            color: !name.trim() ? "#9ca3af" : "white",
            border: "none", borderRadius: "0.75rem", fontWeight: 600,
            fontSize: "0.9375rem", cursor: !name.trim() ? "not-allowed" : "pointer",
          }}
        >
          {mutation.isPending ? "Creating…" : "Create List"}
        </button>
      </div>
    </div>
  );
}

export function ProjectsListPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const setProjectId = useFiltersStore((s) => s.setProjectId);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState(COLORS[0]!);

  const { data: projects = [] } = useQuery({ queryKey: ["projects"], queryFn: projectsApi.getAll });

  const updateMutation = useMutation({
    mutationFn: () => projectsApi.update(editProject!.id, { name: editName, color: editColor }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["projects"] }); toast.success("Updated"); setEditProject(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => projectsApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["projects"] }); toast.success("List deleted"); },
  });

  return (
    <div style={{ maxWidth: "64rem", display: "flex", flexDirection: "column", gap: "2rem" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: "2.25rem", fontWeight: 800, marginBottom: "0.5rem" }}
              className="text-gray-900 dark:text-white">
            Lists
          </h1>
          <p className="text-gray-500 dark:text-gray-400" style={{ fontSize: "1rem" }}>
            {projects.length} list{projects.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => navigate("/projects/new")}
          style={{
            display: "flex", alignItems: "center", gap: "0.5rem",
            padding: "0.75rem 1.5rem", background: "#6366f1", color: "white",
            border: "none", borderRadius: "0.75rem", fontWeight: 600,
            fontSize: "0.9375rem", cursor: "pointer", whiteSpace: "nowrap",
          }}
        >
          <Plus size={18} /> New List
        </button>
      </div>

      {/* Empty state */}
      {projects.length === 0 ? (
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
            <Folder size={32} color="#6366f1" />
          </div>
          <div style={{ textAlign: "center" }}>
            <p className="text-gray-900 dark:text-white" style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem" }}>
              No lists yet
            </p>
            <p className="text-gray-500 dark:text-gray-400" style={{ fontSize: "0.9375rem" }}>
              Create a list to group your tasks by project or area
            </p>
          </div>
          <button
            onClick={() => navigate("/projects/new")}
            style={{
              display: "flex", alignItems: "center", gap: "0.5rem",
              padding: "0.75rem 1.5rem", background: "#6366f1", color: "white",
              border: "none", borderRadius: "0.75rem", fontWeight: 600,
              fontSize: "0.9375rem", cursor: "pointer",
            }}
          >
            <Plus size={18} /> Create First List
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
          {projects.map((project: Project) => (
            <div
              key={project.id}
              className="bg-white dark:bg-gray-900 group hover:shadow-md transition-all"
              style={{ borderRadius: "1rem", border: "1px solid rgba(241,245,249,1)", padding: "1.75rem" }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1.25rem" }}>
                <div style={{
                  width: "3rem", height: "3rem", borderRadius: "0.875rem",
                  background: project.color + "20", display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Folder size={22} style={{ color: project.color }} />
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                  <button
                    onClick={() => { setEditProject(project); setEditName(project.name); setEditColor(project.color); }}
                    className="p-2 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => { if (confirm("Delete this list? Tasks will not be deleted.")) deleteMutation.mutate(project.id); }}
                    className="p-2 rounded-lg text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <h3 className="text-gray-900 dark:text-white" style={{ fontWeight: 700, fontSize: "1rem", marginBottom: "0.375rem" }}>
                {project.name}
              </h3>
              {project.description && (
                <p className="text-gray-500 dark:text-gray-400" style={{ fontSize: "0.875rem", marginBottom: "0.75rem", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                  {project.description}
                </p>
              )}

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "1.25rem", paddingTop: "1.25rem", borderTop: "1px solid rgba(241,245,249,1)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
                  <ListTodo size={14} className="text-gray-400" />
                  <span className="text-gray-400 dark:text-gray-500" style={{ fontSize: "0.8125rem" }}>
                    {project._count?.tasks ?? 0} tasks
                  </span>
                </div>
                <button
                  onClick={() => { setProjectId(project.id); navigate("/tasks"); }}
                  style={{ fontSize: "0.8125rem", color: "#6366f1", fontWeight: 600, background: "none", border: "none", cursor: "pointer" }}
                >
                  View tasks →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!editProject} onClose={() => setEditProject(null)} title="Edit List" size="md">
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          <Input label="List Name" placeholder="List name" value={editName} onChange={(e) => setEditName(e.target.value)} />
          <ColorPicker value={editColor} onChange={setEditColor} />
          <button
            onClick={() => updateMutation.mutate()}
            disabled={updateMutation.isPending || !editName.trim()}
            style={{
              width: "100%", padding: "1.0625rem", background: "#6366f1", color: "white",
              border: "none", borderRadius: "0.875rem", fontWeight: 700,
              fontSize: "1rem", cursor: "pointer",
            }}
          >
            {updateMutation.isPending ? "Saving…" : "Update List"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
