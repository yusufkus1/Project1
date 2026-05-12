import { useEffect, useRef, useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Mic, MicOff, Plus, Zap, X } from "lucide-react";
import { tasksApi } from "../../api/tasks";
import confetti from "canvas-confetti";
import toast from "react-hot-toast";

// Natural-language date parsing (basic)
function parseTitle(raw: string): { title: string; dueDate?: string } {
  const lower = raw.toLowerCase();
  const now = new Date();
  let dueDate: Date | undefined;

  const patterns: [RegExp, () => Date][] = [
    [/\b(bugun|today)\b/,   () => new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59)],
    [/\b(yarin|tomorrow)\b/, () => { const d = new Date(now); d.setDate(d.getDate() + 1); d.setHours(23, 59, 0, 0); return d; }],
    [/\bnext week\b/,        () => { const d = new Date(now); d.setDate(d.getDate() + 7); d.setHours(23, 59, 0, 0); return d; }],
  ];

  for (const [pattern, fn] of patterns) {
    if (pattern.test(lower)) { dueDate = fn(); break; }
  }

  // Time: "at 3pm", "saat 15:00"
  const timeMatch = lower.match(/\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/);
  if (timeMatch && dueDate) {
    let h = parseInt(timeMatch[1]!);
    const m = parseInt(timeMatch[2] ?? "0");
    if (timeMatch[3] === "pm" && h < 12) h += 12;
    if (timeMatch[3] === "am" && h === 12) h = 0;
    dueDate.setHours(h, m, 0, 0);
  }

  return {
    title: raw.trim(),
    dueDate: dueDate ? dueDate.toISOString() : undefined,
  };
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}
interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
  interface SpeechRecognition extends EventTarget {
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    onresult: ((e: SpeechRecognitionEvent) => void) | null;
    onerror: ((e: SpeechRecognitionErrorEvent) => void) | null;
    onend: (() => void) | null;
    start(): void;
    stop(): void;
  }
}

function useSpeech(onResult: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const recRef = useRef<SpeechRecognition | null>(null);
  const supported = typeof window !== "undefined" && !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  const start = useCallback(() => {
    if (!supported) { toast.error("Browser doesn't support voice input"); return; }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = "tr-TR,en-US";
    rec.interimResults = false;
    rec.onresult = (e) => { const t = e.results[0]?.[0]?.transcript ?? ""; if (t) onResult(t); };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
  }, [supported, onResult]);

  const stop = useCallback(() => { recRef.current?.stop(); setListening(false); }, []);

  return { listening, start, stop, supported };
}

export function QuickCapture({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const create = useMutation({
    mutationFn: () => {
      const parsed = parseTitle(title);
      return tasksApi.create({ title: parsed.title, dueDate: parsed.dueDate });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      confetti({ particleCount: 40, spread: 55, origin: { y: 0.5 }, colors: ["#6366f1", "#22c55e", "#f59e0b"] });
      toast.success("Task added!");
      setTitle("");
      inputRef.current?.focus();
    },
    onError: () => toast.error("Failed to add task"),
  });

  const { listening, start, stop, supported } = useSpeech((text) => setTitle(text));

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const submit = () => { if (title.trim()) create.mutate(); };

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: "12vh" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Backdrop */}
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }} onClick={onClose} />

      {/* Modal */}
      <div
        className="bg-white dark:bg-gray-900"
        style={{
          position: "relative", zIndex: 1,
          width: "min(640px, 92vw)", borderRadius: "1.25rem",
          boxShadow: "0 24px 64px rgba(0,0,0,0.22)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div className="border-b border-gray-100 dark:border-gray-800" style={{ padding: "1.125rem 1.5rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={{ width: "2rem", height: "2rem", borderRadius: "0.5rem", background: "rgba(99,102,241,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Zap size={15} style={{ color: "#6366f1" }} />
          </div>
          <span className="text-gray-800 dark:text-white" style={{ fontWeight: 700, fontSize: "0.9375rem", flex: 1 }}>Quick Capture</span>
          <kbd className="text-gray-400 dark:text-gray-600" style={{ fontSize: "0.6875rem", background: "rgba(0,0,0,0.06)", borderRadius: "0.375rem", padding: "0.125rem 0.5rem" }}>Esc</kbd>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: "0.25rem", borderRadius: "0.5rem" }} className="text-gray-400 hover:text-gray-600">
            <X size={16} />
          </button>
        </div>

        {/* Input */}
        <div style={{ padding: "1.25rem 1.5rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <input
            ref={inputRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
            placeholder={listening ? "Listening…" : "Task title… (say 'today' or 'tomorrow' to set due date)"}
            className="text-gray-800 dark:text-white bg-transparent placeholder-gray-300 dark:placeholder-gray-600 focus:outline-none"
            style={{ flex: 1, fontSize: "1.0625rem" }}
          />

          {/* Mic button */}
          {supported && (
            <button
              onClick={listening ? stop : start}
              style={{
                flexShrink: 0, width: "2.25rem", height: "2.25rem", borderRadius: "50%",
                border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                background: listening ? "rgba(239,68,68,0.12)" : "rgba(99,102,241,0.1)",
                color: listening ? "#ef4444" : "#6366f1",
                boxShadow: listening ? "0 0 0 4px rgba(239,68,68,0.15)" : "none",
                transition: "all 0.2s",
              }}
              title={listening ? "Stop listening" : "Voice input"}
            >
              {listening ? <MicOff size={15} /> : <Mic size={15} />}
            </button>
          )}

          {/* Add button */}
          <button
            onClick={submit}
            disabled={!title.trim() || create.isPending}
            style={{
              flexShrink: 0, display: "flex", alignItems: "center", gap: "0.375rem",
              padding: "0.5625rem 1.125rem", borderRadius: "0.75rem",
              background: title.trim() ? "#6366f1" : "rgba(99,102,241,0.2)",
              color: title.trim() ? "white" : "#a5b4fc",
              border: "none", cursor: title.trim() ? "pointer" : "default",
              fontSize: "0.875rem", fontWeight: 600, transition: "all 0.15s",
            }}
          >
            <Plus size={15} /> Add
          </button>
        </div>

        {/* Recent tasks hint */}
        <div className="border-t border-gray-50 dark:border-gray-800/60" style={{ padding: "0.75rem 1.5rem", display: "flex", alignItems: "center", gap: "1rem" }}>
          <span className="text-gray-400 dark:text-gray-600" style={{ fontSize: "0.75rem" }}>
            Press <kbd style={{ background: "rgba(0,0,0,0.06)", borderRadius: "0.25rem", padding: "0.1rem 0.35rem", fontSize: "0.6875rem" }}>Enter</kbd> to add &nbsp;·&nbsp; Say "today" or "tomorrow" to set due date
          </span>
        </div>
      </div>
    </div>
  );
}
