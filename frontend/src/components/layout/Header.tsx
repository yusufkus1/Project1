import { Sun, Moon, LogOut, User } from "lucide-react";
import { useUIStore } from "../../store/ui";
import { useAuthStore } from "../../store/auth";
import { useNavigate } from "react-router-dom";

export function Header() {
  const { theme, toggleTheme } = useUIStore();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-8 flex-shrink-0">
      <div />
      <div className="flex items-center gap-2">
        <button
          onClick={toggleTheme}
          className="p-2.5 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
        >
          {theme === "light" ? <Moon size={19} /> : <Sun size={19} />}
        </button>
        <button
          onClick={() => navigate("/settings")}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
        >
          <User size={17} />
          <span className="font-medium">{user?.name ?? "Profile"}</span>
        </button>
        <button
          onClick={handleLogout}
          className="p-2.5 rounded-xl text-gray-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition"
        >
          <LogOut size={19} />
        </button>
      </div>
    </header>
  );
}
