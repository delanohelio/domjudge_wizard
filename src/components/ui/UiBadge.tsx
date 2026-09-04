import React, { ReactNode } from "react";
import "./ui.css";

export interface UiBadgeProps {
  variant?: "brand" | "success" | "danger" | "warning" | "info" | "neutral" | "outline";
  size?: "sm" | "md";
  dot?: boolean;
  children: ReactNode;
  className?: string;
  title?: string;
  onClick?: () => void;
}

export const UiBadge: React.FC<UiBadgeProps> = ({
  variant = "brand",
  size = "md",
  dot = false,
  children,
  className = "",
  title,
  onClick,
}) => {
  return (
    <span
      className={`ui-badge ui-badge-${variant} ui-badge-${size} ${onClick ? "ui-badge-clickable" : ""} ${className}`}
      onClick={onClick}
      title={title}
    >
      {dot && <span className="ui-badge-dot" />}
      <span className="ui-badge-text">{children}</span>
    </span>
  );
};
