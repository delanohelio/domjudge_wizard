import React, { InputHTMLAttributes, ReactNode, forwardRef } from "react";
import "./ui.css";

export interface UiTextInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: string;
  helperText?: string;
  error?: string;
  startIcon?: ReactNode;
  endIcon?: ReactNode;
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
}

export const UiTextInput = forwardRef<HTMLInputElement, UiTextInputProps>(
  (
    {
      label,
      helperText,
      error,
      startIcon,
      endIcon,
      size = "md",
      fullWidth = true,
      className = "",
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? `input-${label.toLowerCase().replace(/[^a-z0-9]/g, "-")}` : undefined);

    return (
      <div className={`ui-field-group ${fullWidth ? "ui-field-full" : ""}`}>
        {label && (
          <label htmlFor={inputId} className="ui-field-label">
            {label}
            {props.required && <span className="ui-field-required">*</span>}
          </label>
        )}
        <div
          className={`ui-input-wrapper ui-input-${size} ${error ? "ui-input-has-error" : ""} ${props.disabled ? "ui-input-disabled" : ""}`}
        >
          {startIcon && <span className="ui-input-icon-start">{startIcon}</span>}
          <input
            ref={ref}
            id={inputId}
            className={`ui-input-control ${className}`}
            {...props}
          />
          {endIcon && <span className="ui-input-icon-end">{endIcon}</span>}
        </div>
        {error && <span className="ui-field-error">{error}</span>}
        {!error && helperText && <span className="ui-field-helper">{helperText}</span>}
      </div>
    );
  }
);

UiTextInput.displayName = "UiTextInput";
