import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Eye, EyeOff, CheckCircle2, Zap, Calendar, Target } from "lucide-react";
import { authApi } from "../api/auth";
import { useAuthStore } from "../store/auth";
import toast from "react-hot-toast";

interface FormValues { email: string; password: string }

const features = [
  { icon: <CheckCircle2 size={16} />, text: "Smart task management with priorities" },
  { icon: <Calendar size={16} />, text: "Calendar & deadline tracking" },
  { icon: <Zap size={16} />, text: "Focus timer with XP rewards" },
  { icon: <Target size={16} />, text: "Eisenhower Matrix for clarity" },
];

export function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [showPassword, setShowPassword] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>();

  const mutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      login(data.user, data.accessToken, data.refreshToken);
      navigate("/");
    },
    onError: (err: { response?: { data?: { error?: string } } }) =>
      toast.error(err.response?.data?.error ?? "Login failed"),
  });

  return (
    <div style={{ minHeight: "100vh", display: "flex", background: "#f8fafc" }}>

      {/* Left branding panel */}
      <div style={{
        flex: "0 0 45%",
        background: "linear-gradient(135deg, #4f46e5 0%, #6366f1 50%, #818cf8 100%)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "3rem",
        position: "relative",
        overflow: "hidden",
      }} className="hidden lg:flex">

        {/* Decorative circles */}
        <div style={{
          position: "absolute", width: "400px", height: "400px", borderRadius: "50%",
          background: "rgba(255,255,255,0.05)", top: "-100px", right: "-100px",
        }} />
        <div style={{
          position: "absolute", width: "300px", height: "300px", borderRadius: "50%",
          background: "rgba(255,255,255,0.05)", bottom: "-80px", left: "-80px",
        }} />

        <div style={{ position: "relative", zIndex: 1 }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "3rem" }}>
            <div style={{
              width: "2.5rem", height: "2.5rem", borderRadius: "0.75rem",
              background: "rgba(255,255,255,0.2)", display: "flex",
              alignItems: "center", justifyContent: "center",
              backdropFilter: "blur(8px)",
            }}>
              <CheckCircle2 size={20} color="white" />
            </div>
            <span style={{ fontSize: "1.25rem", fontWeight: 800, color: "white", letterSpacing: "-0.02em" }}>
              TodoApp
            </span>
          </div>

          {/* Headline */}
          <h1 style={{
            fontSize: "2.5rem", fontWeight: 800, color: "white",
            lineHeight: 1.15, letterSpacing: "-0.03em", marginBottom: "1rem",
          }}>
            Get things<br />done smarter.
          </h1>
          <p style={{ fontSize: "1rem", color: "rgba(255,255,255,0.75)", marginBottom: "3rem", lineHeight: 1.6 }}>
            Manage tasks, track focus sessions,<br />and level up your productivity.
          </p>

          {/* Features */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {features.map((f, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div style={{
                  width: "1.75rem", height: "1.75rem", borderRadius: "50%",
                  background: "rgba(255,255,255,0.15)", display: "flex",
                  alignItems: "center", justifyContent: "center", flexShrink: 0,
                  color: "white",
                }}>
                  {f.icon}
                </div>
                <span style={{ fontSize: "0.875rem", color: "rgba(255,255,255,0.85)", fontWeight: 500 }}>
                  {f.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div style={{
        flex: 1, display: "flex", alignItems: "center",
        justifyContent: "center", padding: "2rem",
      }}>
        <div style={{ width: "100%", maxWidth: "400px" }}>

          {/* Mobile logo */}
          <div style={{ textAlign: "center", marginBottom: "2rem" }} className="lg:hidden">
            <span style={{ fontSize: "1.5rem", fontWeight: 800, color: "#6366f1", letterSpacing: "-0.02em" }}>
              TodoApp
            </span>
          </div>

          <div style={{ marginBottom: "2rem" }}>
            <h2 style={{ fontSize: "1.75rem", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em", marginBottom: "0.375rem" }}>
              Welcome back
            </h2>
            <p style={{ fontSize: "0.9375rem", color: "#64748b" }}>
              Sign in to continue to your workspace
            </p>
          </div>

          <form onSubmit={handleSubmit((v) => mutation.mutate(v))}>
            {/* Email */}
            <div style={{ marginBottom: "1.25rem" }}>
              <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: "#374151", marginBottom: "0.5rem" }}>
                Email address
              </label>
              <input
                type="email"
                placeholder="you@example.com"
                {...register("email", { required: "Email is required" })}
                style={{
                  width: "100%", padding: "0.75rem 1rem",
                  border: `1.5px solid ${errors.email ? "#ef4444" : "#e2e8f0"}`,
                  borderRadius: "0.625rem", fontSize: "0.9375rem",
                  outline: "none", background: "white", color: "#0f172a",
                  transition: "border-color 0.15s",
                  boxSizing: "border-box",
                }}
                onFocus={(e) => { if (!errors.email) e.target.style.borderColor = "#6366f1"; }}
                onBlur={(e) => { if (!errors.email) e.target.style.borderColor = "#e2e8f0"; }}
              />
              {errors.email && (
                <p style={{ fontSize: "0.75rem", color: "#ef4444", marginTop: "0.375rem" }}>
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div style={{ marginBottom: "0.75rem" }}>
              <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: "#374151", marginBottom: "0.5rem" }}>
                Password
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  {...register("password", { required: "Password is required" })}
                  style={{
                    width: "100%", padding: "0.75rem 3rem 0.75rem 1rem",
                    border: `1.5px solid ${errors.password ? "#ef4444" : "#e2e8f0"}`,
                    borderRadius: "0.625rem", fontSize: "0.9375rem",
                    outline: "none", background: "white", color: "#0f172a",
                    transition: "border-color 0.15s",
                    boxSizing: "border-box",
                  }}
                  onFocus={(e) => { if (!errors.password) e.target.style.borderColor = "#6366f1"; }}
                  onBlur={(e) => { if (!errors.password) e.target.style.borderColor = "#e2e8f0"; }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute", right: "0.875rem", top: "50%",
                    transform: "translateY(-50%)", background: "none",
                    border: "none", cursor: "pointer", color: "#94a3b8", padding: 0,
                    display: "flex", alignItems: "center",
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <p style={{ fontSize: "0.75rem", color: "#ef4444", marginTop: "0.375rem" }}>
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Forgot password */}
            <div style={{ textAlign: "right", marginBottom: "1.5rem" }}>
              <Link to="/forgot-password" style={{ fontSize: "0.8125rem", color: "#6366f1", textDecoration: "none", fontWeight: 500 }}>
                Forgot password?
              </Link>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={mutation.isPending}
              style={{
                width: "100%", padding: "0.8125rem",
                background: mutation.isPending ? "#a5b4fc" : "#6366f1",
                color: "white", border: "none", borderRadius: "0.625rem",
                fontSize: "0.9375rem", fontWeight: 600, cursor: mutation.isPending ? "not-allowed" : "pointer",
                transition: "background 0.15s",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
              }}
            >
              {mutation.isPending ? (
                <>
                  <div style={{
                    width: "1rem", height: "1rem", border: "2px solid rgba(255,255,255,0.4)",
                    borderTopColor: "white", borderRadius: "50%",
                    animation: "spin 0.6s linear infinite",
                  }} />
                  Signing in…
                </>
              ) : "Sign In"}
            </button>
          </form>

          <p style={{ textAlign: "center", fontSize: "0.875rem", color: "#64748b", marginTop: "1.5rem" }}>
            Don't have an account?{" "}
            <Link to="/register" style={{ color: "#6366f1", fontWeight: 600, textDecoration: "none" }}>
              Sign up free
            </Link>
          </p>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input::placeholder { color: #94a3b8; }
      `}</style>
    </div>
  );
}
