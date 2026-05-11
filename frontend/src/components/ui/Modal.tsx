import { ReactNode, useEffect } from "react";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}

export function Modal({ open, onClose, title, children, size = "md" }: ModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!open) return null;

  const sizes = { sm: "max-w-sm", md: "max-w-md", lg: "max-w-lg", xl: "max-w-2xl" };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full ${sizes[size]} bg-white dark:bg-gray-900 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]`}>
        {title && (
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800" style={{ padding: "1.5rem 2rem" }}>
            <h2 className="text-gray-900 dark:text-white" style={{ fontSize: "1.25rem", fontWeight: 800 }}>{title}</h2>
            <button onClick={onClose} className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition">
              <X size={20} />
            </button>
          </div>
        )}
        <div className="overflow-y-auto flex-1" style={{ padding: "2rem" }}>{children}</div>
      </div>
    </div>
  );
}
