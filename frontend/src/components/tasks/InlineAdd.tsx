import { useState, useRef, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Mic, MicOff } from "lucide-react";
import { tasksApi } from "../../api/tasks";
import toast from "react-hot-toast";

interface InlineAddProps {
  projectId?: string;
  parentId?: string;
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

export function InlineAdd({ projectId, parentId }: InlineAddProps) {
  const qc = useQueryClient();
  const [active, setActive] = useState(false);
  const [title, setTitle] = useState("");
  const [listening, setListening] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const recRef = useRef<SpeechRecognition | null>(null);

  const supported = typeof window !== "undefined" && !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  const create = useMutation({
    mutationFn: () => tasksApi.create({ title: title.trim(), projectId, parentId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      setTitle("");
      inputRef.current?.focus();
    },
    onError: () => toast.error("Failed to add task"),
  });

  const startListening = useCallback(() => {
    if (!supported) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = "tr-TR,en-US";
    rec.interimResults = false;
    rec.onresult = (e) => { const t = e.results[0]?.[0]?.transcript ?? ""; if (t) setTitle(t); };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
    if (!active) {
      setActive(true);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [supported, active]);

  const stopListening = useCallback(() => { recRef.current?.stop(); setListening(false); }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && title.trim()) create.mutate();
    if (e.key === "Escape") { setActive(false); setTitle(""); stopListening(); }
  };

  if (!active) {
    return (
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button
          onClick={() => { setActive(true); setTimeout(() => inputRef.current?.focus(), 0); }}
          className="bg-white dark:bg-gray-900 text-gray-400 dark:text-gray-500 hover:text-indigo-500 dark:hover:text-indigo-400 border-gray-200 dark:border-gray-800 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all group"
          style={{
            display: "flex", alignItems: "center", gap: "0.75rem",
            flex: 1, padding: "0.875rem 1.25rem",
            borderRadius: "0.875rem", border: "1.5px dashed",
            fontSize: "0.9375rem", cursor: "pointer",
          }}
        >
          <Plus size={17} style={{ flexShrink: 0 }} />
          <span>Add task</span>
        </button>

        {supported && (
          <button
            onClick={startListening}
            title="Voice input"
            style={{
              flexShrink: 0, width: "3.25rem", borderRadius: "0.875rem",
              border: "1.5px dashed", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "transparent",
            }}
            className="border-gray-200 dark:border-gray-800 text-gray-400 hover:text-indigo-500 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all"
          >
            <Mic size={17} />
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className="bg-white dark:bg-gray-900 border-indigo-400 dark:border-indigo-600"
      style={{
        display: "flex", alignItems: "center", gap: "0.75rem",
        padding: "0.875rem 1.25rem", borderRadius: "0.875rem",
        border: "1.5px solid", boxShadow: "0 4px 12px rgba(124,111,247,0.12)",
      }}
    >
      <div style={{
        width: "1.125rem", height: "1.125rem", borderRadius: "50%",
        border: "2px dashed #a89df9", flexShrink: 0,
      }} />
      <input
        ref={inputRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => { if (!title.trim() && !listening) setActive(false); }}
        placeholder={listening ? "Listening…" : "Task name…  Enter to save, Esc to cancel"}
        className="text-gray-800 dark:text-gray-100 placeholder-gray-300 dark:placeholder-gray-600 bg-transparent focus:outline-none"
        style={{ flex: 1, fontSize: "0.9375rem" }}
        autoFocus
      />

      {supported && (
        <button
          onClick={listening ? stopListening : startListening}
          style={{
            flexShrink: 0, width: "1.875rem", height: "1.875rem", borderRadius: "50%",
            border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            background: listening ? "rgba(239,68,68,0.1)" : "rgba(124,111,247,0.1)",
            color: listening ? "#ef4444" : "#7c6ff7",
            boxShadow: listening ? "0 0 0 3px rgba(239,68,68,0.15)" : "none",
            transition: "all 0.2s",
          }}
          title={listening ? "Stop" : "Voice input"}
        >
          {listening ? <MicOff size={13} /> : <Mic size={13} />}
        </button>
      )}
    </div>
  );
}
