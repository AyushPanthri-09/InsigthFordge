import React from "react";

interface ReportSectionProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function ReportSection({
  title,
  children,
  className = "",
}: ReportSectionProps) {
  return (
    <div className={`rpt-section ${className}`}>
      <div className="rpt-section-title">{title}</div>
      {children}
    </div>
  );
}
