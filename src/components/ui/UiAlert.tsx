import React, { ReactNode } from "react";
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from "lucide-react";
import "./ui.css";

export interface UiAlertProps {
  variant?: "info" | "success" | "warning" | "danger";
  title?: ReactNode;
  children: ReactNode;
  onClose?: () => void;
  className?: string;
  icon?: ReactNode;
}

export const UiAlert: React.FC<UiAlertProps> = ({
  variant = "info",
  title,
  children,
  onClose,
  className = "",
  icon,
}) => {
  const defaultIcons = {
    info: <Info size={18} />,
    success: <CheckCircle size={18} />,
    warning: <AlertTriangle size={18} />,
    danger: <AlertCircle size={18} />,
  };

  return (
    <div className={`ui-alert ui-alert-${variant} animate-fade-in ${className}`} role="alert">
      <div className="ui-alert-icon">{icon || defaultIcons[variant]}</div>
      <div className="ui-alert-content">
        {title && <div className="ui-alert-title">{title}</div>}
        <div className="ui-alert-body">{children}</div>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="ui-alert-close-btn"
          aria-label="Fechar alerta"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
};
