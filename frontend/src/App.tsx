import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { useAuthStore } from "./store/auth";
import { useUIStore } from "./store/ui";
import { usersApi } from "./api/users";
import { useTaskNotifications } from "./hooks/useTaskNotifications";
import { AppLayout } from "./components/layout/AppLayout";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { TasksPage } from "./pages/TasksPage";
import { CalendarPage } from "./pages/CalendarPage";
import { DashboardPage } from "./pages/DashboardPage";
import { TagsPage } from "./pages/TagsPage";
import { ProjectsNewPage, ProjectsListPage } from "./pages/ProjectsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { TaskProfilePage } from "./pages/TaskProfilePage";
import { EisenhowerPage } from "./pages/EisenhowerPage";
import { FocusPage } from "./pages/FocusPage";
import { WeeklyReviewPage } from "./pages/WeeklyReviewPage";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30000 } },
});

function AuthGuard({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppInitializer({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, setUser } = useAuthStore();
  const { theme } = useUIStore();

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  useEffect(() => {
    if (isAuthenticated) {
      usersApi.getMe().then(setUser).catch(() => {});
    }
  }, [isAuthenticated, setUser]);

  useTaskNotifications();

  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppInitializer>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route
              element={
                <AuthGuard>
                  <AppLayout />
                </AuthGuard>
              }
            >
              <Route path="/" element={<TasksPage />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/tags" element={<TagsPage />} />
              <Route path="/projects" element={<ProjectsListPage />} />
              <Route path="/projects/new" element={<ProjectsNewPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/tasks/:id" element={<TaskProfilePage />} />
              <Route path="/matrix" element={<EisenhowerPage />} />
              <Route path="/focus" element={<FocusPage />} />
              <Route path="/review" element={<WeeklyReviewPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
        </AppInitializer>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
