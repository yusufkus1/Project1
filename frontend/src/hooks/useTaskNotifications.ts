import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { tasksApi, Task } from "../api/tasks";
import { useAuthStore } from "../store/auth";

const CHECK_INTERVAL_MS = 60_000; // every minute
const SOON_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes

function notify(title: string, body: string, tag: string) {
  if (Notification.permission !== "granted") return;
  new Notification(title, { body, tag, icon: "/favicon.svg", badge: "/favicon.svg" });
}

export function useTaskNotifications() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const qc = useQueryClient();
  const notifiedIds = useRef<Set<string>>(new Set());

  // Ask permission once when user is logged in
  useEffect(() => {
    if (!isAuthenticated) return;
    if (Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;

    async function check() {
      if (Notification.permission !== "granted") return;

      let tasks: Task[] = [];
      try {
        // Use cached data first, fall back to fresh fetch
        const cached = qc.getQueryData<{ tasks: Task[] }>(["tasks"]);
        tasks = cached?.tasks ?? (await tasksApi.getAll()).tasks;
      } catch {
        return;
      }

      const now = Date.now();

      for (const task of tasks) {
        if (task.status === "COMPLETED" || task.isArchived) continue;

        // Due date approaching (within 30 min)
        if (task.dueDate) {
          const due = new Date(task.dueDate).getTime();
          const msToDue = due - now;
          const tag = `due-soon-${task.id}`;

          if (msToDue > 0 && msToDue <= SOON_THRESHOLD_MS && !notifiedIds.current.has(tag)) {
            const mins = Math.round(msToDue / 60000);
            notify(
              "Task due soon",
              `"${task.title}" is due in ${mins} minute${mins !== 1 ? "s" : ""}`,
              tag,
            );
            notifiedIds.current.add(tag);
          }

          // Overdue (notify once per session)
          const overdueTag = `overdue-${task.id}`;
          if (msToDue < 0 && !notifiedIds.current.has(overdueTag)) {
            notify("Task overdue", `"${task.title}" is past its due date`, overdueTag);
            notifiedIds.current.add(overdueTag);
          }
        }

        // Reminder time hit
        if (task.reminder) {
          const reminderTime = new Date(task.reminder).getTime();
          const tag = `reminder-${task.id}`;
          const diff = now - reminderTime;
          // within the last 2 minutes (catches the interval gap)
          if (diff >= 0 && diff < CHECK_INTERVAL_MS * 2 && !notifiedIds.current.has(tag)) {
            notify("Reminder", `"${task.title}"`, tag);
            notifiedIds.current.add(tag);
          }
        }
      }
    }

    check();
    const id = setInterval(check, CHECK_INTERVAL_MS);
    return () => clearInterval(id);
  }, [isAuthenticated, qc]);
}
