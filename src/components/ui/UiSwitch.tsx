import React from "react";
import "./ui.css";

export interface UiSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: React.ReactNode;
  disabled?: boolean;
  size?: "sm" | "md";
  className?: string;
  id?: string;
}

export const UiSwitch: React.FC<UiSwitchProps> = ({
  checked,
  onChange,
  label,
  disabled = false,
  size = "md",
  className = "",
  id,
}) => {
  return (
    <label
      htmlFor={id}
      className={`ui-switch-wrapper ui-switch-${size} ${disabled ? "ui-switch-disabled" : ""} ${className}`}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="ui-switch-native"
      />
      <span className={`ui-switch-track ${checked ? "ui-switch-checked" : ""}`}>
        <span className="ui-switch-thumb" />
      </span>
      {label && <span className="ui-switch-label">{label}</span>}
    </label>
  );
};
