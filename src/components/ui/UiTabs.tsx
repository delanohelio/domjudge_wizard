import React, { ReactNode } from "react";
import "./ui.css";

export interface TabItem {
  id: string;
  label: ReactNode;
  icon?: ReactNode;
  badge?: string | number;
  disabled?: boolean;
}

export interface UiTabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  variant?: "pill" | "line" | "subtle";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const UiTabs: React.FC<UiTabsProps> = ({
  tabs,
  activeTab,
  onChange,
  variant = "pill",
  size = "md",
  className = "",
}) => {
  return (
    <div className={`ui-tabs ui-tabs-${variant} ui-tabs-${size} ${className}`} role="tablist">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            disabled={tab.disabled}
            className={`ui-tab-btn ${isActive ? "ui-tab-active" : ""}`}
            onClick={() => onChange(tab.id)}
          >
            {tab.icon && <span className="ui-tab-icon">{tab.icon}</span>}
            <span className="ui-tab-label">{tab.label}</span>
            {tab.badge !== undefined && <span className="ui-tab-badge">{tab.badge}</span>}
          </button>
        );
      })}
    </div>
  );
};
