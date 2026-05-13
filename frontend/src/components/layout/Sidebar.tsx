import { useQuery } from "@tanstack/react-query";
import {
  Sun, CalendarDays, CheckCheck, Tag, Settings,
  Plus, Hash, LogOut, LayoutDashboard, Calendar,
  ChevronDown, Flame, Grid2x2, Timer, X, BarChart2,
  Activity, Inbox, Moon, Zap,
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
    icon, label, active, onClick, badge,
  }: {
    icon: React.ReactNode; label: string; active: boolean;
    onClick: () => void; badge?: number;
  }) {
    return (
      <button
        onClick={onClick}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: "0.625rem",
          padding: "0.5rem 0.75rem", borderRadius: "0.625rem",
          fontSize: "0.875rem", fontWeight: active ? 600 : 450,
          cursor: "pointer", border: "none", textAlign: "left",
          transition: "all 0.15s",
          background: active ? "rgba(124,111,247,0.1)" : "transparent",
          color: active ? "#7c6ff7" : "inherit",
          letterSpacing: "-0.005em",
        }}
        className={active ? "" : "text-gray-500 dark:text-gray-400 hover:bg-black/5 dark:hover:bg-white/5 hover:text-gray-800 dark:hover:text-gray-200"}
      >
        <span style={{ flexShrink: 0, opacity: active ? 1 : 0.65, display: "flex" }}>{icon}</span>
        <span style={{ flex: 1 }}>{label}</span>
        {badge !== undefined && badge > 0 && (
          <span style={{
            fontSize: "0.6875rem", fontWeight: 600,
            background: active ? "rgba(124,111,247,0.15)" : "rgba(0,0,0,0.06)",
            color: active ? "#7c6ff7" : "#9ca3af",
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
      <div style={{ display: "flex", alignItems: "center", padding: "0 0.5rem", marginTop: "0.625rem", marginBottom: "0.125rem" }}>
        <button
          onClick={onToggle}
          style={{
            flex: 1, display: "flex", alignItems: "center", gap: "0.375rem",
            background: "none", border: "none", cursor: "pointer", padding: "0.25rem 0.25rem", borderRadius: "0.375rem",
          }}
          className="text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400"
        >
          <span style={{ fontSize: "0.625rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>
            {label}
          </span>
          <ChevronDown size={9} style={{ transform: open ? "none" : "rotate(-90deg)", transition: "transform 0.15s" }} />
        </button>
        {onAdd && (
          <button
            onClick={onAdd}
            style={{ padding: "0.25rem", borderRadius: "0.375rem", background: "none", border: "none", cursor: "pointer" }}
            className="text-gray-400 dark:text-gray-600 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition"
          >
            <Plus size={12} />
          </button>
        )}
      </div>
    );
  }

  return (
    <>
    {daySummaryOpen && <DaySummary onClose={() => setDaySummaryOpen(false)} />}
    <aside style={{
      width: "236px", flexShrink: 0, height: "100%",
      display: "flex", flexDirection: "column",
      background: "var(--color-surface)",
      borderRight: "1px solid var(--color-border)",
    }}>

      {/* ── User + XP ── */}
      <div style={{ padding: "1.25rem 1rem 0.875rem" }}>

        {onClose && (
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "0.625rem" }}>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: "0.25rem", display: "flex", borderRadius: "0.5rem" }} className="text-gray-400 hover:text-gray-600 hover:bg-black/5 dark:hover:bg-white/5 transition">
              <X size={16} />
            </button>
          </div>
        )}

        {/* Avatar + name */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "1rem" }}>
          <div style={{
            width: "2.25rem", height: "2.25rem", borderRadius: "0.625rem",
            background: "linear-gradient(135deg, #7c6ff7, #a78bfa)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "white", fontSize: "0.875rem", fontWeight: 800, flexShrink: 0,
            boxShadow: "0 2px 8px rgba(124,111,247,0.3)",
          }}>
            {user?.name?.[0]?.toUpperCase() ?? "U"}
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: "0.875rem", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} className="text-gray-900 dark:text-white">
              {user?.name}
            </p>
            <p style={{ fontSize: "0.6875rem", color: "#7c6ff7", fontWeight: 600 }}>Level {level}</p>
          </div>
        </div>

        {/* XP card */}
        <div style={{
          borderRadius: "0.75rem", padding: "0.75rem 0.875rem",
          background: "rgba(124,111,247,0.06)",
          border: "1px solid rgba(124,111,247,0.12)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#7c6ff7" }}>{xp} XP</span>
            <span style={{ fontSize: "0.625rem", fontWeight: 500, color: "#9ca3af" }}>{xpNext} to next</span>
          </div>
          <div style={{ borderRadius: "999px", height: "0.3125rem", overflow: "hidden", background: "rgba(124,111,247,0.15)" }}>
            <div style={{
              background: "linear-gradient(90deg, #7c6ff7, #a78bfa)",
              borderRadius: "999px", height: "100%",
              width: `${Math.max(2, Math.round(xpProgress * 100))}%`,
              transition: "width 0.5s ease",
            }} />
          </div>
          {streak > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", marginTop: "0.5rem" }}>
              <Flame size={11} color="#fb923c" />
              <span style={{ fontSize: "0.6875rem", fontWeight: 600, color: "#fb923c" }}>{streak} day streak</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Nav ── */}
      <nav style={{ flex: 1, overflowY: "auto", padding: "0.25rem 0.625rem 1rem", display: "flex", flexDirection: "column", gap: "0.0625rem" }}>

        <NavItem icon={<Sun size={15} />}           label="Today"        active={isViewActive("today")}     onClick={() => goToView("today")} />
        <NavItem icon={<CalendarDays size={15} />}  label="Next 7 Days"  active={isViewActive("upcoming")}  onClick={() => goToView("upcoming")} />
        <NavItem icon={<Inbox size={15} />}         label="Tasks"        active={isViewActive("inbox")}     onClick={() => goToView("inbox")} />

        <div style={{ height: "1px", margin: "0.375rem 0.25rem", background: "var(--color-border)" }} />

        <NavItem icon={<LayoutDashboard size={15} />} label="Dashboard"     active={isPathActive("/dashboard")} onClick={() => goTo("/dashboard")} />
        <NavItem icon={<Calendar size={15} />}        label="Calendar"      active={isPathActive("/calendar")}  onClick={() => goTo("/calendar")} />
        <NavItem icon={<Grid2x2 size={15} />}         label="Matrix"        active={isPathActive("/matrix")}    onClick={() => goTo("/matrix")} />
        <NavItem icon={<Timer size={15} />}           label="Focus"         active={isPathActive("/focus")}     onClick={() => goTo("/focus")} />
        <NavItem icon={<BarChart2 size={15} />}       label="Weekly Review" active={isPathActive("/review")}    onClick={() => goTo("/review")} />
        <NavItem icon={<Activity size={15} />}        label="Habits"        active={isPathActive("/habits")}    onClick={() => goTo("/habits")} />
        <NavItem icon={<Zap size={15} />}            label="Skills"        active={isPathActive("/skills")}    onClick={() => goTo("/skills")} />

        <div style={{ height: "1px", margin: "0.375rem 0.25rem", background: "var(--color-border)" }} />

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
              icon={<span style={{ width: "0.4375rem", height: "0.4375rem", borderRadius: "3px", background: p.color, display: "inline-block", flexShrink: 0 }} />}
              label={p.name}
              active={isViewActive(`project:${p.id}`)}
              onClick={() => goToView(`project:${p.id}`)}
              badge={p._count?.tasks}
            />
          ))}

        {tags.length > 0 && (
          <>
            <div style={{ height: "1px", margin: "0.375rem 0.25rem", background: "var(--color-border)" }} />
            <SectionHeader
              label="Tags"
              open={tagsOpen}
              onToggle={() => setTagsOpen(!tagsOpen)}
            />
            {tagsOpen && tags.map((t: { id: string; name: string; color: string }) => (
              <NavItem
                key={t.id}
                icon={<Hash size={13} style={{ color: t.color }} />}
                label={t.name}
                active={isViewActive(`tag:${t.id}`)}
                onClick={() => goToView(`tag:${t.id}`)}
              />
            ))}
          </>
        )}

        <div style={{ height: "1px", margin: "0.375rem 0.25rem", background: "var(--color-border)" }} />
        <NavItem icon={<CheckCheck size={15} />} label="Completed" active={isViewActive("completed")} onClick={() => goToView("completed")} />
      </nav>

      {/* ── Bottom ── */}
      <div style={{ borderTop: "1px solid var(--color-border)", padding: "0.5rem 0.625rem" }}>
        {[
          { label: "End Day", icon: <Moon size={14} />, action: () => setDaySummaryOpen(true) },
          { label: "Manage Tags", icon: <Tag size={14} />, action: () => goTo("/tags") },
          { label: "Settings",    icon: <Settings size={14} />, action: () => goTo("/settings") },
          {
            label: theme === "light" ? "Dark Mode" : "Light Mode",
            icon: <span style={{ fontSize: "0.875rem", lineHeight: 1 }}>{theme === "light" ? "🌙" : "☀️"}</span>,
            action: toggleTheme,
          },
          { label: "Sign Out", icon: <LogOut size={14} />, action: () => { logout(); navigate("/login"); onClose?.(); }, danger: true },
        ].map(({ label, icon, action, danger }) => (
          <button
            key={label}
            onClick={action}
            style={{
              width: "100%", display: "flex", alignItems: "center", gap: "0.625rem",
              padding: "0.4375rem 0.75rem", borderRadius: "0.625rem",
              fontSize: "0.8125rem", fontWeight: 500, cursor: "pointer",
              border: "none", textAlign: "left", background: "transparent",
              transition: "all 0.15s",
            }}
            className={danger
              ? "text-gray-400 dark:text-gray-600 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 dark:hover:text-red-400"
              : "text-gray-400 dark:text-gray-500 hover:bg-black/5 dark:hover:bg-white/5 hover:text-gray-800 dark:hover:text-gray-200"
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
