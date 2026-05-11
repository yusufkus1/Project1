import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { tasksApi, Task } from "../api/tasks";
import { useAuthStore } from "../store/auth";

const CHECK_INTERVAL_MS = 60_000;
const SOON_THRESHOLD_MS = 30 * 60 * 1000;
const WATER_INTERVAL_MS = 2 * 60 * 60 * 1000;
const WATER_KEY = "todoapp_last_water_reminder";

function notify(title: string, body: string, tag: string) {
  if (Notification.permission !== "granted") return;
  new Notification(title, { body, tag, icon: "/favicon.svg", badge: "/favicon.svg" });
}

export function useTaskNotifications() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const qc = useQueryClient();
  const notifiedIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!isAuthenticated) return;

    async function check() {
      if (Notification.permission !== "granted") return;

      let tasks: Task[] = [];
      try {
        const cached = qc.getQueryData<{ tasks: Task[] }>(["tasks"]);
        tasks = cached?.tasks ?? (await tasksApi.getAll()).tasks;
      } catch {
        return;
      }

      const now = Date.now();

      // Water / break reminder — every 2 hours regardless of tasks
      const lastWater = Number(localStorage.getItem(WATER_KEY) ?? 0);
      if (now - lastWater >= WATER_INTERVAL_MS) {
        notify("💧 Su içmeyi unutma!", "Biraz su iç ve kısa bir mola ver.", "water-reminder");
        localStorage.setItem(WATER_KEY, String(now));
      }

      for (const task of tasks) {
        if (task.status === "COMPLETED" || task.isArchived) continue;

        if (task.dueDate) {
          const due = new Date(task.dueDate).getTime();
          const msToDue = due - now;
          const soonTag = `due-soon-${task.id}`;

          if (msToDue > 0 && msToDue <= SOON_THRESHOLD_MS && !notifiedIds.current.has(soonTag)) {
            const mins = Math.round(msToDue / 60000);
            notify(
              "Task due soon",
              `"${task.title}" is due in ${mins} minute${mins !== 1 ? "s" : ""}`,
              soonTag,
            );
            notifiedIds.current.add(soonTag);
          }

          const overdueTag = `overdue-${task.id}`;
          if (msToDue < 0 && !notifiedIds.current.has(overdueTag)) {
            notify("Task overdue", `"${task.title}" is past its due date`, overdueTag);
            notifiedIds.current.add(overdueTag);
          }
        }

        if (task.reminder) {
          const reminderTime = new Date(task.reminder).getTime();
          const tag = `reminder-${task.id}`;
          const diff = now - reminderTime;
          if (diff >= 0 && diff < CHECK_INTERVAL_MS * 2 && !notifiedIds.current.has(tag)) {
            notify("Reminder", `"${task.title}"`, tag);
            notifiedIds.current.add(tag);
          }
        }
      }
    }

    async function init() {
      if (Notification.permission === "default") {
        const result = await Notification.requestPermission();
        if (result === "granted") check();
      } else {
        check();
      }
    }

    init();
    const id = window.setInterval(check, CHECK_INTERVAL_MS);
    return () => clearInterval(id);
  }, [isAuthenticated, qc]);
}
