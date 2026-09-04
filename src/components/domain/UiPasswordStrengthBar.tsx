import React, { useMemo } from "react";
import { Check, X } from "lucide-react";
import "./domain.css";

export interface UiPasswordStrengthBarProps {
  password?: string;
  className?: string;
}

export const UiPasswordStrengthBar: React.FC<UiPasswordStrengthBarProps> = ({
  password = "",
  className = "",
}) => {
  const analysis = useMemo(() => {
    const hasMinLength = password.length >= 10;
    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasDigit = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);

    let score = 0;
    if (hasMinLength) score += 2;
    if (hasLower && hasUpper) score += 1;
    if (hasDigit) score += 1;
    if (hasSpecial) score += 1;

    let label = "Muito Fraca";
    let colorVar = "var(--danger)";
    let percent = 20;

    if (score >= 5) {
      label = "Excelente";
      colorVar = "var(--success)";
      percent = 100;
    } else if (score >= 4) {
      label = "Forte";
      colorVar = "#10b981";
      percent = 80;
    } else if (score >= 3) {
      label = "Razoável";
      colorVar = "var(--warning)";
      percent = 60;
    } else if (score >= 2) {
      label = "Fraca";
      colorVar = "#f97316";
      percent = 40;
    }

    return {
      hasMinLength,
      hasLower,
      hasUpper,
      hasDigit,
      hasSpecial,
      score,
      label,
      colorVar,
      percent: password ? percent : 0,
    };
  }, [password]);

  return (
    <div className={`ui-strength-container ${className}`}>
      <div className="ui-strength-bar-bg">
        <div
          className="ui-strength-bar-fill"
          style={{
            width: `${analysis.percent}%`,
            backgroundColor: analysis.colorVar,
          }}
        />
      </div>

      <div className="ui-strength-label-row">
        <span className="text-xs text-muted">Força da senha:</span>
        <span className="text-xs font-bold" style={{ color: analysis.colorVar }}>
          {password ? analysis.label : "Digite uma senha"}
        </span>
      </div>

      <div className="ui-strength-rules">
        <div className={`ui-rule-item ${analysis.hasMinLength ? "ui-rule-passed" : ""}`}>
          {analysis.hasMinLength ? <Check size={12} /> : <X size={12} />}
          <span>Pelo menos 10 caracteres</span>
        </div>
        <div className={`ui-rule-item ${analysis.hasUpper && analysis.hasLower ? "ui-rule-passed" : ""}`}>
          {analysis.hasUpper && analysis.hasLower ? <Check size={12} /> : <X size={12} />}
          <span>Maiúsculas e minúsculas</span>
        </div>
        <div className={`ui-rule-item ${analysis.hasDigit ? "ui-rule-passed" : ""}`}>
          {analysis.hasDigit ? <Check size={12} /> : <X size={12} />}
          <span>Pelo menos um número</span>
        </div>
        <div className={`ui-rule-item ${analysis.hasSpecial ? "ui-rule-passed" : ""}`}>
          {analysis.hasSpecial ? <Check size={12} /> : <X size={12} />}
          <span>Caractere especial (!@#$%)</span>
        </div>
      </div>
    </div>
  );
};
