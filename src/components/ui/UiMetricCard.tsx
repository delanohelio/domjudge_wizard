import React, { ReactNode } from "react";
import "./ui.css";

export interface UiMetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  variant?: "brand" | "success" | "warning" | "danger" | "info";
  className?: string;
}

export const UiMetricCard: React.FC<UiMetricCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  variant = "brand",
  className = "",
}) => {
  return (
    <div className={`ui-metric-card ui-metric-${variant} ${className}`}>
      <div className="ui-metric-header">
        <span className="ui-metric-title">{title}</span>
        {icon && <div className="ui-metric-icon-box">{icon}</div>}
      </div>
      <div className="ui-metric-value">{value}</div>
      {subtitle && <div className="ui-metric-subtitle">{subtitle}</div>}
    </div>
  );
};
