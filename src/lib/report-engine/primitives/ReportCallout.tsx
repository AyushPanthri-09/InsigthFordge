import React from "react";
import type { ReportSeverity } from "../types";

const ICONS: Record<ReportSeverity, string> = {
  critical: "!",
  warning: "!",
  info: "i",
  success: "+",
};

interface ReportCalloutProps {
  title: string;
  text: string;
  severity?: ReportSeverity;
  icon?: string;
}

export function ReportCallout({ title, text, severity = "info", icon }: ReportCalloutProps) {
  return (
    <div className={`rpt-callout rpt-callout-${severity}`}>
      <span className="rpt-callout-icon">{icon ?? ICONS[severity]}</span>
      <div className="rpt-callout-body">
        <div className="rpt-callout-title">{title}</div>
        <div className="rpt-callout-text">{text}</div>
      </div>
    </div>
  );
}
