import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { TaskDetailPanel } from "../tasks/TaskDetailPanel";
import { useUIStore } from "../../store/ui";

export function AppLayout() {
  const selectedTaskId = useUIStore((s) => s.selectedTaskId);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      <Sidebar />
      <div className="flex-1 flex overflow-hidden">
        <main
          className="flex-1 overflow-y-auto"
          style={{ padding: "3rem 4rem" }}
        >
          <Outlet />
        </main>
        {selectedTaskId && <TaskDetailPanel />}
      </div>
    </div>
  );
}
