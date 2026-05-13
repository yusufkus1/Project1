import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { usersApi } from "../api/users";
import { useAuthStore } from "../store/auth";
import { useUIStore } from "../store/ui";
import { useFocusStore } from "../store/focus";
import { Input } from "../components/ui/Input";
import {
  User, Lock, Moon, Sun, Bell, BellOff, Timer, Droplets, Trash2, Sparkles, Eye, EyeOff,
} from "lucide-react";
import toast from "react-hot-toast";
import { useIsMobile } from "../hooks/useIsMobile";
import { AI_KEY_STORAGE, getStoredAIKey } from "../api/ai";

interface ProfileForm { name: string; email: string }
interface PasswordForm { currentPassword: string; newPassword: string; confirm: string }

const NOTIF_KEY = "todoapp_notif_settings";

function loadNotifSettings() {
  try { return JSON.parse(localStorage.getItem(NOTIF_KEY) ?? "{}"); } catch { return {}; }
}
function saveNotifSettings(v: Record<string, boolean>) {
  localStorage.setItem(NOTIF_KEY, JSON.stringify(v));
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      style={{
        position: "relative", width: "3.25rem", height: "1.75rem",
        borderRadius: "999px", border: "none", cursor: "pointer",
        background: on ? "#7c6ff7" : "#e5e7eb",
        transition: "background 0.2s", flexShrink: 0,
      }}
    >
      <span style={{
        position: "absolute", top: "0.1875rem", left: "0.1875rem",
        width: "1.375rem", height: "1.375rem", background: "white",
        borderRadius: "50%", boxShadow: "0 1px 4px rgba(0,0,0,0.18)",
        transform: on ? "translateX(1.5rem)" : "translateX(0)",
        transition: "transform 0.2s", display: "block",
      }} />
    </button>
  );
}

function SettingRow({
  icon, color, bg, title, subtitle, right,
}: {
  icon: React.ReactNode; color: string; bg: string;
  title: string; subtitle: string; right: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "1.25rem 0" }}>
      <div style={{
        width: "2.75rem", height: "2.75rem", borderRadius: "0.75rem",
        background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p className="text-gray-900 dark:text-white" style={{ fontWeight: 600, fontSize: "0.9375rem" }}>{title}</p>
        <p className="text-gray-500 dark:text-gray-400" style={{ fontSize: "0.8125rem", marginTop: "0.125rem" }}>{subtitle}</p>
      </div>
      <div style={{ flexShrink: 0 }}>{right}</div>
    </div>
  );
}

function Divider() {
  return <div className="border-t border-gray-100 dark:border-gray-800" />;
}

export function SettingsPage() {
  const { user, setUser } = useAuthStore();
  const { theme, toggleTheme } = useUIStore();
  const { settings: focusSettings, updateSettings } = useFocusStore();
  const qc = useQueryClient();
  const isMobile = useIsMobile();

  const [tab, setTab] = useState<"profile" | "password">("profile");

  const [aiKey, setAiKey] = useState(() => getStoredAIKey());
  const [showAiKey, setShowAiKey] = useState(false);
  const aiActive = aiKey.trim().startsWith("sk-ant-");

  const saveAiKey = (val: string) => {
    setAiKey(val);
    if (val.trim()) localStorage.setItem(AI_KEY_STORAGE, val.trim());
    else localStorage.removeItem(AI_KEY_STORAGE);
  };

  const rawNotif = loadNotifSettings();
  const [notifDue, setNotifDue] = useState<boolean>(rawNotif.due ?? true);
  const [notifOverdue, setNotifOverdue] = useState<boolean>(rawNotif.overdue ?? true);
  const [notifWater, setNotifWater] = useState<boolean>(rawNotif.water ?? true);

  const toggleNotif = (key: "due" | "overdue" | "water", val: boolean) => {
    const next = { ...loadNotifSettings(), [key]: val };
    saveNotifSettings(next);
    if (key === "due") setNotifDue(val);
    if (key === "overdue") setNotifOverdue(val);
    if (key === "water") setNotifWater(val);
  };

  const FOCUS_OPTIONS = [15, 25, 30, 45, 60, 90];

  const { register: regProfile, handleSubmit: handleProfile, formState: { errors: pe } } =
    useForm<ProfileForm>({ defaultValues: { name: user?.name ?? "", email: user?.email ?? "" } });

  const { register: regPass, handleSubmit: handlePass, watch, formState: { errors: pwe }, reset: resetPass } =
    useForm<PasswordForm>();

  const updateProfile = useMutation({
    mutationFn: (v: ProfileForm) => usersApi.updateMe({ name: v.name }),
    onSuccess: (updated) => { setUser(updated); qc.invalidateQueries({ queryKey: ["me"] }); toast.success("Profile updated"); },
    onError: () => toast.error("Update failed"),
  });

  const changePassword = useMutation({
    mutationFn: (v: PasswordForm) => usersApi.changePassword(v.currentPassword, v.newPassword),
    onSuccess: () => { toast.success("Password updated"); resetPass(); },
    onError: (err: { response?: { data?: { error?: string } } }) =>
      toast.error(err.response?.data?.error ?? "Error"),
  });

  const tabs = [
    { id: "profile" as const, label: "Profile", icon: User },
    { id: "password" as const, label: "Password", icon: Lock },
  ];

  const card = {
    borderRadius: "1rem", border: "1px solid var(--color-border)",
  };

  return (
    <div style={{ maxWidth: "60rem", display: "flex", flexDirection: "column", gap: "2rem" }}>

      {/* Header */}
      <div>
        <h1 style={{ fontSize: isMobile ? "1.75rem" : "2.25rem", fontWeight: 800, marginBottom: "0.5rem" }}
            className="text-gray-900 dark:text-white">
          Settings
        </h1>
        <p className="text-gray-500 dark:text-gray-400" style={{ fontSize: "1rem" }}>
          Manage your account and preferences
        </p>
      </div>

      {/* ── Account card ── */}
      <div className="bg-white dark:bg-gray-900" style={{ ...card, overflow: "hidden" }}>
        {/* Tabs */}
        <div className="border-b border-gray-100 dark:border-gray-800" style={{ display: "flex" }}>
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
                padding: "1.25rem 1.5rem", fontSize: "0.9375rem", fontWeight: 600,
                borderBottom: "2px solid", cursor: "pointer", background: "none",
                borderBottomColor: tab === id ? "#7c6ff7" : "transparent",
                color: tab === id ? "#7c6ff7" : "#9ca3af",
                transition: "all 0.15s",
              }}
            >
              <Icon size={16} /> {label}
            </button>
          ))}
        </div>

        <div style={{ padding: isMobile ? "1.5rem 1.25rem" : "2.5rem" }}>
          {tab === "profile" && (
            <form onSubmit={handleProfile((v) => updateProfile.mutate(v))}
                  style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
              <Input
                label="Full Name"
                placeholder="Your full name"
                {...regProfile("name", { required: "Name is required" })}
                error={pe.name?.message}
              />
              <Input
                label="Email Address"
                type="email"
                placeholder="you@example.com"
                {...regProfile("email")}
                disabled
                className="opacity-60 cursor-not-allowed"
              />
              <button
                type="submit"
                disabled={updateProfile.isPending}
                style={{
                  width: "100%", padding: "1rem",
                  background: updateProfile.isPending ? "#c4bbfd" : "#7c6ff7",
                  color: "white", border: "none", borderRadius: "0.875rem",
                  fontWeight: 700, fontSize: "1rem",
                  cursor: updateProfile.isPending ? "not-allowed" : "pointer",
                  marginTop: "0.5rem",
                }}
              >
                {updateProfile.isPending ? "Saving…" : "Save Changes"}
              </button>
            </form>
          )}

          {tab === "password" && (
            <form onSubmit={handlePass((v) => changePassword.mutate(v))}
                  style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
              <Input
                label="Current Password"
                type="password"
                placeholder="Enter your current password"
                {...regPass("currentPassword", { required: "Required" })}
                error={pwe.currentPassword?.message}
              />
              <Input
                label="New Password"
                type="password"
                placeholder="At least 6 characters"
                {...regPass("newPassword", {
                  required: "Required",
                  minLength: { value: 6, message: "At least 6 characters" },
                })}
                error={pwe.newPassword?.message}
              />
              <Input
                label="Confirm New Password"
                type="password"
                placeholder="Repeat your new password"
                {...regPass("confirm", {
                  required: "Required",
                  validate: (v) => v === watch("newPassword") || "Passwords don't match",
                })}
                error={pwe.confirm?.message}
              />
              <button
                type="submit"
                disabled={changePassword.isPending}
                style={{
                  width: "100%", padding: "1rem",
                  background: changePassword.isPending ? "#c4bbfd" : "#7c6ff7",
                  color: "white", border: "none", borderRadius: "0.875rem",
                  fontWeight: 700, fontSize: "1rem",
                  cursor: changePassword.isPending ? "not-allowed" : "pointer",
                  marginTop: "0.5rem",
                }}
              >
                {changePassword.isPending ? "Updating…" : "Update Password"}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* ── Appearance card ── */}
      <div className="bg-white dark:bg-gray-900" style={{ ...card, padding: isMobile ? "1.25rem 1rem" : "1.75rem 2rem" }}>
        <p className="text-gray-400 dark:text-gray-500" style={{ fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.25rem" }}>
          Appearance
        </p>

        <SettingRow
          icon={theme === "dark" ? <Moon size={18} color="#7c6ff7" /> : <Sun size={18} color="#f59e0b" />}
          color={theme === "dark" ? "#7c6ff7" : "#f59e0b"}
          bg={theme === "dark" ? "rgba(124,111,247,0.1)" : "rgba(245,158,11,0.1)"}
          title="Theme"
          subtitle={`Currently using ${theme === "dark" ? "dark" : "light"} mode`}
          right={<Toggle on={theme === "dark"} onToggle={toggleTheme} />}
        />
      </div>

      {/* ── Notifications card ── */}
      <div className="bg-white dark:bg-gray-900" style={{ ...card, padding: isMobile ? "1.25rem 1rem" : "1.75rem 2rem" }}>
        <p className="text-gray-400 dark:text-gray-500" style={{ fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.25rem" }}>
          Notifications
        </p>

        <SettingRow
          icon={<Bell size={18} color="#7c6ff7" />}
          color="#7c6ff7"
          bg="rgba(124,111,247,0.1)"
          title="Due Soon Alerts"
          subtitle="Notify 30 minutes before a task is due"
          right={<Toggle on={notifDue} onToggle={() => toggleNotif("due", !notifDue)} />}
        />
        <Divider />
        <SettingRow
          icon={<BellOff size={18} color="#ef4444" />}
          color="#ef4444"
          bg="rgba(239,68,68,0.1)"
          title="Overdue Alerts"
          subtitle="Notify when a task passes its due date"
          right={<Toggle on={notifOverdue} onToggle={() => toggleNotif("overdue", !notifOverdue)} />}
        />
        <Divider />
        <SettingRow
          icon={<Droplets size={18} color="#0ea5e9" />}
          color="#0ea5e9"
          bg="rgba(14,165,233,0.1)"
          title="Water Reminders"
          subtitle="Remind every 2 hours to drink water"
          right={<Toggle on={notifWater} onToggle={() => toggleNotif("water", !notifWater)} />}
        />
      </div>

      {/* ── Focus card ── */}
      <div className="bg-white dark:bg-gray-900" style={{ ...card, padding: isMobile ? "1.25rem 1rem" : "1.75rem 2rem" }}>
        <p className="text-gray-400 dark:text-gray-500" style={{ fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.25rem" }}>
          Focus Timer
        </p>

        <SettingRow
          icon={<Timer size={18} color="#10b981" />}
          color="#10b981"
          bg="rgba(16,185,129,0.1)"
          title="Default Session Duration"
          subtitle="How long each focus session lasts"
          right={
            <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap", justifyContent: "flex-end" }}>
              {FOCUS_OPTIONS.map((mins) => (
                <button
                  key={mins}
                  onClick={() => updateSettings({ workDuration: mins })}
                  style={{
                    padding: "0.375rem 0.75rem",
                    borderRadius: "0.5rem",
                    border: "1.5px solid",
                    borderColor: focusSettings.workDuration === mins ? "#7c6ff7" : "rgba(229,231,235,1)",
                    background: focusSettings.workDuration === mins ? "#7c6ff7" : "transparent",
                    color: focusSettings.workDuration === mins ? "white" : "#6b7280",
                    fontWeight: 600, fontSize: "0.8125rem", cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  {mins}m
                </button>
              ))}
            </div>
          }
        />
      </div>

      {/* ── AI card ── */}
      <div className="bg-white dark:bg-gray-900" style={{ ...card, padding: isMobile ? "1.25rem 1rem" : "1.75rem 2rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
          <p className="text-gray-400 dark:text-gray-500" style={{ fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            AI Features
          </p>
          <span style={{
            fontSize: "0.6875rem", fontWeight: 700, borderRadius: "999px",
            padding: "0.1875rem 0.625rem",
            background: aiActive ? "rgba(34,197,94,0.12)" : "rgba(156,163,175,0.12)",
            color: aiActive ? "#16a34a" : "#9ca3af",
          }}>
            {aiActive ? "Active" : "Not configured"}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem" }}>
          <div style={{
            width: "2.75rem", height: "2.75rem", borderRadius: "0.75rem", flexShrink: 0,
            background: "rgba(124,111,247,0.1)", display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Sparkles size={18} color="#7c6ff7" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p className="text-gray-900 dark:text-white" style={{ fontWeight: 600, fontSize: "0.9375rem" }}>Anthropic API Key</p>
            <p className="text-gray-500 dark:text-gray-400" style={{ fontSize: "0.8125rem", marginTop: "0.125rem", marginBottom: "0.875rem" }}>
              Used to auto-analyze task priority and time estimate. Get your key at console.anthropic.com.
            </p>
            <div style={{ position: "relative" }}>
              <input
                type={showAiKey ? "text" : "password"}
                value={aiKey}
                onChange={(e) => saveAiKey(e.target.value)}
                placeholder="sk-ant-api03-..."
                style={{
                  width: "100%", boxSizing: "border-box",
                  padding: "0.75rem 2.75rem 0.75rem 1rem",
                  border: `1.5px solid ${aiActive ? "rgba(34,197,94,0.4)" : "var(--color-border)"}`,
                  borderRadius: "0.75rem", fontSize: "0.875rem", outline: "none",
                  fontFamily: aiKey ? "monospace" : "inherit",
                  background: "var(--color-bg)",
                  transition: "border-color 0.15s",
                }}
                className="text-gray-800 dark:text-gray-200 placeholder-gray-400"
                onFocus={(e) => { e.target.style.borderColor = "#7c6ff7"; }}
                onBlur={(e) => { e.target.style.borderColor = aiActive ? "rgba(34,197,94,0.4)" : "var(--color-border)"; }}
              />
              <button
                type="button"
                onClick={() => setShowAiKey(!showAiKey)}
                style={{
                  position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex",
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {showAiKey ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {aiKey && !aiActive && (
              <p style={{ fontSize: "0.75rem", color: "#fb923c", marginTop: "0.375rem" }}>
                Key should start with <code style={{ fontFamily: "monospace" }}>sk-ant-</code>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Data card ── */}
      <div className="bg-white dark:bg-gray-900" style={{ ...card, padding: isMobile ? "1.25rem 1rem" : "1.75rem 2rem" }}>
        <p className="text-gray-400 dark:text-gray-500" style={{ fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.25rem" }}>
          Data
        </p>

        <SettingRow
          icon={<Trash2 size={18} color="#ef4444" />}
          color="#ef4444"
          bg="rgba(239,68,68,0.1)"
          title="Clear Local Data"
          subtitle="Reset XP, streaks, achievements, and water history"
          right={
            <button
              onClick={() => {
                if (!confirm("This will reset all your local progress (XP, streaks, achievements). Continue?")) return;
                const keep = ["ui-store", "auth-store"];
                Object.keys(localStorage)
                  .filter((k) => !keep.includes(k))
                  .forEach((k) => localStorage.removeItem(k));
                toast.success("Local data cleared");
              }}
              style={{
                padding: "0.5rem 1rem", borderRadius: "0.625rem",
                border: "1.5px solid rgba(239,68,68,0.4)",
                color: "#ef4444", background: "rgba(239,68,68,0.05)",
                fontWeight: 600, fontSize: "0.8125rem", cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              Clear
            </button>
          }
        />
      </div>

    </div>
  );
}
