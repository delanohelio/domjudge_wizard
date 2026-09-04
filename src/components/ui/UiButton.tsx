import React, { ButtonHTMLAttributes, ReactNode } from "react";
import "./ui.css";

export interface UiButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "success" | "dim";
  size?: "sm" | "md" | "lg";
  icon?: ReactNode;
  iconPosition?: "left" | "right";
  loading?: boolean;
  fullWidth?: boolean;
  children?: ReactNode;
}

export const UiButton: React.FC<UiButtonProps> = ({
  variant = "secondary",
  size = "md",
  icon,
  iconPosition = "left",
  loading = false,
  fullWidth = false,
  disabled,
  children,
  className = "",
  ...props
}) => {
  const classes = [
    "ui-btn",
    `ui-btn-${variant}`,
    `ui-btn-${size}`,
    fullWidth ? "ui-btn-block" : "",
    loading ? "ui-btn-loading" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button className={classes} disabled={disabled || loading} {...props}>
      {loading && <span className="ui-btn-spinner" />}
      {!loading && icon && iconPosition === "left" && <span className="ui-btn-icon">{icon}</span>}
      {children && <span className="ui-btn-content">{children}</span>}
      {!loading && icon && iconPosition === "right" && <span className="ui-btn-icon">{icon}</span>}
    </button>
  );
};
