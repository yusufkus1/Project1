import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { X, CheckCircle, Zap, Sun } from "lucide-react";
import { format, isToday } from "date-fns";
import { tasksApi, Task } from "../api/tasks";
import { useFocusStore } from "../store/focus";
import { useGamificationStore } from "../store/gamification";

const RITUAL_KEY = "todoapp_ritual_shown";

export function useDailyRitualTrigger() {
  const today = format(new Date(), "yyyy-MM-dd");
  const last = localStorage.getItem(RITUAL_KEY);
  return last !== today;
}

export function markRitualShown() {
  localStorage.setItem(RITUAL_KEY, format(new Date(), "yyyy-MM-dd"));
}

const PRIORITY_RANK: Record<string, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };

export function DailyRitual({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { data } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => tasksApi.getAll({ isArchived: false, limit: 200 }),
  });
  const allTasks: Task[] = data?.tasks ?? [];
  const pendingToday = allTasks.filter(
    (t) => t.status !== "COMPLETED" && t.dueDate && isToday(new Date(t.dueDate))
  );
  const otherPending = allTasks
    .filter((t) => t.status !== "COMPLETED" && (!t.dueDate || !isToday(new Date(t.dueDate))))
    .sort((a, b) => (PRIORITY_RANK[b.priority] ?? 0) - (PRIORITY_RANK[a.priority] ?? 0))
    .slice(0, 10);

  const candidates = [...pendingToday, ...otherPending.filter((t) => !pendingToday.find((p) => p.id === t.id))];

  const { sessions } = useFocusStore();
  const { xp, streak } = useGamificationStore();
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
  const yesterdaySessions = sessions.filter((s) => {
    const d = new Date(s.completedAt);
    return d.getDate() === yesterday.getDate() && d.getMonth() === yesterday.getMonth() && d.getFullYear() === yesterday.getFullYear();
  });
  const yesterdayFocus = yesterdaySessions.filter((s) => s.type === "work" && !s.interrupted).reduce((acc, s) => acc + s.duration, 0);

  const totalEstimated = candidates
    .filter((t) => selectedIds.includes(t.id) && t.estimatedMinutes)
    .reduce((acc, t) => acc + (t.estimatedMinutes ?? 0), 0);

  const markTop3 = useMutation({
    mutationFn: async () => {
      await Promise.all(
        selectedIds.map((id) =>
          tasksApi.update(id, { dueDate: new Date().toISOString() })
        )
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  const finish = async () => {
    if (selectedIds.length > 0) await markTop3.mutateAsync();
    markRitualShown();
    onClose();
  };

  const toggle = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 3 ? [...prev, id] : prev
    );
  };

  const steps = ["Yesterday", "Top 3 Today", "Capacity"];

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 150, display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={(e) => { if (e.target === e.currentTarget) { markRitualShown(); onClose(); } }}
    >
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(6px)" }} />
      <div className="bg-white dark:bg-gray-900"
        style={{ position: "relative", zIndex: 1, width: "min(560px, 94vw)", borderRadius: "1.5rem", boxShadow: "0 32px 80px rgba(0,0,0,0.25)", overflow: "hidden" }}>

        {/* Header */}
        <div style={{ padding: "1.5rem 1.75rem 0", display: "flex", alignItems: "center", gap: "0.875rem" }}>
          <div style={{ width: "2.25rem", height: "2.25rem", borderRadius: "0.625rem", background: "linear-gradient(135deg, #f59e0b, #f97316)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Sun size={16} color="white" />
          </div>
          <div style={{ flex: 1 }}>
            <p className="text-gray-900 dark:text-white" style={{ fontWeight: 800, fontSize: "1.0625rem" }}>Morning Ritual</p>
            <p className="text-gray-400" style={{ fontSize: "0.75rem" }}>Let's set up your day</p>
          </div>
          <button onClick={() => { markRitualShown(); onClose(); }} style={{ background: "none", border: "none", cursor: "pointer" }} className="text-gray-400 hover:text-gray-600">
            <X size={16} />
          </button>
        </div>

        {/* Step indicators */}
        <div style={{ padding: "1.25rem 1.75rem 0", display: "flex", gap: "0.375rem" }}>
          {steps.map((label, i) => (
            <div key={label} style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              <div style={{ height: "3px", borderRadius: "999px", background: i <= step ? "#6366f1" : "rgba(99,102,241,0.15)", transition: "background 0.3s" }} />
              <span style={{ fontSize: "0.625rem", fontWeight: 600, color: i <= step ? "#6366f1" : "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
            </div>
          ))}
        </div>

        {/* Step content */}
        <div style={{ padding: "1.5rem 1.75rem", minHeight: "16rem" }}>

          {/* Step 0: Yesterday stats */}
          {step === 0 && (
            <div>
              <p className="text-gray-900 dark:text-white" style={{ fontWeight: 700, fontSize: "1.125rem", marginBottom: "1.25rem" }}>How did yesterday go?</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.875rem" }}>
                {[
                  { icon: "🍅", label: "Focus sessions", value: yesterdaySessions.filter((s) => s.type === "work" && !s.interrupted).length },
                  { icon: "⏱️", label: "Focus time", value: `${yesterdayFocus}m` },
                  { icon: "⚡", label: "Total XP", value: `${xp} XP` },
                  { icon: "🔥", label: "Day streak", value: streak > 0 ? `${streak} days` : "—" },
                ].map(({ icon, label, value }) => (
                  <div key={label} className="bg-gray-50 dark:bg-gray-800"
                    style={{ borderRadius: "1rem", padding: "1rem 1.125rem" }}>
                    <p style={{ fontSize: "1.5rem", marginBottom: "0.375rem" }}>{icon}</p>
                    <p className="text-gray-900 dark:text-white" style={{ fontWeight: 700, fontSize: "1.125rem" }}>{value}</p>
                    <p className="text-gray-400" style={{ fontSize: "0.75rem" }}>{label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 1: Pick top 3 */}
          {step === 1 && (
            <div>
              <p className="text-gray-900 dark:text-white" style={{ fontWeight: 700, fontSize: "1.125rem", marginBottom: "0.375rem" }}>What are your top 3 tasks today?</p>
              <p className="text-gray-400" style={{ fontSize: "0.8125rem", marginBottom: "1.25rem" }}>
                Select up to 3. These will be scheduled for today. ({selectedIds.length}/3 selected)
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxHeight: "18rem", overflowY: "auto" }}>
                {candidates.slice(0, 12).map((task) => {
                  const selected = selectedIds.includes(task.id);
                  return (
                    <button
                      key={task.id}
                      onClick={() => toggle(task.id)}
                      disabled={!selected && selectedIds.length >= 3}
                      style={{
                        display: "flex", alignItems: "center", gap: "0.75rem",
                        padding: "0.75rem 1rem", borderRadius: "0.75rem", border: "1.5px solid",
                        borderColor: selected ? "#6366f1" : "rgba(229,231,235,0.8)",
                        background: selected ? "rgba(99,102,241,0.06)" : "transparent",
                        cursor: !selected && selectedIds.length >= 3 ? "default" : "pointer",
                        opacity: !selected && selectedIds.length >= 3 ? 0.4 : 1,
                        textAlign: "left", width: "100%", transition: "all 0.15s",
                      }}
                    >
                      <div style={{
                        width: "1.25rem", height: "1.25rem", borderRadius: "50%", flexShrink: 0,
                        border: "2px solid", borderColor: selected ? "#6366f1" : "#d1d5db",
                        background: selected ? "#6366f1" : "transparent",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        transition: "all 0.15s",
                      }}>
                        {selected && <CheckCircle size={10} color="white" />}
                      </div>
                      <span className="text-gray-800 dark:text-gray-100" style={{ fontSize: "0.9375rem", fontWeight: 500, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {task.title}
                      </span>
                      {task.estimatedMinutes && (
                        <span className="text-gray-400" style={{ fontSize: "0.75rem", flexShrink: 0 }}>{task.estimatedMinutes}m</span>
                      )}
                    </button>
                  );
                })}
                {candidates.length === 0 && (
                  <div className="text-gray-400" style={{ textAlign: "center", padding: "3rem 0", fontSize: "0.9375rem" }}>
                    No pending tasks. You're all caught up!
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Capacity check */}
          {step === 2 && (
            <div>
              <p className="text-gray-900 dark:text-white" style={{ fontWeight: 700, fontSize: "1.125rem", marginBottom: "0.5rem" }}>Capacity check</p>
              <p className="text-gray-400" style={{ fontSize: "0.8125rem", marginBottom: "1.5rem" }}>
                Can you realistically do these tasks today?
              </p>
              {selectedIds.length === 0 ? (
                <div className="bg-gray-50 dark:bg-gray-800" style={{ borderRadius: "1rem", padding: "1.5rem", textAlign: "center" }}>
                  <p className="text-gray-400" style={{ fontSize: "0.9375rem" }}>No tasks selected. That's fine — just do what you can.</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
                  <div className="bg-gray-50 dark:bg-gray-800" style={{ borderRadius: "1rem", padding: "1.25rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.75rem" }}>
                      <span className="text-gray-700 dark:text-gray-200" style={{ fontWeight: 600, fontSize: "0.9375rem" }}>
                        {selectedIds.length} task{selectedIds.length > 1 ? "s" : ""} selected
                      </span>
                      {totalEstimated > 0 && (
                        <span style={{ fontWeight: 700, color: totalEstimated > 360 ? "#ef4444" : "#10b981", fontSize: "0.9375rem" }}>
                          ~{totalEstimated < 60 ? `${totalEstimated}m` : `${Math.floor(totalEstimated / 60)}h ${totalEstimated % 60}m`}
                        </span>
                      )}
                    </div>
                    {totalEstimated > 0 && (
                      <>
                        <div style={{ height: "8px", borderRadius: "999px", background: "rgba(0,0,0,0.08)", overflow: "hidden" }}>
                          <div style={{
                            height: "100%", borderRadius: "999px",
                            background: totalEstimated > 360 ? "#ef4444" : totalEstimated > 240 ? "#f59e0b" : "#10b981",
                            width: `${Math.min(100, (totalEstimated / 360) * 100)}%`,
                            transition: "width 0.4s",
                          }} />
                        </div>
                        <p className="text-gray-400" style={{ fontSize: "0.75rem", marginTop: "0.5rem" }}>
                          {totalEstimated > 360
                            ? "That's a heavy day. Consider removing one task."
                            : totalEstimated > 240
                            ? "Solid workload. Leave buffer for unexpected tasks."
                            : "Looks achievable. You've got this!"}
                        </p>
                      </>
                    )}
                  </div>
                  <div className="bg-indigo-50 dark:bg-indigo-950/30"
                    style={{ borderRadius: "1rem", padding: "1rem 1.125rem", display: "flex", alignItems: "center", gap: "0.75rem", border: "1.5px solid rgba(99,102,241,0.2)" }}>
                    <Zap size={18} style={{ color: "#6366f1", flexShrink: 0 }} />
                    <p style={{ fontSize: "0.8125rem", color: "#6366f1", fontWeight: 500 }}>
                      Tip: Focus on one task at a time. Use the Pomodoro timer for each.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "1rem 1.75rem 1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button
            onClick={() => step > 0 ? setStep(step - 1) : (markRitualShown(), onClose())}
            style={{ padding: "0.625rem 1.25rem", borderRadius: "0.75rem", border: "1px solid rgba(0,0,0,0.1)", background: "transparent", fontSize: "0.875rem", fontWeight: 500, cursor: "pointer" }}
            className="text-gray-500 dark:text-gray-400"
          >
            {step === 0 ? "Skip" : "Back"}
          </button>
          <button
            onClick={() => step < 2 ? setStep(step + 1) : finish()}
            style={{
              padding: "0.625rem 1.75rem", borderRadius: "0.75rem", border: "none",
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "white",
              fontSize: "0.875rem", fontWeight: 700, cursor: "pointer",
              boxShadow: "0 4px 12px rgba(99,102,241,0.3)",
            }}
          >
            {step < 2 ? "Next →" : "Start My Day 🚀"}
          </button>
        </div>
      </div>
    </div>
  );
}
