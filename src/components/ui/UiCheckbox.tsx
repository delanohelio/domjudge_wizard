import React, { InputHTMLAttributes, forwardRef } from "react";
import { Check } from "lucide-react";
import "./ui.css";

export interface UiCheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "size"> {
  label?: React.ReactNode;
  indeterminate?: boolean;
  size?: "sm" | "md";
}

export const UiCheckbox = forwardRef<HTMLInputElement, UiCheckboxProps>(
  ({ label, checked = false, indeterminate = false, size = "md", disabled, className = "", onChange, ...props }, ref) => {
    return (
      <label className={`ui-checkbox-wrapper ui-checkbox-${size} ${disabled ? "ui-checkbox-disabled" : ""} ${className}`}>
        <input
          ref={ref}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={onChange}
          className="ui-checkbox-native"
          {...props}
        />
        <span className={`ui-checkbox-box ${checked ? "ui-checkbox-checked" : ""} ${indeterminate ? "ui-checkbox-indeterminate" : ""}`}>
          {checked && <Check size={14} className="ui-checkbox-check" />}
          {indeterminate && !checked && <span className="ui-checkbox-dash" />}
        </span>
        {label && <span className="ui-checkbox-label">{label}</span>}
      </label>
    );
  }
);

UiCheckbox.displayName = "UiCheckbox";
