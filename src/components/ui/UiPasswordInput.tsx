import React, { useState, forwardRef } from "react";
import { Eye, EyeOff } from "lucide-react";
import { UiTextInput, UiTextInputProps } from "./UiTextInput";
import "./ui.css";

export interface UiPasswordInputProps extends Omit<UiTextInputProps, "type" | "endIcon"> {
  showToggle?: boolean;
}

export const UiPasswordInput = forwardRef<HTMLInputElement, UiPasswordInputProps>(
  ({ showToggle = true, ...props }, ref) => {
    const [visible, setVisible] = useState(false);

    const toggleButton = showToggle ? (
      <button
        type="button"
        className="ui-input-eye-btn"
        onClick={() => setVisible((prev) => !prev)}
        tabIndex={-1}
        aria-label={visible ? "Ocultar senha" : "Ver senha"}
        title={visible ? "Ocultar senha" : "Ver senha"}
      >
        {visible ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    ) : null;

    return (
      <UiTextInput
        {...props}
        ref={ref}
        type={visible ? "text" : "password"}
        endIcon={toggleButton}
      />
    );
  }
);

UiPasswordInput.displayName = "UiPasswordInput";
