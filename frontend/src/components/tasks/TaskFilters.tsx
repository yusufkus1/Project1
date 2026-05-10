import { Search, X, SlidersHorizontal } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { projectsApi } from "../../api/projects";
import { tagsApi } from "../../api/tags";
import { useFiltersStore } from "../../store/filters";

const selectClass = "px-4 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition";

export function TaskFilters() {
  const {
    search, status, priority, projectId, tagId, sortBy, sortOrder,
    setSearch, setStatus, setPriority, setProjectId, setTagId, setSortBy, setSortOrder, reset,
  } = useFiltersStore();

  const { data: projects = [] } = useQuery({ queryKey: ["projects"], queryFn: projectsApi.getAll });
  const { data: tags = [] } = useQuery({ queryKey: ["tags"], queryFn: tagsApi.getAll });

  const hasFilters = search || status || priority || projectId || tagId;

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="relative flex-1 min-w-56">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search tasks..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
        />
      </div>

      <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectClass}>
        <option value="">All Statuses</option>
        <option value="PENDING">Pending</option>
        <option value="IN_PROGRESS">In Progress</option>
        <option value="COMPLETED">Completed</option>
      </select>

      <select value={priority} onChange={(e) => setPriority(e.target.value)} className={selectClass}>
        <option value="">All Priorities</option>
        <option value="LOW">Low</option>
        <option value="MEDIUM">Medium</option>
        <option value="HIGH">High</option>
        <option value="CRITICAL">Critical</option>
      </select>

      {projects.length > 0 && (
        <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className={selectClass}>
          <option value="">All Lists</option>
          {projects.map((p: { id: string; name: string }) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      )}

      {tags.length > 0 && (
        <select value={tagId} onChange={(e) => setTagId(e.target.value)} className={selectClass}>
          <option value="">All Tags</option>
          {tags.map((t: { id: string; name: string }) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      )}

      <div className="flex items-center gap-2 ml-auto">
        <SlidersHorizontal size={15} className="text-gray-400" />
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className={selectClass}>
          <option value="position">Order</option>
          <option value="createdAt">Created</option>
          <option value="dueDate">Due Date</option>
          <option value="priority">Priority</option>
          <option value="title">Title</option>
        </select>
        <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value as "asc" | "desc")} className={selectClass}>
          <option value="asc">Ascending</option>
          <option value="desc">Descending</option>
        </select>

        {hasFilters && (
          <button
            onClick={reset}
            className="flex items-center gap-1.5 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition"
          >
            <X size={14} /> Clear
          </button>
        )}
      </div>
    </div>
  );
}
