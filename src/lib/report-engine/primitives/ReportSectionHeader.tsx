import React from "react";

interface ReportSectionHeaderProps {
  title: string;
  eyebrow?: string;
  description?: string;
}

export function ReportSectionHeader({ title, eyebrow, description }: ReportSectionHeaderProps) {
  return (
    <div className="rpt-section-header">
      {eyebrow && <div className="rpt-section-header-eyebrow">{eyebrow}</div>}
      <div className="rpt-section-header-title">{title}</div>
      {description && <p className="rpt-section-header-description">{description}</p>}
    </div>
  );
}
