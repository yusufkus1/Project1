import { useQuery } from "@tanstack/react-query";
import {
  Inbox, Sun, CalendarDays, CheckCheck, Tag, Settings,
  Plus, Hash, LogOut, LayoutDashboard, Calendar, ChevronDown, Flame, Grid2x2, Timer, X, BarChart2,
} from "lucide-react";
import { useState } from "react";
import { projectsApi } from "../../api/projects";
import { tagsApi } from "../../api/tags";
import { useUIStore, View } from "../../store/ui";
import { useAuthStore } from "../../store/auth";
import { useGamificationStore } from "../../store/gamification";
import { useNavigate, useLocation } from "react-router-dom";

export function Sidebar({ onClose }: { onClose?: () => void }) {
  const { selectedView, setSelectedView, theme, toggleTheme } = useUIStore();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [listsOpen, setListsOpen] = useState(true);
  const [tagsOpen, setTagsOpen] = useState(true);

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

  const itemBase: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "0.625rem",
    padding: "0.5rem 0.75rem",
    borderRadius: "0.5rem",
    fontSize: "0.8125rem",
    fontWeight: 500,
    cursor: "pointer",
    transition: "all 0.15s",
    userSelect: "none",
  };

  const activeStyle: React.CSSProperties = {
    ...itemBase,
    background: "rgba(99,102,241,0.12)",
    color: "#6366f1",
    fontWeight: 600,
  };

  const inactiveStyle: React.CSSProperties = {
    ...itemBase,
    color: "var(--sidebar-text, #6b7280)",
  };

  const navItem = (active: boolean) => active ? activeStyle : inactiveStyle;

  const sectionLabel: React.CSSProperties = {
    fontSize: "0.6875rem",
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "#9ca3af",
    padding: "0 0.75rem",
    marginBottom: "0.25rem",
    marginTop: "0.25rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  };

  return (
    <aside style={{
      width: "220px",
      flexShrink: 0,
      height: "100%",
      display: "flex",
      flexDirection: "column",
      borderRight: "1px solid",
      borderColor: "var(--sidebar-border)",
    }} className="bg-gray-100/80 dark:bg-gray-900 border-gray-200/80 dark:border-gray-800">

      {/* User */}
      <div style={{ padding: "1.25rem 1rem 1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "1rem" }}>
          {onClose && (
            <button onClick={onClose} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", padding: "0.25rem", display: "flex" }} className="text-gray-400">
              <X size={18} />
            </button>
          )}
          <div style={{
            width: "2rem", height: "2rem", borderRadius: "50%",
            background: "#6366f1", display: "flex", alignItems: "center",
            justifyContent: "center", color: "white", fontSize: "0.8125rem",
            fontWeight: 700, flexShrink: 0,
          }}>
            {user?.name?.[0]?.toUpperCase() ?? "U"}
          </div>
          <span style={{ fontSize: "0.875rem", fontWeight: 600 }} className="text-gray-800 dark:text-gray-200 truncate">
            {user?.name}
          </span>
        </div>

        {/* XP card */}
        <div className="bg-white dark:bg-gray-800" style={{ borderRadius: "0.75rem", padding: "0.875rem 1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.625rem" }}>
            <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#6366f1" }}>Lv.{level}</span>
            <span style={{ fontSize: "0.75rem" }} className="text-gray-400">{xp} / {xpNext} XP</span>
          </div>
          <div className="bg-gray-100 dark:bg-gray-700" style={{ borderRadius: "999px", height: "0.375rem", overflow: "hidden" }}>
            <div style={{
              background: "#6366f1",
              borderRadius: "999px",
              height: "100%",
              width: `${Math.max(2, Math.round(xpProgress * 100))}%`,
              transition: "width 0.5s ease",
            }} />
          </div>
          {streak > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", marginTop: "0.5rem" }}>
              <Flame size={11} color="#f97316" />
              <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#f97316" }}>{streak} day streak</span>
            </div>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: "auto", padding: "0 0.5rem", display: "flex", flexDirection: "column", gap: "0.125rem" }}>

        <div style={navItem(isViewActive("today"))} onClick={() => goToView("today")}>
          <Sun size={15} style={{ flexShrink: 0 }} /><span>Today</span>
        </div>
        <div style={navItem(isViewActive("upcoming"))} onClick={() => goToView("upcoming")}>
          <CalendarDays size={15} style={{ flexShrink: 0 }} /><span>Next 7 Days</span>
        </div>
        <div style={navItem(isViewActive("inbox"))} onClick={() => goToView("inbox")}>
          <Inbox size={15} style={{ flexShrink: 0 }} /><span>Inbox</span>
        </div>
        <div style={navItem(isPathActive("/calendar"))} onClick={() => goTo("/calendar")}>
          <Calendar size={15} style={{ flexShrink: 0 }} /><span>Calendar</span>
        </div>
        <div style={navItem(isPathActive("/dashboard"))} onClick={() => goTo("/dashboard")}>
          <LayoutDashboard size={15} style={{ flexShrink: 0 }} /><span>Dashboard</span>
        </div>
        <div style={navItem(isPathActive("/matrix"))} onClick={() => goTo("/matrix")}>
          <Grid2x2 size={15} style={{ flexShrink: 0 }} /><span>Matrix</span>
        </div>
        <div style={navItem(isPathActive("/focus"))} onClick={() => goTo("/focus")}>
          <Timer size={15} style={{ flexShrink: 0 }} /><span>Focus</span>
        </div>
        <div style={navItem(isPathActive("/review"))} onClick={() => goTo("/review")}>
          <BarChart2 size={15} style={{ flexShrink: 0 }} /><span>Weekly Review</span>
        </div>

        {/* Divider */}
        <div style={{ height: "1px", margin: "0.625rem 0.75rem" }} className="bg-gray-200 dark:bg-gray-800" />

        {/* Lists */}
        <button
          onClick={() => setListsOpen(!listsOpen)}
          style={{ ...sectionLabel, background: "none", border: "none", cursor: "pointer", width: "100%" }}
          className="hover:text-gray-600 dark:hover:text-gray-300"
        >
          <span>Lists</span>
          <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
            <Plus
              size={12}
              onClick={(e) => { e.stopPropagation(); goTo("/projects/new"); }}
              style={{ cursor: "pointer" }}
            />
            <ChevronDown size={11} style={{ transform: listsOpen ? "none" : "rotate(-90deg)", transition: "transform 0.15s" }} />
          </div>
        </button>

        {listsOpen && projects
          .filter((p: { isArchived: boolean }) => !p.isArchived)
          .map((p: { id: string; name: string; color: string; _count?: { tasks: number } }) => (
            <div
              key={p.id}
              style={navItem(isViewActive(`project:${p.id}`))}
              onClick={() => goToView(`project:${p.id}`)}
            >
              <span style={{ width: "0.5rem", height: "0.5rem", borderRadius: "2px", flexShrink: 0, background: p.color }} />
              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
              {p._count && <span style={{ fontSize: "0.6875rem" }} className="text-gray-400">{p._count.tasks}</span>}
            </div>
          ))}

        {/* Tags */}
        {tags.length > 0 && (
          <>
            <div style={{ height: "1px", margin: "0.625rem 0.75rem" }} className="bg-gray-200 dark:bg-gray-800" />
            <button
              onClick={() => setTagsOpen(!tagsOpen)}
              style={{ ...sectionLabel, background: "none", border: "none", cursor: "pointer", width: "100%" }}
            >
              <span>Tags</span>
              <ChevronDown size={11} style={{ transform: tagsOpen ? "none" : "rotate(-90deg)", transition: "transform 0.15s" }} />
            </button>
            {tagsOpen && tags.map((t: { id: string; name: string; color: string }) => (
              <div key={t.id} style={navItem(isViewActive(`tag:${t.id}`))} onClick={() => goToView(`tag:${t.id}`)}>
                <Hash size={13} style={{ flexShrink: 0, color: t.color }} />
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</span>
              </div>
            ))}
          </>
        )}

        {/* Divider */}
        <div style={{ height: "1px", margin: "0.625rem 0.75rem" }} className="bg-gray-200 dark:bg-gray-800" />

        <div style={navItem(isViewActive("completed"))} onClick={() => goToView("completed")}>
          <CheckCheck size={15} style={{ flexShrink: 0 }} /><span>Completed</span>
        </div>
      </nav>

      {/* Bottom */}
      <div style={{ borderTop: "1px solid", padding: "0.5rem" }} className="border-gray-200 dark:border-gray-800">
        {[
          { label: "Manage Tags", icon: <Tag size={14} />, action: () => goTo("/tags") },
          { label: "Settings", icon: <Settings size={14} />, action: () => goTo("/settings") },
          {
            label: theme === "light" ? "Dark Mode" : "Light Mode",
            icon: <span style={{ fontSize: "0.875rem" }}>{theme === "light" ? "🌙" : "☀️"}</span>,
            action: toggleTheme,
          },
          { label: "Sign Out", icon: <LogOut size={14} />, action: () => { logout(); navigate("/login"); onClose?.(); }, danger: true },
        ].map(({ label, icon, action, danger }) => (
          <div
            key={label}
            onClick={action}
            style={{
              display: "flex", alignItems: "center", gap: "0.625rem",
              padding: "0.5rem 0.75rem", borderRadius: "0.5rem",
              fontSize: "0.8125rem", fontWeight: 500, cursor: "pointer",
              transition: "all 0.15s",
            }}
            className={danger
              ? "text-gray-500 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400"
              : "text-gray-500 dark:text-gray-400 hover:bg-white/60 dark:hover:bg-gray-800/60 hover:text-gray-800 dark:hover:text-gray-200"
            }
          >
            {icon}<span>{label}</span>
          </div>
        ))}
      </div>
    </aside>
  );
}
