import React, { ReactNode, CSSProperties, HTMLAttributes } from "react";
import "./ui.css";

export interface UiContainerProps extends HTMLAttributes<HTMLDivElement> {
  maxWidth?: "sm" | "md" | "lg" | "xl" | "full";
  children: ReactNode;
}

export const UiContainer: React.FC<UiContainerProps> = ({
  maxWidth = "xl",
  children,
  className = "",
  ...props
}) => (
  <div className={`ui-container ui-container-${maxWidth} ${className}`} {...props}>
    {children}
  </div>
);

export interface UiStackProps extends HTMLAttributes<HTMLDivElement> {
  gap?: number | string;
  align?: "start" | "center" | "end" | "stretch";
  justify?: "start" | "center" | "end" | "between";
  children: ReactNode;
}

export const UiStack: React.FC<UiStackProps> = ({
  gap = 16,
  align = "stretch",
  justify = "start",
  children,
  style,
  className = "",
  ...props
}) => {
  const gapValue = typeof gap === "number" ? `${gap}px` : gap;
  const inlineStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: gapValue,
    alignItems: align === "start" ? "flex-start" : align === "end" ? "flex-end" : align,
    justifyContent: justify === "start" ? "flex-start" : justify === "end" ? "flex-end" : justify === "between" ? "space-between" : justify,
    ...style,
  };
  return (
    <div className={`ui-stack ${className}`} style={inlineStyle} {...props}>
      {children}
    </div>
  );
};

export interface UiFlexProps extends HTMLAttributes<HTMLDivElement> {
  gap?: number | string;
  align?: "start" | "center" | "end" | "stretch" | "baseline";
  justify?: "start" | "center" | "end" | "between" | "around";
  wrap?: boolean;
  children: ReactNode;
}

export const UiFlex: React.FC<UiFlexProps> = ({
  gap = 12,
  align = "center",
  justify = "start",
  wrap = false,
  children,
  style,
  className = "",
  ...props
}) => {
  const gapValue = typeof gap === "number" ? `${gap}px` : gap;
  const inlineStyle: CSSProperties = {
    display: "flex",
    flexDirection: "row",
    gap: gapValue,
    alignItems: align === "start" ? "flex-start" : align === "end" ? "flex-end" : align,
    justifyContent: justify === "start" ? "flex-start" : justify === "end" ? "flex-end" : justify === "between" ? "space-between" : justify,
    flexWrap: wrap ? "wrap" : "nowrap",
    ...style,
  };
  return (
    <div className={`ui-flex ${className}`} style={inlineStyle} {...props}>
      {children}
    </div>
  );
};

export interface UiGridProps extends HTMLAttributes<HTMLDivElement> {
  columns?: number | string;
  minColWidth?: string;
  gap?: number | string;
  children: ReactNode;
}

export const UiGrid: React.FC<UiGridProps> = ({
  columns,
  minColWidth = "280px",
  gap = 16,
  children,
  style,
  className = "",
  ...props
}) => {
  const gapValue = typeof gap === "number" ? `${gap}px` : gap;
  const gridTemplate = columns
    ? typeof columns === "number"
      ? `repeat(${columns}, 1fr)`
      : columns
    : `repeat(auto-fit, minmax(${minColWidth}, 1fr))`;

  const inlineStyle: CSSProperties = {
    display: "grid",
    gridTemplateColumns: gridTemplate,
    gap: gapValue,
    ...style,
  };
  return (
    <div className={`ui-grid ${className}`} style={inlineStyle} {...props}>
      {children}
    </div>
  );
};

export const UiDivider: React.FC<{ margin?: number | string; className?: string }> = ({
  margin = 16,
  className = "",
}) => {
  const marginVal = typeof margin === "number" ? `${margin}px` : margin;
  return <hr className={`ui-divider ${className}`} style={{ margin: `${marginVal} 0` }} />;
};

export const UiSpacer: React.FC<{ size?: number | string }> = ({ size = 16 }) => {
  const sizeVal = typeof size === "number" ? `${size}px` : size;
  return <div style={{ width: sizeVal, height: sizeVal, flexShrink: 0 }} aria-hidden="true" />;
};
