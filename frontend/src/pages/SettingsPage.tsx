import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { usersApi } from "../api/users";
import { useAuthStore } from "../store/auth";
import { useUIStore } from "../store/ui";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { User, Lock, Moon, Sun } from "lucide-react";
import toast from "react-hot-toast";

interface ProfileForm { name: string; email: string }
interface PasswordForm { currentPassword: string; newPassword: string; confirm: string }

export function SettingsPage() {
  const { user, setUser } = useAuthStore();
  const { theme, toggleTheme } = useUIStore();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"profile" | "password">("profile");

  const { register: regProfile, handleSubmit: handleProfile, formState: { errors: pe } } = useForm<ProfileForm>({
    defaultValues: { name: user?.name ?? "", email: user?.email ?? "" },
  });

  const { register: regPass, handleSubmit: handlePass, watch, formState: { errors: pwe }, reset: resetPass } = useForm<PasswordForm>();

  const updateProfile = useMutation({
    mutationFn: (v: ProfileForm) => usersApi.updateMe({ name: v.name }),
    onSuccess: (updated) => { setUser(updated); qc.invalidateQueries({ queryKey: ["me"] }); toast.success("Profile updated"); },
    onError: () => toast.error("Update failed"),
  });

  const changePassword = useMutation({
    mutationFn: (v: PasswordForm) => usersApi.changePassword(v.currentPassword, v.newPassword),
    onSuccess: () => { toast.success("Password updated"); resetPass(); },
    onError: (err: { response?: { data?: { error?: string } } }) => toast.error(err.response?.data?.error ?? "Error"),
  });

  const tabs = [
    { id: "profile" as const, label: "Profile", icon: User },
    { id: "password" as const, label: "Password", icon: Lock },
  ];

  return (
    <div style={{ maxWidth: "40rem", display: "flex", flexDirection: "column", gap: "2rem" }}>

      <h1 className="text-gray-900 dark:text-white" style={{ fontSize: "1.875rem", fontWeight: 800, marginBottom: "0.5rem" }}>
        Settings
      </h1>

      {/* Tab card */}
      <div className="bg-white dark:bg-gray-900" style={{ borderRadius: "1rem", border: "1px solid", borderColor: "rgba(229,231,235,1)", overflow: "hidden" }}>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700" style={{ display: "flex" }}>
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              style={{
                display: "flex", alignItems: "center", gap: "0.5rem",
                padding: "1rem 1.5rem", fontSize: "0.875rem", fontWeight: 500,
                borderBottom: "2px solid", cursor: "pointer", background: "none",
                borderBottomColor: tab === id ? "#6366f1" : "transparent",
                color: tab === id ? "#6366f1" : "#9ca3af",
                transition: "all 0.15s",
              }}
            >
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>

        {/* Form */}
        <div style={{ padding: "2rem" }}>
          {tab === "profile" && (
            <form onSubmit={handleProfile((v) => updateProfile.mutate(v))} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <Input
                label="Full Name"
                {...regProfile("name", { required: "Name is required" })}
                error={pe.name?.message}
              />
              <Input
                label="Email"
                type="email"
                {...regProfile("email")}
                disabled
                className="opacity-60 cursor-not-allowed"
              />
              <div style={{ paddingTop: "0.5rem" }}>
                <Button type="submit" loading={updateProfile.isPending}>Save</Button>
              </div>
            </form>
          )}

          {tab === "password" && (
            <form onSubmit={handlePass((v) => changePassword.mutate(v))} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <Input
                label="Current Password"
                type="password"
                {...regPass("currentPassword", { required: "Current password is required" })}
                error={pwe.currentPassword?.message}
              />
              <Input
                label="New Password"
                type="password"
                {...regPass("newPassword", { required: "New password is required", minLength: { value: 6, message: "At least 6 characters" } })}
                error={pwe.newPassword?.message}
              />
              <Input
                label="Confirm New Password"
                type="password"
                {...regPass("confirm", {
                  required: "Please confirm your password",
                  validate: (v) => v === watch("newPassword") || "Passwords don't match",
                })}
                error={pwe.confirm?.message}
              />
              <div style={{ paddingTop: "0.5rem" }}>
                <Button type="submit" loading={changePassword.isPending}>Update Password</Button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Appearance */}
      <div className="bg-white dark:bg-gray-900" style={{ borderRadius: "1rem", border: "1px solid", borderColor: "rgba(229,231,235,1)", padding: "2rem" }}>
        <h2 className="text-gray-900 dark:text-white" style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "1.5rem" }}>
          Appearance
        </h2>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p className="text-gray-700 dark:text-gray-300" style={{ fontSize: "0.9375rem", fontWeight: 500 }}>Theme</p>
            <p className="text-gray-400 dark:text-gray-500" style={{ fontSize: "0.8125rem", marginTop: "0.25rem" }}>Light / Dark mode</p>
          </div>
          <button
            onClick={toggleTheme}
            style={{
              position: "relative", width: "3.5rem", height: "1.75rem",
              borderRadius: "999px", border: "none", cursor: "pointer",
              background: theme === "dark" ? "#6366f1" : "#e5e7eb",
              transition: "background 0.2s",
            }}
          >
            <span style={{
              position: "absolute", top: "0.125rem", left: "0.125rem",
              width: "1.5rem", height: "1.5rem", background: "white",
              borderRadius: "50%", boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
              display: "flex", alignItems: "center", justifyContent: "center",
              transform: theme === "dark" ? "translateX(1.75rem)" : "translateX(0)",
              transition: "transform 0.2s",
            }}>
              {theme === "dark"
                ? <Moon size={11} color="#6366f1" />
                : <Sun size={11} color="#f59e0b" />
              }
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
