import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { Menu } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { TaskDetailPanel } from "../tasks/TaskDetailPanel";
import { useUIStore } from "../../store/ui";

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
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div style={{ display: "flex", height: "100svh", overflow: "hidden" }} className="bg-gray-50 dark:bg-gray-950">

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
          <div style={{
            display: "flex", alignItems: "center", gap: "0.75rem",
            padding: "0.875rem 1rem", borderBottom: "1px solid",
            flexShrink: 0,
          }} className="bg-gray-100/80 dark:bg-gray-900 border-gray-200 dark:border-gray-800">
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
            <span style={{ fontSize: "1rem", fontWeight: 700, color: "#6366f1" }}>TodoApp</span>
          </div>
        )}

        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          <main
            style={{ flex: 1, overflowY: "auto", padding: isMobile ? "1.25rem 1rem" : "3rem 4rem" }}
          >
            <Outlet />
          </main>
          {selectedTaskId && <TaskDetailPanel />}
        </div>
      </div>
    </div>
  );
}
