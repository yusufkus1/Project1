import { useState } from "react";
import { format, addMinutes, setHours, setMinutes } from "date-fns";
import { ChevronDown, ChevronUp, Clock } from "lucide-react";
import { Task } from "../../api/tasks";

const PRIORITY_COLOR: Record<string, string> = {
  CRITICAL: "#ef4444", HIGH: "#fb923c", MEDIUM: "#eab308", LOW: "#94a3b8",
};
const PRIORITY_RANK: Record<string, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };

interface Block {
  task: Task;
  startTime: Date;
  endTime: Date;
}

function buildSchedule(tasks: Task[], startHour = 9): Block[] {
  const pending = [...tasks]
    .filter((t) => t.status !== "COMPLETED")
    .sort((a, b) => (PRIORITY_RANK[b.priority] ?? 0) - (PRIORITY_RANK[a.priority] ?? 0));

  const blocks: Block[] = [];
  let cursor = setMinutes(setHours(new Date(), startHour), 0);

  for (const task of pending) {
    const duration = task.estimatedMinutes ?? 30;
    const end = addMinutes(cursor, duration);
    blocks.push({ task, startTime: cursor, endTime: end });
    // 5 min buffer between tasks
    cursor = addMinutes(end, 5);
  }

  return blocks;
}

export function ScheduleView({ tasks }: { tasks: Task[] }) {
  const [open, setOpen] = useState(false);

  const pending = tasks.filter((t) => t.status !== "COMPLETED");
  if (pending.length === 0) return null;

  const blocks = buildSchedule(pending);

  return (
    <div className="bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800"
      style={{ borderRadius: "0.875rem", border: "1px solid", overflow: "hidden" }}>

      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: "0.625rem",
          padding: "0.875rem 1.125rem", background: "none", border: "none", cursor: "pointer",
        }}
      >
        <Clock size={15} style={{ color: "#7c6ff7", flexShrink: 0 }} />
        <span className="text-gray-700 dark:text-gray-200" style={{ fontWeight: 700, fontSize: "0.875rem", flex: 1, textAlign: "left" }}>
          Auto Schedule
        </span>
        <span className="text-gray-400" style={{ fontSize: "0.75rem", marginRight: "0.5rem" }}>
          {blocks.length} block{blocks.length !== 1 ? "s" : ""}
        </span>
        {open ? <ChevronUp size={14} style={{ color: "#9ca3af" }} /> : <ChevronDown size={14} style={{ color: "#9ca3af" }} />}
      </button>

      {open && (
        <div style={{ padding: "0 1.125rem 1rem", display: "flex", flexDirection: "column", gap: "0.375rem" }}>
          {blocks.map(({ task, startTime, endTime }, i) => (
            <div key={task.id} style={{ display: "flex", gap: "0.875rem", alignItems: "stretch" }}>
              {/* Time column */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0, width: "3rem" }}>
                <span className="text-gray-400" style={{ fontSize: "0.6875rem", fontWeight: 600, whiteSpace: "nowrap" }}>
                  {format(startTime, "HH:mm")}
                </span>
                {i < blocks.length - 1 && (
                  <div style={{ flex: 1, width: "1px", background: "rgba(0,0,0,0.08)", margin: "2px 0", minHeight: "0.75rem" }} />
                )}
              </div>

              {/* Task block */}
              <div style={{
                flex: 1, borderRadius: "0.625rem", padding: "0.5rem 0.75rem",
                background: `${PRIORITY_COLOR[task.priority] ?? "#94a3b8"}0d`,
                borderLeft: `3px solid ${PRIORITY_COLOR[task.priority] ?? "#94a3b8"}`,
                marginBottom: i < blocks.length - 1 ? "0.25rem" : 0,
              }}>
                <p className="text-gray-800 dark:text-gray-100"
                  style={{ fontSize: "0.8125rem", fontWeight: 600, lineHeight: 1.3, marginBottom: "0.125rem" }}>
                  {task.title}
                </p>
                <p className="text-gray-400" style={{ fontSize: "0.6875rem" }}>
                  {format(startTime, "HH:mm")} – {format(endTime, "HH:mm")} · {task.estimatedMinutes ?? 30}m
                </p>
              </div>
            </div>
          ))}
          <p className="text-gray-400" style={{ fontSize: "0.6875rem", textAlign: "center", marginTop: "0.5rem" }}>
            Schedule starts at 9:00 AM · 5 min buffer between tasks
          </p>
        </div>
      )}
    </div>
  );
}
