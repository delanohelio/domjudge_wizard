import React, { ReactNode } from "react";
import { FolderX } from "lucide-react";
import "./ui.css";

export interface UiEmptyStateProps {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export const UiEmptyState: React.FC<UiEmptyStateProps> = ({
  icon = <FolderX size={44} />,
  title,
  description,
  action,
  className = "",
}) => {
  return (
    <div className={`ui-empty-state ${className}`}>
      <div className="ui-empty-icon">{icon}</div>
      <h3 className="ui-empty-title">{title}</h3>
      {description && <p className="ui-empty-desc">{description}</p>}
      {action && <div className="ui-empty-action">{action}</div>}
    </div>
  );
};
