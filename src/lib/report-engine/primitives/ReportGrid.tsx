import React from "react";

interface ReportGridProps {
  cols?: 2 | 3 | 4 | "auto";
  gap?: number;
  children: React.ReactNode;
  className?: string;
}

export function ReportGrid({ cols = 2, gap = 12, children, className = "" }: ReportGridProps) {
  const colClass =
    cols === "auto" ? "rpt-grid-auto" :
    cols === 2 ? "rpt-grid-2" :
    cols === 3 ? "rpt-grid-3" :
    "rpt-grid-4";

  return (
    <div
      className={`rpt-grid ${colClass} ${className}`}
      style={{ gap }}
    >
      {children}
    </div>
  );
}
