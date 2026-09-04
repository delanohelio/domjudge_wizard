import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from "lucide-react";
import { ToastMessage } from "@/types/domjudge";
import "@/components/ui/ui.css";

interface ToastContextType {
  showToast: (message: string, type?: ToastMessage["type"], duration?: number) => void;
  toasts: ToastMessage[];
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback(
    (message: string, type: ToastMessage["type"] = "info", duration = 4000) => {
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const newToast: ToastMessage = { id, message, type, duration };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
        }, duration);
      }
    },
    []
  );

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const getIcon = (type: ToastMessage["type"]) => {
    switch (type) {
      case "success":
        return <CheckCircle2 size={18} className="text-success" />;
      case "error":
        return <AlertCircle size={18} className="text-danger" />;
      case "warning":
        return <AlertTriangle size={18} className="text-warning" />;
      default:
        return <Info size={18} className="text-info" />;
    }
  };

  return (
    <ToastContext.Provider value={{ showToast, toasts }}>
      {children}
      <div className="ui-toast-container" aria-live="polite">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`ui-toast ui-toast-${toast.type} animate-fade-in`}
            role="alert"
          >
            <div className="ui-toast-icon">{getIcon(toast.type)}</div>
            <div className="ui-toast-msg">{toast.message}</div>
            <button
              type="button"
              className="ui-toast-close"
              onClick={() => removeToast(toast.id)}
              aria-label="Fechar notificação"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast deve ser utilizado dentro de um ToastProvider");
  }
  return context;
}
