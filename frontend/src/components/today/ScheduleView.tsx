import { useState } from "react";
import { format, addMinutes, setHours, setMinutes } from "date-fns";
import { ChevronDown, ChevronUp, Clock } from "lucide-react";
import { Task } from "../../api/tasks";
import { Skill } from "../../api/skills";

const PRIORITY_COLOR: Record<string, string> = {
  CRITICAL: "#ef4444", HIGH: "#fb923c", MEDIUM: "#eab308", LOW: "#94a3b8",
};
const PRIORITY_RANK: Record<string, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };

interface ScheduleBlock {
  id: string;
  label: string;
  duration: number;
  color: string;
  badge?: string;
  startTime: Date;
  endTime: Date;
}

function buildSchedule(tasks: Task[], skills: Skill[], startHour = 9): ScheduleBlock[] {
  const items: { id: string; label: string; duration: number; color: string; badge?: string; rank: number }[] = [];

  tasks
    .filter((t) => t.status !== "COMPLETED")
    .forEach((t) => items.push({
      id: t.id,
      label: t.title,
      duration: t.estimatedMinutes ?? 30,
      color: PRIORITY_COLOR[t.priority] ?? "#94a3b8",
      badge: t.priority,
      rank: PRIORITY_RANK[t.priority] ?? 0,
    }));

  skills.forEach((s) => items.push({
    id: `skill-${s.id}`,
    label: s.name,
    duration: s.duration,
    color: s.color,
    badge: "Skill",
    rank: 2,
  }));

  items.sort((a, b) => b.rank - a.rank);

  const blocks: ScheduleBlock[] = [];
  let cursor = setMinutes(setHours(new Date(), startHour), 0);

  for (const item of items) {
    const end = addMinutes(cursor, item.duration);
    blocks.push({ ...item, startTime: cursor, endTime: end });
    cursor = addMinutes(end, 5);
  }

  return blocks;
}

export function ScheduleView({ tasks, skills = [] }: { tasks: Task[]; skills?: Skill[] }) {
  const [open, setOpen] = useState(false);

  const pending = tasks.filter((t) => t.status !== "COMPLETED");
  if (pending.length === 0 && skills.length === 0) return null;

  const blocks = buildSchedule(pending, skills);

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
          {blocks.map(({ id, label, duration, color, badge, startTime, endTime }, i) => (
            <div key={id} style={{ display: "flex", gap: "0.875rem", alignItems: "stretch" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0, width: "3rem" }}>
                <span className="text-gray-400" style={{ fontSize: "0.6875rem", fontWeight: 600, whiteSpace: "nowrap" }}>
                  {format(startTime, "HH:mm")}
                </span>
                {i < blocks.length - 1 && (
                  <div style={{ flex: 1, width: "1px", background: "rgba(0,0,0,0.08)", margin: "2px 0", minHeight: "0.75rem" }} />
                )}
              </div>

              <div style={{
                flex: 1, borderRadius: "0.625rem", padding: "0.5rem 0.75rem",
                background: `${color}0d`,
                borderLeft: `3px solid ${color}`,
                marginBottom: i < blocks.length - 1 ? "0.25rem" : 0,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.125rem" }}>
                  <p className="text-gray-800 dark:text-gray-100"
                    style={{ fontSize: "0.8125rem", fontWeight: 600, lineHeight: 1.3, flex: 1 }}>
                    {label}
                  </p>
                  {badge === "Skill" && (
                    <span style={{ fontSize: "0.625rem", fontWeight: 700, padding: "0.1rem 0.4rem", borderRadius: "999px", background: `${color}20`, color }}>
                      Skill
                    </span>
                  )}
                </div>
                <p className="text-gray-400" style={{ fontSize: "0.6875rem" }}>
                  {format(startTime, "HH:mm")} – {format(endTime, "HH:mm")} · {duration}m
                </p>
              </div>
            </div>
          ))}
          <p className="text-gray-400" style={{ fontSize: "0.6875rem", textAlign: "center", marginTop: "0.5rem" }}>
            Schedule starts at 9:00 AM · 5 min buffer between blocks
          </p>
        </div>
      )}
    </div>
  );
}
