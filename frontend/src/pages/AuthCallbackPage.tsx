import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/auth";

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const { login } = useAuthStore();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("data");
    const error = params.get("error");

    if (error || !raw) {
      navigate("/login?error=oauth_failed");
      return;
    }

    try {
      const { user, accessToken, refreshToken } = JSON.parse(decodeURIComponent(raw));
      login(user, accessToken, refreshToken);
      navigate("/");
    } catch {
      navigate("/login?error=oauth_failed");
    }
  }, [navigate, login]);

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p className="text-gray-500" style={{ fontSize: "0.9375rem" }}>Signing you in…</p>
    </div>
  );
}
