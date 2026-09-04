import React, { TextareaHTMLAttributes, forwardRef } from "react";
import "./ui.css";

export interface UiTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
  error?: string;
  mono?: boolean;
  fullWidth?: boolean;
}

export const UiTextarea = forwardRef<HTMLTextAreaElement, UiTextareaProps>(
  (
    {
      label,
      helperText,
      error,
      mono = false,
      fullWidth = true,
      className = "",
      id,
      rows = 4,
      ...props
    },
    ref
  ) => {
    const textareaId = id || (label ? `textarea-${label.toLowerCase().replace(/[^a-z0-9]/g, "-")}` : undefined);

    return (
      <div className={`ui-field-group ${fullWidth ? "ui-field-full" : ""}`}>
        {label && (
          <label htmlFor={textareaId} className="ui-field-label">
            {label}
            {props.required && <span className="ui-field-required">*</span>}
          </label>
        )}
        <div
          className={`ui-textarea-wrapper ${mono ? "ui-textarea-mono" : ""} ${
            error ? "ui-input-has-error" : ""
          } ${props.disabled ? "ui-input-disabled" : ""}`}
        >
          <textarea
            ref={ref}
            id={textareaId}
            rows={rows}
            className={`ui-textarea-control ${className}`}
            {...props}
          />
        </div>
        {error && <span className="ui-field-error">{error}</span>}
        {!error && helperText && <span className="ui-field-helper">{helperText}</span>}
      </div>
    );
  }
);

UiTextarea.displayName = "UiTextarea";
