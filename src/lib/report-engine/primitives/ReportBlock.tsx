import React from "react";

interface ReportBlockProps {
  title?: string;
  subtitle?: string;
  variant?: "default" | "sm" | "accent";
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function ReportBlock({
  title,
  subtitle,
  variant = "default",
  children,
  className = "",
  style,
}: ReportBlockProps) {
  const cls =
    variant === "sm" ? "rpt-card-sm" :
    variant === "accent" ? "rpt-card-accent" :
    "rpt-card";

  return (
    <div className={`${cls} ${className}`} style={style}>
      {title && (
        <div style={{ marginBottom: subtitle ? 2 : 12 }}>
          <div className="rpt-h3">{title}</div>
          {subtitle && <div className="rpt-muted" style={{ fontSize: 10, marginTop: 2 }}>{subtitle}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
