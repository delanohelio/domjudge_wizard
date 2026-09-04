import React, { HTMLAttributes, ReactNode } from "react";
import "./ui.css";

export interface UiCardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "elevated" | "subtle" | "glow";
  interactive?: boolean;
  children: ReactNode;
}

export const UiCard: React.FC<UiCardProps> = ({
  variant = "default",
  interactive = false,
  children,
  className = "",
  ...props
}) => {
  return (
    <div
      className={`ui-card ui-card-${variant} ${interactive ? "ui-card-interactive" : ""} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const UiCardHeader: React.FC<{ children: ReactNode; className?: string; action?: ReactNode }> = ({
  children,
  className = "",
  action,
}) => (
  <div className={`ui-card-header ${className}`}>
    <div className="ui-card-header-text">{children}</div>
    {action && <div className="ui-card-header-action">{action}</div>}
  </div>
);

export const UiCardTitle: React.FC<{ children: ReactNode; className?: string }> = ({
  children,
  className = "",
}) => <h3 className={`ui-card-title ${className}`}>{children}</h3>;

export const UiCardSubtitle: React.FC<{ children: ReactNode; className?: string }> = ({
  children,
  className = "",
}) => <p className={`ui-card-subtitle ${className}`}>{children}</p>;

export const UiCardContent: React.FC<{ children: ReactNode; className?: string }> = ({
  children,
  className = "",
}) => <div className={`ui-card-content ${className}`}>{children}</div>;

export const UiCardFooter: React.FC<{ children: ReactNode; className?: string }> = ({
  children,
  className = "",
}) => <div className={`ui-card-footer ${className}`}>{children}</div>;
