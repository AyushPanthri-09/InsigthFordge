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
      <div className="rpt-watermark">InsightForge</div>
      <div className="rpt-corner-page">{pageNumber}</div>

      {!isCover && (
        <>
          <div className="rpt-page-header">
            <div className="rpt-page-header-brand">InsightForge AI</div>
            <div className="rpt-page-header-meta">
              {datasetName && (
                <div style={{ fontWeight: 700, color: "var(--rpt-ink)" }}>
                  {datasetName}
                </div>
              )}
              {generatedAt && <div>{generatedAt}</div>}
            </div>
          </div>

          <div className="rpt-page-title">
            <div>
              <div className="rpt-page-kicker">Executive Analytics</div>
              <h1>{title}</h1>
              {subtitle && <p>{subtitle}</p>}
            </div>
          </div>
        </>
      )}

      <div className="rpt-page-body">{children}</div>

      <div className="rpt-page-footer">
        <span>InsightForge AI / Confidential</span>
        <span>
          {title}
          {subtitle ? ` - ${subtitle}` : ""}
        </span>
        <span className="rpt-page-number">
          {pageNumber} / {totalPages}
        </span>
      </div>
    </div>
  );
}
