import React from "react";
import "../report-tokens.css";

interface ReportPageProps {
  pageNumber: number;
  totalPages: number;
  title: string;
  subtitle?: string;
  datasetName?: string;
  generatedAt?: string;
  children: React.ReactNode;
  className?: string;
  /** Pass true for the cover page to suppress the standard header */
  isCover?: boolean;
}

export function ReportPage({
  pageNumber,
  totalPages,
  title,
  subtitle,
  datasetName,
  generatedAt,
  children,
  className = "",
  isCover = false,
}: ReportPageProps) {
  return (
    <div className={`rpt-page ${className}`} data-page={pageNumber}>
      {/* Watermark */}
      <div className="rpt-watermark">InsightForge</div>

      {/* Standard page header */}
      {!isCover && (
        <div className="rpt-page-header">
          <div className="rpt-page-header-brand">
            <div className="rpt-page-header-dot" />
            InsightForge AI
          </div>
          <div className="rpt-page-header-meta">
            {datasetName && <div style={{ fontWeight: 600, color: "var(--rpt-text-muted)" }}>{datasetName}</div>}
            {generatedAt && <div>{generatedAt}</div>}
          </div>
        </div>
      )}

      {/* Page content */}
      <div style={{ paddingBottom: 60 }}>{children}</div>

      {/* Footer */}
      <div className="rpt-page-footer">
        <span>InsightForge AI · Confidential</span>
        <span>{title}{subtitle ? ` — ${subtitle}` : ""}</span>
        <span className="rpt-page-number">
          {pageNumber} / {totalPages}
        </span>
      </div>
    </div>
  );
}
