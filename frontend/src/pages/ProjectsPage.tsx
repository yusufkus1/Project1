import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit2, Trash2, Folder } from "lucide-react";
import { projectsApi, Project } from "../api/projects";
import { Modal } from "../components/ui/Modal";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { useNavigate } from "react-router-dom";
import { useFiltersStore } from "../store/filters";
import toast from "react-hot-toast";

const COLORS = ["#6366f1","#8b5cf6","#ec4899","#ef4444","#f97316","#22c55e","#14b8a6","#3b82f6","#64748b","#a16207"];

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
  });

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">New List</h1>
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
        <Input label="List Name *" placeholder="List name" value={name} onChange={(e) => setName(e.target.value)} />
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
          <textarea
            rows={3}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            placeholder="List description..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Color</label>
          <div className="flex flex-wrap gap-2">
            {COLORS.map((c) => (
              <button key={c} type="button" onClick={() => setColor(c)}
                className={`w-8 h-8 rounded-full transition ${color === c ? "ring-2 ring-offset-2 ring-gray-400 scale-110" : ""}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
        <Button onClick={() => mutation.mutate()} loading={mutation.isPending} disabled={!name.trim()} className="w-full">
          Create
        </Button>
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
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Lists</h1>
        <Button onClick={() => navigate("/projects/new")}><Plus size={16} /> New List</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((project: Project) => (
          <div key={project.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 group">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: project.color + "20" }}>
                  <Folder size={20} style={{ color: project.color }} />
                </span>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{project.name}</h3>
                  <p className="text-xs text-gray-400">{project._count?.tasks ?? 0} tasks</p>
                </div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                <button onClick={() => { setEditProject(project); setEditName(project.name); setEditColor(project.color); }}
                  className="p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition">
                  <Edit2 size={14} />
                </button>
                <button onClick={() => { if (confirm("Delete this list? Tasks will not be deleted.")) deleteMutation.mutate(project.id); }}
                  className="p-1 rounded text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            {project.description && <p className="text-sm text-gray-500 dark:text-gray-400 mt-3 line-clamp-2">{project.description}</p>}
            <button onClick={() => { setProjectId(project.id); navigate("/tasks"); }}
              className="mt-4 text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
              View tasks →
            </button>
          </div>
        ))}
      </div>

      <Modal open={!!editProject} onClose={() => setEditProject(null)} title="Edit List" size="sm">
        <div className="space-y-4">
          <Input label="List Name" value={editName} onChange={(e) => setEditName(e.target.value)} />
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Color</label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button key={c} type="button" onClick={() => setEditColor(c)}
                  className={`w-8 h-8 rounded-full transition ${editColor === c ? "ring-2 ring-offset-2 ring-gray-400 scale-110" : ""}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <Button onClick={() => updateMutation.mutate()} loading={updateMutation.isPending} className="w-full">Update</Button>
        </div>
      </Modal>
    </div>
  );
}
