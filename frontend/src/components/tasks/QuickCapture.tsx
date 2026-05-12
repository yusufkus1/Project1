import { useEffect, useRef, useState, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Mic, MicOff, Plus, Zap, X, Sparkles, Loader2 } from "lucide-react";
import { tasksApi } from "../../api/tasks";
import { projectsApi, Project } from "../../api/projects";
import { aiApi, AIAnalysis } from "../../api/ai";
import confetti from "canvas-confetti";
import toast from "react-hot-toast";

// ─── Inline parsing ──────────────────────────────────────────────────────────
interface ParsedCapture {
  title: string;
  dueDate?: string;
  priority?: string;
  projectId?: string;
  estimatedMinutes?: number;
  // raw tokens kept for preview
  _dateToken?: string;
  _priorityToken?: string;
  _projectToken?: string;
  _timeToken?: string;
}

const PRIORITY_MAP: Record<string, string> = {
  "!low": "LOW", "!l": "LOW",
  "!medium": "MEDIUM", "!med": "MEDIUM", "!m": "MEDIUM",
  "!high": "HIGH", "!h": "HIGH",
  "!critical": "CRITICAL", "!crit": "CRITICAL", "!c": "CRITICAL",
};

function parseDate(token: string): string | undefined {
  const lower = token.toLowerCase();
  const now = new Date();
  let d: Date | undefined;
  if (lower === "@today" || lower === "@bugun") {
    d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59);
  } else if (lower === "@tomorrow" || lower === "@yarin") {
    d = new Date(now); d.setDate(d.getDate() + 1); d.setHours(23, 59, 0, 0);
  } else if (lower === "@nextweek" || lower === "@next-week") {
    d = new Date(now); d.setDate(d.getDate() + 7); d.setHours(23, 59, 0, 0);
  } else {
    const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const name = lower.replace("@", "");
    const idx = days.indexOf(name);
    if (idx !== -1) {
      const cur = now.getDay();
      const diff = (idx - cur + 7) % 7 || 7;
      d = new Date(now); d.setDate(d.getDate() + diff); d.setHours(23, 59, 0, 0);
    }
  }
  return d ? d.toISOString() : undefined;
}

function parseTime(token: string): number | undefined {
  // ~30m, ~1h, ~90m, ~1.5h
  const lower = token.toLowerCase().replace("~", "");
  const mMatch = lower.match(/^(\d+)m$/);
  if (mMatch) return parseInt(mMatch[1]!);
  const hMatch = lower.match(/^(\d+(?:\.\d+)?)h$/);
  if (hMatch) return Math.round(parseFloat(hMatch[1]!) * 60);
  return undefined;
}

function parseCapture(raw: string, projects: Project[]): ParsedCapture {
  const tokens = raw.trim().split(/\s+/);
  const titleParts: string[] = [];
  let priority: string | undefined;
  let dueDate: string | undefined;
  let estimatedMinutes: number | undefined;
  let projectId: string | undefined;
  let _dateToken: string | undefined;
  let _priorityToken: string | undefined;
  let _projectToken: string | undefined;
  let _timeToken: string | undefined;

  for (const tok of tokens) {
    if (tok.startsWith("!") && PRIORITY_MAP[tok.toLowerCase()]) {
      priority = PRIORITY_MAP[tok.toLowerCase()];
      _priorityToken = tok;
    } else if (tok.startsWith("@")) {
      const d = parseDate(tok);
      if (d) { dueDate = d; _dateToken = tok; } else { titleParts.push(tok); }
    } else if (tok.startsWith("~")) {
      const m = parseTime(tok);
      if (m) { estimatedMinutes = m; _timeToken = tok; } else { titleParts.push(tok); }
    } else if (tok.startsWith("#")) {
      const name = tok.slice(1).toLowerCase();
      const proj = projects.find((p) => p.name.toLowerCase().startsWith(name));
      if (proj) { projectId = proj.id; _projectToken = tok; } else { titleParts.push(tok); }
    } else {
      titleParts.push(tok);
    }
  }

  // Also parse natural-language date words in the title portion
  if (!dueDate) {
    const lower = titleParts.join(" ").toLowerCase();
    const now = new Date();
    const nlPatterns: [RegExp, () => Date, string][] = [
      [/\b(bugun|today)\b/, () => new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59), "today"],
      [/\b(yarin|tomorrow)\b/, () => { const d = new Date(now); d.setDate(d.getDate() + 1); d.setHours(23, 59, 0, 0); return d; }, "tomorrow"],
      [/\bnext week\b/, () => { const d = new Date(now); d.setDate(d.getDate() + 7); d.setHours(23, 59, 0, 0); return d; }, "next week"],
    ];
    for (const [pat, fn, label] of nlPatterns) {
      if (pat.test(lower)) { dueDate = fn().toISOString(); _dateToken = label; break; }
    }
  }

  return {
    title: titleParts.join(" ").trim() || raw.trim(),
    dueDate, priority, projectId, estimatedMinutes,
    _dateToken, _priorityToken, _projectToken, _timeToken,
  };
}

// ─── Speech ──────────────────────────────────────────────────────────────────
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

// ─── Preview tags ─────────────────────────────────────────────────────────────
const PRIORITY_COLORS: Record<string, string> = {
  LOW: "#7c6ff7", MEDIUM: "#10b981", HIGH: "#fb923c", CRITICAL: "#ef4444",
};

const PRIORITY_LABELS: Record<string, string> = {
  LOW: "Low", MEDIUM: "Medium", HIGH: "High", CRITICAL: "Critical",
};

function PreviewTag({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "0.2rem",
      padding: "0.1875rem 0.5rem", borderRadius: "999px",
      background: `${color}15`, color,
      fontSize: "0.75rem", fontWeight: 600,
    }}>
      {children}
    </span>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
export function QuickCapture({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [raw, setRaw] = useState("");
  const [aiSuggestion, setAiSuggestion] = useState<AIAnalysis | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: projectsApi.getAll,
  });

  const parsed = parseCapture(raw, projects);

  // Merge AI suggestion into parsed (AI fills gaps, manual tokens take precedence)
  const effectivePriority = parsed._priorityToken ? parsed.priority : (aiSuggestion?.priority ?? parsed.priority);
  const effectiveMinutes = parsed._timeToken ? parsed.estimatedMinutes : (aiSuggestion?.estimatedMinutes ?? parsed.estimatedMinutes);

  const runAiAnalysis = async () => {
    if (!parsed.title.trim()) return;
    setAiLoading(true);
    try {
      const result = await aiApi.analyzeTask(parsed.title);
      setAiSuggestion(result);
    } catch {
      toast.error("AI analysis failed");
    } finally {
      setAiLoading(false);
    }
  };

  const create = useMutation({
    mutationFn: () => tasksApi.create({
      title: parsed.title,
      dueDate: parsed.dueDate,
      priority: effectivePriority as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | undefined,
      projectId: parsed.projectId,
      estimatedMinutes: effectiveMinutes,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      confetti({ particleCount: 40, spread: 55, origin: { y: 0.5 }, colors: ["#7c6ff7", "#22c55e", "#f59e0b"] });
      toast.success("Task added!");
      setRaw("");
      setAiSuggestion(null);
      inputRef.current?.focus();
    },
    onError: () => toast.error("Failed to add task"),
  });

  const { listening, start, stop, supported } = useSpeech((text) => setRaw(text));

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const submit = () => { if (parsed.title.trim()) create.mutate(); };

  const hasPreview = parsed._dateToken || parsed._priorityToken || parsed._projectToken || parsed._timeToken;

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
          <div style={{ width: "2rem", height: "2rem", borderRadius: "0.5rem", background: "rgba(124,111,247,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Zap size={15} style={{ color: "#7c6ff7" }} />
          </div>
          <span className="text-gray-800 dark:text-white" style={{ fontWeight: 700, fontSize: "0.9375rem", flex: 1 }}>Quick Capture</span>
          <kbd className="text-gray-400 dark:text-gray-600" style={{ fontSize: "0.6875rem", background: "rgba(0,0,0,0.06)", borderRadius: "0.375rem", padding: "0.125rem 0.5rem" }}>⌘K</kbd>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: "0.25rem", borderRadius: "0.5rem" }} className="text-gray-400 hover:text-gray-600">
            <X size={16} />
          </button>
        </div>

        {/* Input */}
        <div style={{ padding: "1.25rem 1.5rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <input
            ref={inputRef}
            value={raw}
            onChange={(e) => { setRaw(e.target.value); setAiSuggestion(null); }}
            onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
            placeholder={listening ? "Listening…" : "Task title… !high #project @today ~30m"}
            className="text-gray-800 dark:text-white bg-transparent placeholder-gray-300 dark:placeholder-gray-600 focus:outline-none"
            style={{ flex: 1, fontSize: "1.0625rem" }}
          />

          {/* AI button */}
          {parsed.title.trim() && (
            <button
              onClick={runAiAnalysis}
              disabled={aiLoading}
              title="Let AI suggest priority & time estimate"
              style={{
                flexShrink: 0, width: "2.25rem", height: "2.25rem", borderRadius: "50%",
                border: "none", cursor: aiLoading ? "default" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                background: aiSuggestion ? "rgba(167,139,250,0.15)" : "rgba(167,139,250,0.1)",
                color: "#a78bfa",
                boxShadow: aiSuggestion ? "0 0 0 3px rgba(167,139,250,0.2)" : "none",
                transition: "all 0.2s",
              }}
            >
              {aiLoading ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Sparkles size={14} />}
            </button>
          )}

          {/* Mic button */}
          {supported && (
            <button
              onClick={listening ? stop : start}
              style={{
                flexShrink: 0, width: "2.25rem", height: "2.25rem", borderRadius: "50%",
                border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                background: listening ? "rgba(239,68,68,0.12)" : "rgba(124,111,247,0.1)",
                color: listening ? "#ef4444" : "#7c6ff7",
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
            disabled={!parsed.title.trim() || create.isPending}
            style={{
              flexShrink: 0, display: "flex", alignItems: "center", gap: "0.375rem",
              padding: "0.5625rem 1.125rem", borderRadius: "0.75rem",
              background: parsed.title.trim() ? "#7c6ff7" : "rgba(124,111,247,0.2)",
              color: parsed.title.trim() ? "white" : "#c4bbfd",
              border: "none", cursor: parsed.title.trim() ? "pointer" : "default",
              fontSize: "0.875rem", fontWeight: 600, transition: "all 0.15s",
            }}
          >
            <Plus size={15} /> Add
          </button>
        </div>

        {/* AI suggestion card */}
        {aiSuggestion && (
          <div style={{ margin: "0 1.5rem 0.75rem", borderRadius: "0.875rem", padding: "0.875rem 1rem", background: "rgba(167,139,250,0.06)", border: "1.5px solid rgba(167,139,250,0.2)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
              <Sparkles size={13} style={{ color: "#a78bfa" }} />
              <span style={{ fontSize: "0.6875rem", fontWeight: 700, color: "#a78bfa", textTransform: "uppercase", letterSpacing: "0.06em" }}>AI Suggestion</span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.5rem" }}>
              <span style={{ padding: "0.2rem 0.625rem", borderRadius: "999px", background: `${PRIORITY_COLORS[aiSuggestion.priority]}18`, color: PRIORITY_COLORS[aiSuggestion.priority], fontSize: "0.75rem", fontWeight: 700 }}>
                ↑ {PRIORITY_LABELS[aiSuggestion.priority]}
              </span>
              <span style={{ padding: "0.2rem 0.625rem", borderRadius: "999px", background: "rgba(245,158,11,0.12)", color: "#d97706", fontSize: "0.75rem", fontWeight: 700 }}>
                ⏱ {aiSuggestion.estimatedMinutes < 60 ? `${aiSuggestion.estimatedMinutes}m` : `${Math.floor(aiSuggestion.estimatedMinutes / 60)}h ${aiSuggestion.estimatedMinutes % 60}m`}
              </span>
              <span style={{ padding: "0.2rem 0.625rem", borderRadius: "999px", background: "rgba(124,111,247,0.1)", color: "#7c6ff7", fontSize: "0.75rem", fontWeight: 700 }}>
                +{aiSuggestion.xpReward} XP
              </span>
            </div>
            <p style={{ fontSize: "0.75rem", color: "#6b7280", fontStyle: "italic" }}>{aiSuggestion.rationale}</p>
          </div>
        )}

        {/* Preview tags */}
        {hasPreview && (
          <div style={{ padding: "0 1.5rem 1rem", display: "flex", flexWrap: "wrap", gap: "0.375rem", alignItems: "center" }}>
            <span className="text-gray-400" style={{ fontSize: "0.6875rem", fontWeight: 600, marginRight: "0.25rem" }}>Parsed:</span>
            {parsed._priorityToken && (
              <PreviewTag color={PRIORITY_COLORS[parsed.priority!] ?? "#7c6ff7"}>
                ↑ {parsed.priority!.toLowerCase()}
              </PreviewTag>
            )}
            {parsed._dateToken && <PreviewTag color="#3b82f6">📅 {parsed._dateToken}</PreviewTag>}
            {parsed._timeToken && <PreviewTag color="#f59e0b">⏱ {parsed._timeToken.replace("~", "")} → {parsed.estimatedMinutes}m</PreviewTag>}
            {parsed._projectToken && <PreviewTag color="#a78bfa">#{projects.find((p) => p.id === parsed.projectId)?.name ?? parsed._projectToken}</PreviewTag>}
          </div>
        )}

        {/* Hint bar */}
        <div className="border-t border-gray-50 dark:border-gray-800/60" style={{ padding: "0.625rem 1.5rem", display: "flex", flexWrap: "wrap", gap: "0.375rem", alignItems: "center" }}>
          <span className="text-gray-400 dark:text-gray-600" style={{ fontSize: "0.6875rem" }}>
            <kbd style={{ background: "rgba(0,0,0,0.06)", borderRadius: "0.25rem", padding: "0.1rem 0.35rem", fontSize: "0.6875rem" }}>Enter</kbd> to add
          </span>
          <span className="text-gray-300 dark:text-gray-700" style={{ fontSize: "0.6875rem" }}>·</span>
          <span style={{ color: "#ef4444", fontSize: "0.6875rem" }}>!high</span>
          <span style={{ color: "#3b82f6", fontSize: "0.6875rem" }}>@today</span>
          <span style={{ color: "#a78bfa", fontSize: "0.6875rem" }}>#project</span>
          <span style={{ color: "#f59e0b", fontSize: "0.6875rem" }}>~30m</span>
        </div>
      </div>
    </div>
  );
}
