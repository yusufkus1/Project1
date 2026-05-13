import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { skillsApi, Skill, parseDays } from "../api/skills";
import { useIsMobile } from "../hooks/useIsMobile";
import { Trash2, Plus, Pencil, X, Check } from "lucide-react";
import toast from "react-hot-toast";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_SHORT  = ["M", "T", "W", "T", "F", "S", "S"];

const COLORS = [
  "#7c6ff7", "#a78bfa", "#f472b6", "#fb923c",
  "#34d399", "#38bdf8", "#facc15", "#f87171",
];

const DURATION_OPTIONS = [5, 10, 15, 20, 30, 45, 60, 90, 120];

function fmtDuration(min: number) {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

// ── Form ──────────────────────────────────────────────────────────────────────
function SkillForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Partial<Skill>;
  onSave: (v: { name: string; color: string; duration: number; days: number[] }) => void;
  onCancel: () => void;
}) {
  const [name, setName]         = useState(initial?.name ?? "");
  const [color, setColor]       = useState(initial?.color ?? COLORS[0]!);
  const [duration, setDuration] = useState(initial?.duration ?? 30);
  const [days, setDays]         = useState<number[]>(
    initial ? parseDays(initial as Skill) : [0, 1, 2, 3, 4]
  );

  const toggleDay = (d: number) =>
    setDays((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort());

  const submit = () => {
    if (!name.trim()) { toast.error("Name required"); return; }
    if (!days.length)  { toast.error("Select at least one day"); return; }
    onSave({ name: name.trim(), color, duration, days });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Name */}
      <div>
        <label style={{ fontSize: "0.8125rem", fontWeight: 600, display: "block", marginBottom: "0.375rem" }}
               className="text-gray-700 dark:text-gray-300">Skill name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Guitar, Spanish, Running…"
          className="bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700"
          style={{ width: "100%", boxSizing: "border-box", padding: "0.75rem 1rem", borderRadius: "0.75rem", border: "1.5px solid", fontSize: "0.9375rem", outline: "none" }}
          autoFocus
        />
      </div>

      {/* Color */}
      <div>
        <label style={{ fontSize: "0.8125rem", fontWeight: 600, display: "block", marginBottom: "0.5rem" }}
               className="text-gray-700 dark:text-gray-300">Color</label>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              style={{
                width: "1.875rem", height: "1.875rem", borderRadius: "50%",
                background: c, border: `3px solid ${color === c ? "#1f2937" : "transparent"}`,
                cursor: "pointer", transition: "border 0.15s",
              }}
            />
          ))}
        </div>
      </div>

      {/* Duration */}
      <div>
        <label style={{ fontSize: "0.8125rem", fontWeight: 600, display: "block", marginBottom: "0.5rem" }}
               className="text-gray-700 dark:text-gray-300">Duration per session</label>
        <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap" }}>
          {DURATION_OPTIONS.map((m) => (
            <button
              key={m}
              onClick={() => setDuration(m)}
              style={{
                padding: "0.375rem 0.75rem", borderRadius: "0.5rem",
                border: "1.5px solid",
                borderColor: duration === m ? color : "rgba(229,231,235,1)",
                background: duration === m ? color : "transparent",
                color: duration === m ? "white" : "#6b7280",
                fontWeight: 600, fontSize: "0.8125rem", cursor: "pointer",
              }}
            >
              {fmtDuration(m)}
            </button>
          ))}
        </div>
      </div>

      {/* Days */}
      <div>
        <label style={{ fontSize: "0.8125rem", fontWeight: 600, display: "block", marginBottom: "0.5rem" }}
               className="text-gray-700 dark:text-gray-300">Repeat on</label>
        <div style={{ display: "flex", gap: "0.375rem" }}>
          {DAY_SHORT.map((d, i) => (
            <button
              key={i}
              onClick={() => toggleDay(i)}
              style={{
                width: "2.25rem", height: "2.25rem", borderRadius: "50%",
                border: "1.5px solid",
                borderColor: days.includes(i) ? color : "rgba(229,231,235,1)",
                background: days.includes(i) ? color : "transparent",
                color: days.includes(i) ? "white" : "#6b7280",
                fontWeight: 700, fontSize: "0.8125rem", cursor: "pointer",
                flexShrink: 0,
              }}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
        <button
          onClick={onCancel}
          style={{ padding: "0.625rem 1.25rem", borderRadius: "0.75rem", border: "1.5px solid rgba(229,231,235,1)", background: "transparent", fontWeight: 600, fontSize: "0.875rem", cursor: "pointer" }}
          className="text-gray-600 dark:text-gray-400"
        >
          Cancel
        </button>
        <button
          onClick={submit}
          style={{ padding: "0.625rem 1.5rem", borderRadius: "0.75rem", border: "none", background: color, color: "white", fontWeight: 700, fontSize: "0.875rem", cursor: "pointer" }}
        >
          Save
        </button>
      </div>
    </div>
  );
}

// ── Skill Card ────────────────────────────────────────────────────────────────
function SkillCard({ skill }: { skill: Skill }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const days = parseDays(skill);

  const update = useMutation({
    mutationFn: (v: { name: string; color: string; duration: number; days: number[] }) =>
      skillsApi.update(skill.id, v),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["skills"] }); setEditing(false); toast.success("Updated"); },
  });

  const remove = useMutation({
    mutationFn: () => skillsApi.delete(skill.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["skills"] }); toast.success("Deleted"); },
  });

  const today = new Date().toISOString().slice(0, 10);
  const doneToday = skill.sessions.some((s) => s.date === today);

  const toggle = useMutation({
    mutationFn: () => skillsApi.toggle(skill.id, today),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["skills"] }),
  });

  if (editing) {
    return (
      <div className="bg-white dark:bg-gray-900"
           style={{ borderRadius: "1rem", padding: "1.5rem", border: "1px solid var(--color-border)" }}>
        <SkillForm initial={skill} onSave={(v) => update.mutate(v)} onCancel={() => setEditing(false)} />
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900"
         style={{ borderRadius: "1rem", padding: "1.25rem 1.5rem", border: "1px solid var(--color-border)", display: "flex", alignItems: "center", gap: "1rem" }}>
      {/* Color dot */}
      <div style={{ width: "0.75rem", height: "0.75rem", borderRadius: "50%", background: skill.color, flexShrink: 0 }} />

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p className="text-gray-900 dark:text-white" style={{ fontWeight: 700, fontSize: "0.9375rem", marginBottom: "0.25rem" }}>
          {skill.name}
        </p>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
          <span className="text-gray-500 dark:text-gray-400" style={{ fontSize: "0.75rem", fontWeight: 600 }}>
            {fmtDuration(skill.duration)}
          </span>
          <span style={{ color: "#d1d5db" }}>·</span>
          <div style={{ display: "flex", gap: "0.2rem" }}>
            {DAY_LABELS.map((d, i) => (
              <span key={i} style={{
                fontSize: "0.6875rem", fontWeight: 700,
                color: days.includes(i) ? skill.color : "#d1d5db",
              }}>{d[0]}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Today toggle */}
      <button
        onClick={() => toggle.mutate()}
        style={{
          width: "2rem", height: "2rem", borderRadius: "50%", flexShrink: 0,
          border: `2px solid ${doneToday ? skill.color : "#d1d5db"}`,
          background: doneToday ? skill.color : "transparent",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", transition: "all 0.2s",
        }}
      >
        {doneToday && <Check size={12} strokeWidth={3} color="white" />}
      </button>

      {/* Actions */}
      <button onClick={() => setEditing(true)}
              style={{ background: "none", border: "none", cursor: "pointer", padding: "0.25rem" }}
              className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
        <Pencil size={15} />
      </button>
      <button onClick={() => remove.mutate()}
              style={{ background: "none", border: "none", cursor: "pointer", padding: "0.25rem" }}
              className="text-gray-400 hover:text-red-500">
        <Trash2 size={15} />
      </button>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export function SkillsPage() {
  const qc = useQueryClient();
  const isMobile = useIsMobile();
  const [creating, setCreating] = useState(false);

  const { data: skills = [] } = useQuery<Skill[]>({
    queryKey: ["skills"],
    queryFn: skillsApi.getAll,
  });

  const create = useMutation({
    mutationFn: skillsApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["skills"] }); setCreating(false); toast.success("Skill added!"); },
  });

  return (
    <div style={{ maxWidth: "40rem", display: "flex", flexDirection: "column", gap: "2rem" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem" }}>
        <div>
          <h1 style={{ fontSize: isMobile ? "1.75rem" : "2.25rem", fontWeight: 800, marginBottom: "0.375rem" }}
              className="text-gray-900 dark:text-white">
            Skills
          </h1>
          <p className="text-gray-500 dark:text-gray-400" style={{ fontSize: "0.9375rem" }}>
            Practice sessions with recurrence & duration
          </p>
        </div>
        <button
          onClick={() => setCreating(true)}
          style={{
            display: "flex", alignItems: "center", gap: "0.5rem",
            padding: "0.625rem 1.25rem", borderRadius: "0.875rem",
            background: "#7c6ff7", color: "white", border: "none",
            fontWeight: 700, fontSize: "0.875rem", cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <Plus size={16} /> New skill
        </button>
      </div>

      {/* Create form */}
      {creating && (
        <div className="bg-white dark:bg-gray-900"
             style={{ borderRadius: "1rem", padding: "1.5rem", border: "1px solid var(--color-border)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
            <p className="text-gray-900 dark:text-white" style={{ fontWeight: 700, fontSize: "1rem" }}>New Skill</p>
            <button onClick={() => setCreating(false)}
                    style={{ background: "none", border: "none", cursor: "pointer" }}
                    className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
              <X size={18} />
            </button>
          </div>
          <SkillForm onSave={(v) => create.mutate(v)} onCancel={() => setCreating(false)} />
        </div>
      )}

      {/* List */}
      {skills.length === 0 && !creating ? (
        <div className="bg-white dark:bg-gray-900"
             style={{ borderRadius: "1rem", padding: "3rem 2rem", border: "1px solid var(--color-border)", textAlign: "center" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>🎯</div>
          <p className="text-gray-900 dark:text-white" style={{ fontWeight: 700, marginBottom: "0.375rem" }}>No skills yet</p>
          <p className="text-gray-400 dark:text-gray-500" style={{ fontSize: "0.875rem" }}>
            Add a skill to track your daily practice
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {skills.map((skill) => <SkillCard key={skill.id} skill={skill} />)}
        </div>
      )}
    </div>
  );
}
