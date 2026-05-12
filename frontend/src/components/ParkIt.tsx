import { useState, useEffect } from "react";
import { Leaf, X, Plus } from "lucide-react";

const STORAGE_KEY = "todoapp_parkit";

function loadThoughts(): string[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]"); } catch { return []; }
}
function saveThoughts(t: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(t));
}

export function ParkIt() {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [thoughts, setThoughts] = useState<string[]>(loadThoughts);

  useEffect(() => { saveThoughts(thoughts); }, [thoughts]);

  const add = () => {
    const t = draft.trim();
    if (!t) return;
    setThoughts((prev) => [t, ...prev]);
    setDraft("");
  };

  const remove = (i: number) => setThoughts((prev) => prev.filter((_, idx) => idx !== i));

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setOpen(true)}
        title="Park a thought — capture without losing focus"
        style={{
          position: "fixed", bottom: "2rem", right: "2rem", zIndex: 50,
          width: "3.25rem", height: "3.25rem", borderRadius: "50%",
          background: "linear-gradient(135deg, #059669, #10b981)",
          border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 4px 20px rgba(16,185,129,0.4)",
          color: "white", transition: "transform 0.15s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.1)")}
        onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
      >
        <Leaf size={20} />
        {thoughts.length > 0 && (
          <span style={{
            position: "absolute", top: "-0.25rem", right: "-0.25rem",
            background: "#ef4444", color: "white", borderRadius: "50%",
            width: "1.125rem", height: "1.125rem", fontSize: "0.625rem",
            fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center",
          }}>{thoughts.length}</span>
        )}
      </button>

      {/* Modal */}
      {open && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }} onClick={() => setOpen(false)} />
          <div className="bg-white dark:bg-gray-900"
            style={{ position: "relative", zIndex: 1, width: "min(480px, 92vw)", borderRadius: "1.25rem", boxShadow: "0 24px 64px rgba(0,0,0,0.22)", overflow: "hidden" }}>

            <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid rgba(0,0,0,0.06)", display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div style={{ width: "2rem", height: "2rem", borderRadius: "0.5rem", background: "rgba(16,185,129,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Leaf size={15} style={{ color: "#10b981" }} />
              </div>
              <div style={{ flex: 1 }}>
                <p className="text-gray-900 dark:text-white" style={{ fontWeight: 700, fontSize: "0.9375rem" }}>Park It</p>
                <p className="text-gray-400" style={{ fontSize: "0.75rem" }}>Capture the thought, stay in flow</p>
              </div>
              <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", cursor: "pointer" }} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: "1.25rem 1.5rem", display: "flex", gap: "0.5rem" }}>
              <input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") add(); if (e.key === "Escape") setOpen(false); }}
                placeholder="What just popped into your head?"
                className="bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100 placeholder-gray-300 dark:placeholder-gray-600"
                style={{ flex: 1, padding: "0.625rem 0.875rem", borderRadius: "0.75rem", border: "1.5px solid transparent", fontSize: "0.9375rem", outline: "none" }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#10b981")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "transparent")}
              />
              <button
                onClick={add}
                disabled={!draft.trim()}
                style={{
                  padding: "0.625rem 0.875rem", borderRadius: "0.75rem", border: "none",
                  background: draft.trim() ? "#10b981" : "rgba(16,185,129,0.2)",
                  color: draft.trim() ? "white" : "#6ee7b7",
                  cursor: draft.trim() ? "pointer" : "default",
                  display: "flex", alignItems: "center",
                }}
              >
                <Plus size={18} />
              </button>
            </div>

            {thoughts.length > 0 && (
              <div style={{ padding: "0 1.5rem 1.25rem", display: "flex", flexDirection: "column", gap: "0.5rem", maxHeight: "14rem", overflowY: "auto" }}>
                {thoughts.map((t, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.625rem", padding: "0.625rem 0.875rem", borderRadius: "0.75rem", background: "rgba(16,185,129,0.06)" }}>
                    <Leaf size={12} style={{ color: "#10b981", flexShrink: 0 }} />
                    <span className="text-gray-700 dark:text-gray-200" style={{ flex: 1, fontSize: "0.875rem" }}>{t}</span>
                    <button onClick={() => remove(i)} style={{ background: "none", border: "none", cursor: "pointer", padding: "0.125rem" }} className="text-gray-300 hover:text-red-400">
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ padding: "0.75rem 1.5rem", borderTop: "1px solid rgba(0,0,0,0.04)" }}>
              <p className="text-gray-400" style={{ fontSize: "0.6875rem" }}>Thoughts are stored locally. Review and convert to tasks later.</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
