import React from "react";

interface EvidenceItem {
  label: string;
  detail?: string;
  tone?: "critical" | "warning" | "success" | "info" | "neutral";
}

interface ReportEvidencePanelProps {
  title: string;
  children?: React.ReactNode;
  items?: EvidenceItem[];
}

export function ReportEvidencePanel({ title, children, items = [] }: ReportEvidencePanelProps) {
  return (
    <div className="rpt-evidence-panel">
      <div className="rpt-evidence-panel-title">{title}</div>
      {children}
      {items.length > 0 && (
        <div className="rpt-evidence-list">
          {items.map((item, index) => (
            <div key={`${item.label}-${index}`} className="rpt-evidence-item">
              <span className={`rpt-evidence-dot rpt-evidence-dot-${item.tone ?? "neutral"}`} />
              <div>
                <div className="rpt-evidence-label">{item.label}</div>
                {item.detail && <div className="rpt-evidence-detail">{item.detail}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
