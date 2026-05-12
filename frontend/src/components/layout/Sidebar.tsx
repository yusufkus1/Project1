import { useQuery } from "@tanstack/react-query";
import {
  Sun, CalendarDays, CheckCheck, Tag, Settings,
  Plus, Hash, LogOut, LayoutDashboard, Calendar,
  ChevronDown, Flame, Grid2x2, Timer, X, BarChart2,
  Activity, Inbox, Moon,
} from "lucide-react";
import { useState } from "react";
import { projectsApi } from "../../api/projects";
import { tagsApi } from "../../api/tags";
import { useUIStore, View } from "../../store/ui";
import { useAuthStore } from "../../store/auth";
import { useGamificationStore } from "../../store/gamification";
import { useNavigate, useLocation } from "react-router-dom";
import { DaySummary } from "../DaySummary";

export function Sidebar({ onClose }: { onClose?: () => void }) {
  const { selectedView, setSelectedView, theme, toggleTheme } = useUIStore();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [listsOpen, setListsOpen] = useState(true);
  const [tagsOpen, setTagsOpen] = useState(true);
  const [daySummaryOpen, setDaySummaryOpen] = useState(false);

  const { xp, streak, getLevel, getXPProgress, getXPForNextLevel } = useGamificationStore();
  const level = getLevel();
  const xpProgress = getXPProgress();
  const xpNext = getXPForNextLevel();

  const { data: projects = [] } = useQuery({ queryKey: ["projects"], queryFn: projectsApi.getAll });
  const { data: tags = [] } = useQuery({ queryKey: ["tags"], queryFn: tagsApi.getAll });

  const isViewActive = (view: View) => location.pathname === "/" && selectedView === view;
  const isPathActive = (path: string) => location.pathname === path;

  const goToView = (view: View) => { navigate("/"); setSelectedView(view); onClose?.(); };
  const goTo = (path: string) => { navigate(path); onClose?.(); };

  function NavItem({
    icon, label, active, onClick,
    badge,
  }: {
    icon: React.ReactNode; label: string; active: boolean;
    onClick: () => void; badge?: number;
  }) {
    return (
      <button
        onClick={onClick}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: "0.75rem",
          padding: "0.625rem 0.875rem", borderRadius: "0.75rem",
          fontSize: "0.875rem", fontWeight: active ? 600 : 500,
          cursor: "pointer", border: "none", textAlign: "left",
          transition: "all 0.15s",
          background: active ? "rgba(99,102,241,0.12)" : "transparent",
          color: active ? "#6366f1" : undefined,
        }}
        className={active ? "" : "text-gray-600 dark:text-gray-400 hover:bg-gray-200/60 dark:hover:bg-gray-800/60 hover:text-gray-900 dark:hover:text-gray-200"}
      >
        <span style={{ flexShrink: 0, opacity: active ? 1 : 0.7 }}>{icon}</span>
        <span style={{ flex: 1 }}>{label}</span>
        {badge !== undefined && badge > 0 && (
          <span style={{
            fontSize: "0.6875rem", fontWeight: 700,
            background: active ? "#6366f1" : "rgba(156,163,175,0.2)",
            color: active ? "white" : "#9ca3af",
            borderRadius: "999px", padding: "0.1rem 0.45rem", flexShrink: 0,
          }}>
            {badge}
          </span>
        )}
      </button>
    );
  }

  function SectionHeader({
    label, onAdd, onToggle, open,
  }: {
    label: string; onAdd?: () => void; onToggle: () => void; open: boolean;
  }) {
    return (
      <div style={{ display: "flex", alignItems: "center", padding: "0 0.5rem", marginTop: "0.5rem", marginBottom: "0.25rem" }}>
        <button
          onClick={onToggle}
          style={{
            flex: 1, display: "flex", alignItems: "center", gap: "0.375rem",
            background: "none", border: "none", cursor: "pointer", padding: "0.25rem 0.375rem", borderRadius: "0.375rem",
          }}
          className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <span style={{ fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            {label}
          </span>
          <ChevronDown size={10} style={{ transform: open ? "none" : "rotate(-90deg)", transition: "transform 0.15s", marginLeft: "0.125rem" }} />
        </button>
        {onAdd && (
          <button
            onClick={onAdd}
            style={{ padding: "0.25rem", borderRadius: "0.375rem", background: "none", border: "none", cursor: "pointer" }}
            className="text-gray-400 dark:text-gray-500 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
          >
            <Plus size={13} />
          </button>
        )}
      </div>
    );
  }

  return (
    <>
    {daySummaryOpen && <DaySummary onClose={() => setDaySummaryOpen(false)} />}
    <aside className="bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800" style={{
      width: "248px", flexShrink: 0, height: "100%",
      display: "flex", flexDirection: "column",
      borderRight: "1px solid",
    }}>

      {/* ── User + XP ── */}
      <div style={{ padding: "1.5rem 1.125rem 1rem" }}>

        {/* Close button (mobile) */}
        {onClose && (
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "0.75rem" }}>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: "0.25rem", display: "flex", borderRadius: "0.5rem" }} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800">
              <X size={18} />
            </button>
          </div>
        )}

        {/* Avatar + name */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.25rem" }}>
          <div style={{
            width: "2.375rem", height: "2.375rem", borderRadius: "0.75rem",
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "white", fontSize: "0.9375rem", fontWeight: 800, flexShrink: 0,
          }}>
            {user?.name?.[0]?.toUpperCase() ?? "U"}
          </div>
          <div style={{ minWidth: 0 }}>
            <p className="text-gray-900 dark:text-white" style={{ fontSize: "0.9375rem", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {user?.name}
            </p>
            <p style={{ fontSize: "0.75rem", color: "#6366f1", fontWeight: 600 }}>Level {level}</p>
          </div>
        </div>

        {/* XP bar */}
        <div className="bg-gray-50 dark:bg-gray-800" style={{ borderRadius: "0.875rem", padding: "0.875rem 1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.625rem" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#6366f1" }}>{xp} XP</span>
            <span className="text-gray-400 dark:text-gray-500" style={{ fontSize: "0.6875rem" }}>Next: {xpNext} XP</span>
          </div>
          <div className="bg-gray-200 dark:bg-gray-700" style={{ borderRadius: "999px", height: "0.375rem", overflow: "hidden" }}>
            <div style={{
              background: "linear-gradient(90deg, #6366f1, #8b5cf6)",
              borderRadius: "999px", height: "100%",
              width: `${Math.max(2, Math.round(xpProgress * 100))}%`,
              transition: "width 0.5s ease",
            }} />
          </div>
          {streak > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", marginTop: "0.625rem" }}>
              <Flame size={12} color="#f97316" />
              <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#f97316" }}>{streak} day streak</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Nav ── */}
      <nav style={{ flex: 1, overflowY: "auto", padding: "0 0.625rem 1rem", display: "flex", flexDirection: "column", gap: "0.125rem" }}>

        <NavItem icon={<Sun size={16} />}           label="Today"        active={isViewActive("today")}     onClick={() => goToView("today")} />
        <NavItem icon={<CalendarDays size={16} />}  label="Next 7 Days"  active={isViewActive("upcoming")}  onClick={() => goToView("upcoming")} />
        <NavItem icon={<Inbox size={16} />}         label="Tasks"        active={isViewActive("inbox")}     onClick={() => goToView("inbox")} />

        <div style={{ height: "1px", margin: "0.5rem 0.25rem" }} className="bg-gray-100 dark:bg-gray-800" />

        <NavItem icon={<LayoutDashboard size={16} />} label="Dashboard"     active={isPathActive("/dashboard")} onClick={() => goTo("/dashboard")} />
        <NavItem icon={<Calendar size={16} />}        label="Calendar"      active={isPathActive("/calendar")}  onClick={() => goTo("/calendar")} />
        <NavItem icon={<Grid2x2 size={16} />}         label="Matrix"        active={isPathActive("/matrix")}    onClick={() => goTo("/matrix")} />
        <NavItem icon={<Timer size={16} />}           label="Focus"         active={isPathActive("/focus")}     onClick={() => goTo("/focus")} />
        <NavItem icon={<BarChart2 size={16} />}       label="Weekly Review" active={isPathActive("/review")}    onClick={() => goTo("/review")} />
        <NavItem icon={<Activity size={16} />}        label="Habits"        active={isPathActive("/habits")}    onClick={() => goTo("/habits")} />

        <div style={{ height: "1px", margin: "0.5rem 0.25rem" }} className="bg-gray-100 dark:bg-gray-800" />

        {/* Lists */}
        <SectionHeader
          label="Lists"
          open={listsOpen}
          onToggle={() => setListsOpen(!listsOpen)}
          onAdd={() => goTo("/projects/new")}
        />
        {listsOpen && projects
          .filter((p: { isArchived: boolean }) => !p.isArchived)
          .map((p: { id: string; name: string; color: string; _count?: { tasks: number } }) => (
            <NavItem
              key={p.id}
              icon={<span style={{ width: "0.5rem", height: "0.5rem", borderRadius: "3px", background: p.color, display: "inline-block", flexShrink: 0 }} />}
              label={p.name}
              active={isViewActive(`project:${p.id}`)}
              onClick={() => goToView(`project:${p.id}`)}
              badge={p._count?.tasks}
            />
          ))}

        {/* Tags */}
        {tags.length > 0 && (
          <>
            <div style={{ height: "1px", margin: "0.5rem 0.25rem" }} className="bg-gray-100 dark:bg-gray-800" />
            <SectionHeader
              label="Tags"
              open={tagsOpen}
              onToggle={() => setTagsOpen(!tagsOpen)}
            />
            {tagsOpen && tags.map((t: { id: string; name: string; color: string }) => (
              <NavItem
                key={t.id}
                icon={<Hash size={14} style={{ color: t.color }} />}
                label={t.name}
                active={isViewActive(`tag:${t.id}`)}
                onClick={() => goToView(`tag:${t.id}`)}
              />
            ))}
          </>
        )}

        <div style={{ height: "1px", margin: "0.5rem 0.25rem" }} className="bg-gray-100 dark:bg-gray-800" />

        <NavItem icon={<CheckCheck size={16} />} label="Completed" active={isViewActive("completed")} onClick={() => goToView("completed")} />
      </nav>

      {/* ── Bottom ── */}
      <div className="border-gray-100 dark:border-gray-800" style={{ borderTop: "1px solid", padding: "0.75rem 0.625rem" }}>
        {[
          { label: "End Day", icon: <Moon size={15} />, action: () => setDaySummaryOpen(true) },
          { label: "Manage Tags", icon: <Tag size={15} />, action: () => goTo("/tags") },
          { label: "Settings",    icon: <Settings size={15} />, action: () => goTo("/settings") },
          {
            label: theme === "light" ? "Dark Mode" : "Light Mode",
            icon: <span style={{ fontSize: "0.9rem", lineHeight: 1 }}>{theme === "light" ? "🌙" : "☀️"}</span>,
            action: toggleTheme,
          },
          { label: "Sign Out", icon: <LogOut size={15} />, action: () => { logout(); navigate("/login"); onClose?.(); }, danger: true },
        ].map(({ label, icon, action, danger }) => (
          <button
            key={label}
            onClick={action}
            style={{
              width: "100%", display: "flex", alignItems: "center", gap: "0.75rem",
              padding: "0.5625rem 0.875rem", borderRadius: "0.75rem",
              fontSize: "0.875rem", fontWeight: 500, cursor: "pointer",
              border: "none", textAlign: "left", background: "transparent",
              transition: "all 0.15s",
            }}
            className={danger
              ? "text-gray-400 dark:text-gray-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 dark:hover:text-red-400"
              : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200"
            }
          >
            {icon}<span>{label}</span>
          </button>
        ))}
      </div>
    </aside>
    </>
  );
}
