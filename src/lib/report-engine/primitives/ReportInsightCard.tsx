import React from "react";

interface ReportInsightCardProps {
  title: string;
  children: React.ReactNode;
  badge?: string;
}

export function ReportInsightCard({ title, children, badge }: ReportInsightCardProps) {
  return (
    <div className="rpt-insight-card">
      <div className="rpt-insight-card-accent" />
      <div className="rpt-insight-card-header">
        <div className="rpt-insight-card-title">{title}</div>
        {badge && <div className="rpt-insight-card-badge">{badge}</div>}
      </div>
      <div className="rpt-insight-card-body">{children}</div>
    </div>
  );
}
