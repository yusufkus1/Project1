import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { Menu } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { TaskDetailPanel } from "../tasks/TaskDetailPanel";
import { QuickCapture } from "../tasks/QuickCapture";
import { DailyRitual, useDailyRitualTrigger } from "../DailyRitual";
import { useUIStore } from "../../store/ui";
import { useTaskNotifications } from "../../hooks/useTaskNotifications";

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return isMobile;
}

export function AppLayout() {
  const selectedTaskId = useUIStore((s) => s.selectedTaskId);
  const setSelectedTaskId = useUIStore((s) => s.setSelectedTaskId);
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [quickCaptureOpen, setQuickCaptureOpen] = useState(false);
  useTaskNotifications();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setQuickCaptureOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const shouldShowRitual = useDailyRitualTrigger();
  const [ritualOpen, setRitualOpen] = useState(() => {
    // Only show in morning hours (5am–12pm)
    const h = new Date().getHours();
    return shouldShowRitual && h >= 5 && h < 12;
  });

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <>
    {quickCaptureOpen && <QuickCapture onClose={() => setQuickCaptureOpen(false)} />}
    {ritualOpen && <DailyRitual onClose={() => setRitualOpen(false)} />}
    <div style={{ display: "flex", height: "100svh", overflow: "hidden", background: "var(--color-bg)" }}>

      {/* Desktop sidebar */}
      {!isMobile && <Sidebar />}

      {/* Mobile sidebar overlay */}
      {isMobile && sidebarOpen && (
        <>
          <div
            onClick={closeSidebar}
            style={{
              position: "fixed", inset: 0, zIndex: 40,
              background: "rgba(0,0,0,0.4)", backdropFilter: "blur(2px)",
            }}
          />
          <div style={{
            position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 50,
            boxShadow: "4px 0 24px rgba(0,0,0,0.15)",
          }}>
            <Sidebar onClose={closeSidebar} />
          </div>
        </>
      )}

      <div style={{ flex: 1, display: "flex", overflow: "hidden", flexDirection: "column" }}>

        {/* Mobile top bar */}
        {isMobile && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.875rem 1rem", borderBottom: "1px solid var(--color-border)", flexShrink: 0, background: "var(--color-surface)" }}>
            <button
              onClick={() => setSidebarOpen(true)}
              style={{
                background: "none", border: "none", cursor: "pointer",
                padding: "0.25rem", borderRadius: "0.375rem",
                display: "flex", alignItems: "center",
              }}
              className="text-gray-600 dark:text-gray-400"
            >
              <Menu size={22} />
            </button>
            <span style={{ fontSize: "1rem", fontWeight: 700, color: "#7c6ff7" }}>TodoApp</span>
          </div>
        )}

        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          <main style={{ flex: 1, overflowY: "auto", padding: isMobile ? "1.25rem 1rem" : "3rem 4rem" }}>
            <Outlet />
          </main>

          {/* Desktop: side panel */}
          {selectedTaskId && !isMobile && <TaskDetailPanel />}

          {/* Mobile: full-screen drawer */}
          {selectedTaskId && isMobile && (
            <>
              <div
                onClick={() => setSelectedTaskId(null)}
                style={{ position: "fixed", inset: 0, zIndex: 40, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(2px)" }}
              />
              <div style={{
                position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 50,
                width: "min(92vw, 420px)",
                boxShadow: "-4px 0 32px rgba(0,0,0,0.18)",
              }}>
                <TaskDetailPanel />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
    </>
  );
}
