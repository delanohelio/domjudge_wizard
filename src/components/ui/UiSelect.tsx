import React, { useState, useRef, useEffect } from "react";
import ReactDOM from "react-dom";
import { ChevronDown, Check, X } from "lucide-react";
import "./ui.css";

export interface SelectOption {
  value: string;
  label: string;
  badge?: string;
  disabled?: boolean;
}

export interface UiSelectProps {
  label?: string;
  helperText?: string;
  error?: string;
  options: SelectOption[];
  value: string | string[];
  onChange: (value: any) => void;
  multiple?: boolean;
  searchable?: boolean;
  placeholder?: string;
  disabled?: boolean;
  fullWidth?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
  id?: string;
}

interface DropdownPosition {
  top: number;
  left: number;
  width: number;
  placement: "bottom" | "top";
}

export const UiSelect: React.FC<UiSelectProps> = ({
  label,
  helperText,
  error,
  options = [],
  value,
  onChange,
  multiple = false,
  searchable = false,
  placeholder = "Selecione...",
  disabled = false,
  fullWidth = true,
  size = "md",
  className = "",
  id,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [dropdownPosition, setDropdownPosition] = useState<DropdownPosition | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedValues = Array.isArray(value)
    ? value
    : value !== undefined && value !== null && value !== ""
    ? [String(value)]
    : [];

  const updateDropdownPosition = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const dropdownEstimatedHeight = Math.min(options.length * 40 + 60, 280);
    const spaceBelow = window.innerHeight - rect.bottom;
    const placeAbove = spaceBelow < dropdownEstimatedHeight && rect.top > dropdownEstimatedHeight;

    setDropdownPosition({
      top: placeAbove ? rect.top - 4 : rect.bottom + 4,
      left: rect.left,
      width: rect.width,
      placement: placeAbove ? "top" : "bottom",
    });
  };

  useEffect(() => {
    if (isOpen) {
      updateDropdownPosition();
      const handleScrollOrResize = () => {
        updateDropdownPosition();
      };
      window.addEventListener("resize", handleScrollOrResize);
      window.addEventListener("scroll", handleScrollOrResize, true);
      return () => {
        window.removeEventListener("resize", handleScrollOrResize);
        window.removeEventListener("scroll", handleScrollOrResize, true);
      };
    }
  }, [isOpen, options.length]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  function handleSelect(optionValue: string) {
    if (multiple) {
      const exists = selectedValues.includes(optionValue);
      let updated: string[];
      if (optionValue === "all") {
        updated = ["all"];
      } else {
        const withoutAll = selectedValues.filter((v) => v !== "all");
        if (exists) {
          updated = withoutAll.filter((v) => v !== optionValue);
          if (updated.length === 0) updated = ["all"];
        } else {
          updated = [...withoutAll, optionValue];
        }
      }
      onChange(updated);
    } else {
      onChange(optionValue);
      setIsOpen(false);
    }
  }

  function handleRemove(e: React.MouseEvent, valToRemove: string) {
    e.stopPropagation();
    if (!multiple) return;
    const updated = selectedValues.filter((v) => v !== valToRemove);
    onChange(updated.length === 0 ? ["all"] : updated);
  }

  const selectedLabels = options
    .filter((o) => selectedValues.includes(o.value))
    .map((o) => o.label);

  const displayTrigger = () => {
    if (selectedValues.length === 0) {
      return <span className="ui-select-placeholder">{placeholder}</span>;
    }
    if (multiple) {
      if (selectedValues.includes("all")) {
        return <span className="ui-select-chip">Todos</span>;
      }
      return (
        <div className="ui-select-chips-container">
          {selectedValues.slice(0, 3).map((val) => {
            const opt = options.find((o) => o.value === val);
            return (
              <span key={val} className="ui-select-chip">
                {opt ? opt.label : val}
                <button
                  type="button"
                  className="ui-select-chip-remove"
                  onClick={(e) => handleRemove(e, val)}
                >
                  <X size={12} />
                </button>
              </span>
            );
          })}
          {selectedValues.length > 3 && (
            <span className="ui-select-chip-more">+{selectedValues.length - 3}</span>
          )}
        </div>
      );
    }
    const single = options.find((o) => o.value === selectedValues[0]);
    return <span className="ui-select-value">{single ? single.label : selectedValues[0]}</span>;
  };

  return (
    <div
      ref={containerRef}
      className={`ui-field-group ${fullWidth ? "ui-field-full" : ""} ${className}`}
      id={id}
    >
      {label && <label className="ui-field-label">{label}</label>}

      <div
        className={`ui-select-wrapper ui-select-${size} ${error ? "ui-select-has-error" : ""} ${
          disabled ? "ui-select-disabled" : ""
        } ${isOpen ? "ui-select-open" : ""}`}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
      >
        <div className="ui-select-content">{displayTrigger()}</div>
        <div className="ui-select-arrows">
          <ChevronDown size={16} className={`ui-select-chevron ${isOpen ? "ui-chevron-up" : ""}`} />
        </div>
      </div>

      {isOpen &&
        dropdownPosition &&
        typeof document !== "undefined" &&
        ReactDOM.createPortal(
          <div
            ref={dropdownRef}
            className={`ui-select-dropdown ui-select-portal animate-fade-in ${
              dropdownPosition.placement === "top" ? "ui-select-dropdown-top" : ""
            }`}
            style={{
              position: "fixed",
              top: dropdownPosition.placement === "top" ? "auto" : `${dropdownPosition.top}px`,
              bottom:
                dropdownPosition.placement === "top"
                  ? `${window.innerHeight - dropdownPosition.top}px`
                  : "auto",
              left: `${dropdownPosition.left}px`,
              width: `${dropdownPosition.width}px`,
              zIndex: 99999,
            }}
          >
            {(searchable || options.length > 7) && (
              <div className="ui-select-search-box" onClick={(e) => e.stopPropagation()}>
                <input
                  type="text"
                  className="ui-select-search-input"
                  placeholder="Buscar opções..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  autoFocus
                />
              </div>
            )}

            <div className="ui-select-options-list">
              {filteredOptions.length === 0 ? (
                <div className="ui-select-no-options">Nenhuma opção encontrada</div>
              ) : (
                filteredOptions.map((opt) => {
                  const isSelected = selectedValues.includes(opt.value);
                  return (
                    <div
                      key={opt.value}
                      className={`ui-select-option ${isSelected ? "ui-option-selected" : ""} ${
                        opt.disabled ? "ui-option-disabled" : ""
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!opt.disabled) handleSelect(opt.value);
                      }}
                    >
                      <div className="ui-option-label-wrapper">
                        <span className="ui-option-text">{opt.label}</span>
                        {opt.badge && <span className="ui-option-badge">{opt.badge}</span>}
                      </div>
                      {isSelected && <Check size={16} className="ui-option-check" />}
                    </div>
                  );
                })
              )}
            </div>
          </div>,
          document.body
        )}

      {error && <span className="ui-field-error">{error}</span>}
      {!error && helperText && <span className="ui-field-helper">{helperText}</span>}
    </div>
  );
};
