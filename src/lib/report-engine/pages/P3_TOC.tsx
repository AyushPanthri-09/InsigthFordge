import React from "react";
import { ReportPage } from "../primitives/ReportPage";
import { ReportSection } from "../primitives/ReportSection";

interface Props {
  datasetName: string;
  generatedAt: string;
}

export function P3_TOC({ datasetName, generatedAt }: Props) {
  const sections = [
    { num: 1, title: "Cover Page", desc: "Dataset identification, classification, and generation metadata" },
    { num: 2, title: "Executive Briefing & Summary", desc: "Business health gauge, top signals, primary opportunities, and risk profiles" },
    { num: 3, title: "Table of Contents", desc: "Systematic index of report chapters and technical exhibits" },
    { num: 4, title: "Performance KPI Dashboard", desc: "Detailed breakdown of financial, operational, and customer performance metrics" },
    { num: 5, title: "Data Quality Posture", desc: "Completeness audits, missing records analysis, column decisions, and duplicates" },
    { num: 6, title: "Historical Trend Analysis", desc: "Time-series decomposition, moving averages, and seasonality charts" },
    { num: 7, title: "Attribute Correlation Matrix", desc: "Pearson coefficients, driver strengths, and AI relationship interpretations" },
    { num: 8, title: "Anomaly & Outlier Detection", desc: "Z-score deviations, outlier tables, severities, and remediation plans" },
    { num: 9, title: "Time-Series Demand Forecasting", desc: "Seasonally backtested forecasts, projections, and predictive upper/lower bounds" },
    { num: 10, title: "Prescriptive Recommendations", desc: "Strategic prioritization cards, business value matrices, timelines, and impact scores" },
    { num: 11, title: "Technical Appendix", desc: "Statistical profiles, p-value tests, metadata registers, and analytical assumptions" },
  ];

  return (
    <ReportPage
      pageNumber={3}
      totalPages={11}
      title="Table of Contents"
      subtitle="Structured report index and guide to analytical exhibits"
      datasetName={datasetName}
      generatedAt={generatedAt}
    >
      <div style={{ padding: "10px 0" }}>
        <ReportSection title="Report Sections Index">
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {sections.map((s) => (
              <div
                key={s.num}
                style={{
                  display: "grid",
                  gridTemplateColumns: "36px 1fr auto",
                  gap: 16,
                  alignItems: "center",
                  borderBottom: "1px solid var(--rpt-border-light)",
                  paddingBottom: 10,
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 6,
                    background: "var(--rpt-surface2)",
                    border: "1px solid var(--rpt-border)",
                    color: "var(--rpt-brand)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 14,
                    fontWeight: 850,
                  }}
                >
                  {s.num.toString().padStart(2, "0")}
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--rpt-brand-dark)", marginBottom: 2 }}>
                    {s.title}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--rpt-text-muted)" }}>
                    {s.desc}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  {/* Visual dots leader line in TOC */}
                  <span
                    style={{
                      fontFamily: "var(--rpt-font-mono)",
                      fontSize: 12,
                      fontWeight: 800,
                      color: "var(--rpt-brand-dark)",
                      background: "var(--rpt-brand-soft)",
                      padding: "4px 10px",
                      borderRadius: 4,
                    }}
                  >
                    Page {s.num}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </ReportSection>
        
        {/* McKinsey Style Sidebar Note */}
        <div
          style={{
            marginTop: 26,
            background: "var(--rpt-surface2)",
            borderLeft: "4px solid var(--rpt-accent)",
            padding: 16,
            borderRadius: "0 6px 6px 0",
          }}
        >
          <div style={{ fontSize: 10.5, fontWeight: 800, color: "var(--rpt-accent)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Reading Guide
          </div>
          <p style={{ fontSize: 9.8, color: "var(--rpt-text-muted)", lineHeight: 1.5, margin: 0 }}>
            This report starts with a high-level executive briefing before progressing into detailed, component-level analysis dashboards (KPIs, Quality, Trends). For deep methodological references, p-value matrices, or specific data schemas, refer to the technical appendix on page 11.
          </p>
        </div>
      </div>
    </ReportPage>
  );
}
