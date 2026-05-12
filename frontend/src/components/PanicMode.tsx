import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isPast, isToday } from "date-fns";
import { Zap, Play, SkipForward, X } from "lucide-react";
import { tasksApi, Task } from "../api/tasks";
import { useFocusStore } from "../store/focus";
import { useNavigate } from "react-router-dom";
import confetti from "canvas-confetti";

const PRIORITY_RANK: Record<string, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };

function pickPanicTask(tasks: Task[]): Task[] {
  return [...tasks]
    .filter((t) => t.status !== "COMPLETED")
    .sort((a, b) => {
      // Quick tasks first (≤10min estimate)
      const aQuick = (a.estimatedMinutes ?? 999) <= 10;
      const bQuick = (b.estimatedMinutes ?? 999) <= 10;
      if (aQuick && !bQuick) return -1;
      if (!aQuick && bQuick) return 1;
      // Overdue next
      const aOv = a.dueDate && isPast(new Date(a.dueDate)) && !isToday(new Date(a.dueDate));
      const bOv = b.dueDate && isPast(new Date(b.dueDate)) && !isToday(new Date(b.dueDate));
      if (aOv && !bOv) return -1;
      if (!aOv && bOv) return 1;
      // Then by priority
      return (PRIORITY_RANK[b.priority] ?? 0) - (PRIORITY_RANK[a.priority] ?? 0);
    });
}

export function PanicMode({ tasks, onClose }: { tasks: Task[]; onClose: () => void }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const setFocusTask = useFocusStore((s) => s.setTask);
  const sorted = pickPanicTask(tasks);
  const task = sorted[0];

  const complete = useMutation({
    mutationFn: () => tasksApi.update(task!.id, { status: "COMPLETED" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      confetti({ particleCount: 100, spread: 80, origin: { y: 0.5 }, colors: ["#6366f1", "#22c55e", "#f59e0b"] });
      onClose();
    },
  });

  if (!task) {
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
        <div style={{ textAlign: "center", color: "white" }}>
          <div style={{ fontSize: "5rem", marginBottom: "1rem" }}>🎉</div>
          <p style={{ fontSize: "1.5rem", fontWeight: 800 }}>You're all done!</p>
          <p style={{ opacity: 0.7, marginTop: "0.5rem" }}>No pending tasks.</p>
        </div>
      </div>
    );
  }

  const isQuick = task.estimatedMinutes != null && task.estimatedMinutes <= 10;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "linear-gradient(135deg, #1e1b4b, #312e81, #4c1d95)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
      <button onClick={onClose} style={{ position: "absolute", top: "1.5rem", right: "1.5rem", background: "rgba(255,255,255,0.1)", border: "none", borderRadius: "50%", width: "2.5rem", height: "2.5rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>
        <X size={18} />
      </button>

      <div style={{ textAlign: "center", maxWidth: "600px", color: "white" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", marginBottom: "2rem", opacity: 0.7 }}>
          <Zap size={16} fill="white" />
          <span style={{ fontSize: "0.875rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>
            {isQuick ? "Quick win — just do this one thing" : "Focus on just this"}
          </span>
        </div>

        <p style={{ fontSize: "clamp(1.75rem, 5vw, 3rem)", fontWeight: 900, lineHeight: 1.2, marginBottom: "1.5rem", textShadow: "0 2px 20px rgba(0,0,0,0.3)" }}>
          {task.title}
        </p>

        {task.estimatedMinutes && (
          <p style={{ fontSize: "1rem", opacity: 0.65, marginBottom: "3rem" }}>
            ~{task.estimatedMinutes < 60 ? `${task.estimatedMinutes} min` : `${Math.floor(task.estimatedMinutes / 60)}h`}
          </p>
        )}

        <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
          <button
            onClick={() => { setFocusTask(task.id, task.title); navigate("/focus"); onClose(); }}
            style={{ display: "flex", alignItems: "center", gap: "0.625rem", padding: "1rem 2rem", borderRadius: "1rem", background: "white", color: "#4f46e5", border: "none", cursor: "pointer", fontSize: "1rem", fontWeight: 800, boxShadow: "0 8px 24px rgba(0,0,0,0.3)" }}
          >
            <Play size={18} fill="#4f46e5" /> Start Focus
          </button>
          <button
            onClick={() => complete.mutate()}
            style={{ display: "flex", alignItems: "center", gap: "0.625rem", padding: "1rem 2rem", borderRadius: "1rem", background: "rgba(34,197,94,0.25)", color: "white", border: "2px solid rgba(34,197,94,0.5)", cursor: "pointer", fontSize: "1rem", fontWeight: 700 }}
          >
            ✓ Done already
          </button>
          <button
            onClick={() => { /* cycle to next */ onClose(); }}
            style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "1rem 1.5rem", borderRadius: "1rem", background: "rgba(255,255,255,0.1)", color: "white", border: "2px solid rgba(255,255,255,0.2)", cursor: "pointer", fontSize: "0.9375rem", fontWeight: 600 }}
          >
            <SkipForward size={16} /> Skip
          </button>
        </div>

        {sorted.length > 1 && (
          <p style={{ marginTop: "2.5rem", opacity: 0.4, fontSize: "0.8125rem" }}>
            +{sorted.length - 1} more tasks waiting
          </p>
        )}
      </div>
    </div>
  );
}
