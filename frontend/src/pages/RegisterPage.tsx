import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Eye, EyeOff, CheckCircle2, Zap, Calendar, Target } from "lucide-react";
import { authApi } from "../api/auth";
import { useAuthStore } from "../store/auth";
import toast from "react-hot-toast";

interface FormValues { name: string; email: string; password: string; confirm: string }

const features = [
  { icon: <CheckCircle2 size={16} />, text: "Smart task management with priorities" },
  { icon: <Calendar size={16} />, text: "Calendar & deadline tracking" },
  { icon: <Zap size={16} />, text: "Focus timer with XP rewards" },
  { icon: <Target size={16} />, text: "Eisenhower Matrix for clarity" },
];

export function RegisterPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormValues>();

  const mutation = useMutation({
    mutationFn: (v: FormValues) => authApi.register({ name: v.name, email: v.email, password: v.password }),
    onSuccess: (data) => {
      login(data.user, data.accessToken, data.refreshToken);
      navigate("/");
      toast.success("Welcome aboard! 🎉");
    },
    onError: (err: { response?: { data?: { error?: string } } }) =>
      toast.error(err.response?.data?.error ?? "Registration failed"),
  });

  const fieldStyle = (hasError: boolean): React.CSSProperties => ({
    width: "100%", padding: "0.75rem 1rem",
    border: `1.5px solid ${hasError ? "#ef4444" : "#e2e8f0"}`,
    borderRadius: "0.625rem", fontSize: "0.9375rem",
    outline: "none", background: "white", color: "#0f172a",
    transition: "border-color 0.15s",
    boxSizing: "border-box",
  });

  const withEyeStyle = (hasError: boolean): React.CSSProperties => ({
    ...fieldStyle(hasError),
    paddingRight: "3rem",
  });

  return (
    <div style={{ minHeight: "100vh", display: "flex", background: "#f8fafc" }}>

      {/* Left branding panel */}
      <div style={{
        flex: "0 0 45%",
        background: "linear-gradient(135deg, #6c5ff5 0%, #7c6ff7 50%, #a89df9 100%)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "3rem",
        position: "relative",
        overflow: "hidden",
      }} className="hidden lg:flex">

        <div style={{
          position: "absolute", width: "400px", height: "400px", borderRadius: "50%",
          background: "rgba(255,255,255,0.05)", top: "-100px", right: "-100px",
        }} />
        <div style={{
          position: "absolute", width: "300px", height: "300px", borderRadius: "50%",
          background: "rgba(255,255,255,0.05)", bottom: "-80px", left: "-80px",
        }} />

        <div style={{ position: "relative", zIndex: 1 }}>
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

          <h1 style={{
            fontSize: "2.5rem", fontWeight: 800, color: "white",
            lineHeight: 1.15, letterSpacing: "-0.03em", marginBottom: "1rem",
          }}>
            Start your<br />productive journey.
          </h1>
          <p style={{ fontSize: "1rem", color: "rgba(255,255,255,0.75)", marginBottom: "3rem", lineHeight: 1.6 }}>
            Join and take control of your tasks,<br />time, and goals — all in one place.
          </p>

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
        overflowY: "auto",
      }}>
        <div style={{ width: "100%", maxWidth: "400px", padding: "1rem 0" }}>

          <div className="lg:hidden" style={{ textAlign: "center", marginBottom: "2rem" }}>
            <span style={{ fontSize: "1.5rem", fontWeight: 800, color: "#7c6ff7", letterSpacing: "-0.02em" }}>
              TodoApp
            </span>
          </div>

          <div style={{ marginBottom: "2rem" }}>
            <h2 style={{ fontSize: "1.75rem", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em", marginBottom: "0.375rem" }}>
              Create account
            </h2>
            <p style={{ fontSize: "0.9375rem", color: "#64748b" }}>
              Free forever. No credit card required.
            </p>
          </div>

          <form onSubmit={handleSubmit((v) => mutation.mutate(v))}>

            {/* Name */}
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: "#374151", marginBottom: "0.5rem" }}>
                Full name
              </label>
              <input
                placeholder="Your Name"
                {...register("name", { required: "Name is required" })}
                style={fieldStyle(!!errors.name)}
                onFocus={(e) => { if (!errors.name) e.target.style.borderColor = "#7c6ff7"; }}
                onBlur={(e) => { if (!errors.name) e.target.style.borderColor = "#e2e8f0"; }}
              />
              {errors.name && <p style={{ fontSize: "0.75rem", color: "#ef4444", marginTop: "0.375rem" }}>{errors.name.message}</p>}
            </div>

            {/* Email */}
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: "#374151", marginBottom: "0.5rem" }}>
                Email address
              </label>
              <input
                type="email"
                placeholder="you@example.com"
                {...register("email", { required: "Email is required" })}
                style={fieldStyle(!!errors.email)}
                onFocus={(e) => { if (!errors.email) e.target.style.borderColor = "#7c6ff7"; }}
                onBlur={(e) => { if (!errors.email) e.target.style.borderColor = "#e2e8f0"; }}
              />
              {errors.email && <p style={{ fontSize: "0.75rem", color: "#ef4444", marginTop: "0.375rem" }}>{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: "#374151", marginBottom: "0.5rem" }}>
                Password
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="At least 6 characters"
                  {...register("password", { required: "Password is required", minLength: { value: 6, message: "At least 6 characters" } })}
                  style={withEyeStyle(!!errors.password)}
                  onFocus={(e) => { if (!errors.password) e.target.style.borderColor = "#7c6ff7"; }}
                  onBlur={(e) => { if (!errors.password) e.target.style.borderColor = "#e2e8f0"; }}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{
                  position: "absolute", right: "0.875rem", top: "50%",
                  transform: "translateY(-50%)", background: "none",
                  border: "none", cursor: "pointer", color: "#94a3b8", padding: 0,
                  display: "flex", alignItems: "center",
                }}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p style={{ fontSize: "0.75rem", color: "#ef4444", marginTop: "0.375rem" }}>{errors.password.message}</p>}
            </div>

            {/* Confirm password */}
            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: "#374151", marginBottom: "0.5rem" }}>
                Confirm password
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showConfirm ? "text" : "password"}
                  placeholder="••••••••"
                  {...register("confirm", {
                    required: "Please confirm your password",
                    validate: (v) => v === watch("password") || "Passwords don't match",
                  })}
                  style={withEyeStyle(!!errors.confirm)}
                  onFocus={(e) => { if (!errors.confirm) e.target.style.borderColor = "#7c6ff7"; }}
                  onBlur={(e) => { if (!errors.confirm) e.target.style.borderColor = "#e2e8f0"; }}
                />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)} style={{
                  position: "absolute", right: "0.875rem", top: "50%",
                  transform: "translateY(-50%)", background: "none",
                  border: "none", cursor: "pointer", color: "#94a3b8", padding: 0,
                  display: "flex", alignItems: "center",
                }}>
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.confirm && <p style={{ fontSize: "0.75rem", color: "#ef4444", marginTop: "0.375rem" }}>{errors.confirm.message}</p>}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={mutation.isPending}
              style={{
                width: "100%", padding: "0.8125rem",
                background: mutation.isPending ? "#c4bbfd" : "#7c6ff7",
                color: "white", border: "none", borderRadius: "0.625rem",
                fontSize: "0.9375rem", fontWeight: 600,
                cursor: mutation.isPending ? "not-allowed" : "pointer",
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
                  Creating account…
                </>
              ) : "Create Account"}
            </button>
          </form>

          <p style={{ textAlign: "center", fontSize: "0.875rem", color: "#64748b", marginTop: "1.5rem" }}>
            Already have an account?{" "}
            <Link to="/login" style={{ color: "#7c6ff7", fontWeight: 600, textDecoration: "none" }}>
              Sign in
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
