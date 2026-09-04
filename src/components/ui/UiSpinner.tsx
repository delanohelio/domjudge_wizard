import React from "react";
import "./ui.css";

export interface UiSpinnerProps {
  size?: "sm" | "md" | "lg";
  variant?: "brand" | "white" | "muted";
  label?: string;
  className?: string;
}

export const UiSpinner: React.FC<UiSpinnerProps> = ({
  size = "md",
  variant = "brand",
  label,
  className = "",
}) => {
  return (
    <div className={`ui-spinner-container ${className}`} role="status">
      <div className={`ui-spinner ui-spinner-${size} ui-spinner-${variant}`} />
      {label && <span className="ui-spinner-label">{label}</span>}
    </div>
  );
};
