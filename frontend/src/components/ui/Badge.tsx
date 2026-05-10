interface BadgeProps {
  label: string;
  color?: string;
  variant?: "priority" | "status" | "tag";
}

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  MEDIUM: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
  HIGH: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  CRITICAL: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};

const PRIORITY_LABELS: Record<string, string> = {
  LOW: "Low", MEDIUM: "Medium", HIGH: "High", CRITICAL: "Critical",
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
  IN_PROGRESS: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  COMPLETED: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending", IN_PROGRESS: "In Progress", COMPLETED: "Completed",
};

export function PriorityBadge({ priority }: { priority: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${PRIORITY_COLORS[priority] ?? ""}`}>
      {PRIORITY_LABELS[priority] ?? priority}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[status] ?? ""}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

export function TagBadge({ label, color }: BadgeProps) {
  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold text-white"
      style={{ backgroundColor: color ?? "#6366f1" }}
    >
      {label}
    </span>
  );
}
