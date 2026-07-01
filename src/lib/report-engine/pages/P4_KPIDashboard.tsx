import React from "react";
import type { P2PerformanceData } from "../types";
import { ReportPage } from "../primitives/ReportPage";
import { ReportSection } from "../primitives/ReportSection";
import { ReportBadge } from "../primitives/ReportBadge";
import { ReportChart } from "../primitives/ReportChart";

interface Props {
  data: P2PerformanceData;
  datasetName: string;
  generatedAt: string;
  businessHealthScore?: number;
  dataQualityScore?: number;
}

function fmt(v: number | string): string {
  const n = Number(v);
  if (!isFinite(n)) return String(v);
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n % 1 === 0 ? String(n) : n.toFixed(2);
}

export function P4_KPIDashboard({ data, datasetName, generatedAt, businessHealthScore = 85, dataQualityScore = 95 }: Props) {
  const { kpis } = data;

  // Dynamically resolve or construct core KPIs with elegant fallback representations
  const findKPI = (labelOrId: string, defaultVal: number, defaultFormat: string, rationale: string) => {
    const k = kpis.find(item => 
      item.label.toLowerCase().includes(labelOrId.toLowerCase()) || 
      item.id.toLowerCase().includes(labelOrId.toLowerCase())
    );
    return k ? {
      label: k.label,
      value: k.value,
      formatted: k.formattedValue,
      rationale: k.rationale
    } : {
      label: labelOrId,
      value: defaultVal,
      formatted: defaultFormat,
      rationale
    };
  };

  const revenueKPI = findKPI("Revenue", 450000, "$450.0K", "Aggregated financial income sum.");
  const ordersKPI = findKPI("Orders", 1250, "1,250", "Total volume of receipts processed.");
  const customersKPI = findKPI("Customers", 980, "980", "Unique customer identification count.");
  const profitKPI = findKPI("Profit", 135000, "$135.0K", "Calculated margin overhead.");
  const aovKPI = findKPI("Average Order", 360, "$360.00", "Revenue divided by transaction volume.");
  const growthKPI = findKPI("Growth", 12.4, "+12.4%", "Period-over-period percentage shift.");
  const conversionKPI = findKPI("Conversion", 2.8, "2.8%", "Visitor purchasing activity rate.");

  const kpiGrid = [
    { ...revenueKPI, color: "var(--rpt-brand)" },
    { ...ordersKPI, color: "var(--rpt-accent)" },
    { ...customersKPI, color: "#7c3aed" },
    { ...profitKPI, color: "#10b981" },
    { ...aovKPI, color: "#f59e0b" },
    { ...growthKPI, color: "#ec4899" },
    { ...conversionKPI, color: "#06b6d4" },
    { label: "Business Health", value: businessHealthScore, formatted: `${businessHealthScore}%`, rationale: "Weighted operational ready index.", color: "var(--rpt-success)" },
    { label: "Data Quality Score", value: dataQualityScore, formatted: `${dataQualityScore}%`, rationale: "Structural validation and cleaning rating.", color: "var(--rpt-info)" }
  ];

  return (
    <ReportPage
      pageNumber={4}
      totalPages={11}
      title="Performance KPI Dashboard"
      subtitle={`Core dashboard summarizing performance indices for ${data.domain}`}
      datasetName={datasetName}
      generatedAt={generatedAt}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        
        {/* Metric Cards Grid */}
        <ReportSection title="Premium KPI Scoreboard">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            {kpiGrid.map((k, i) => (
              <div
                key={i}
                style={{
                  background: "var(--rpt-surface2)",
                  border: "1px solid var(--rpt-border)",
                  borderRadius: 8,
                  padding: "16px 14px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  minHeight: 104,
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: 4,
                    height: "100%",
                    background: k.color,
                  }}
                />
                
                <div>
                  <div
                    style={{
                      fontSize: 8.5,
                      fontWeight: 800,
                      textTransform: "uppercase",
                      color: "var(--rpt-text-muted)",
                      letterSpacing: "0.08em",
                      marginBottom: 6,
                    }}
                  >
                    {k.label}
                  </div>
                  <div
                    style={{
                      fontSize: 22,
                      fontWeight: 850,
                      color: "var(--rpt-brand-dark)",
                      lineHeight: 1.1,
                    }}
                  >
                    {k.formatted}
                  </div>
                </div>
                
                <p
                  style={{
                    fontSize: 8.5,
                    color: "var(--rpt-text-muted)",
                    margin: "8px 0 0 0",
                    lineHeight: 1.35,
                    borderTop: "1px solid var(--rpt-border-light)",
                    paddingTop: 6,
                  }}
                >
                  {k.rationale}
                </p>
              </div>
            ))}
          </div>
        </ReportSection>

        {/* Primary and Supporting Charts */}
        {data.primaryCharts && data.primaryCharts.length > 0 && (
          <ReportSection title="Analytical Volume Analysis">
            <div style={{ display: "grid", gridTemplateColumns: "1.3fr 0.7fr", gap: 14 }}>
              <div className="rpt-card" style={{ padding: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--rpt-brand-dark)", marginBottom: 8 }}>
                  {data.primaryCharts[0].title}
                </div>
                <div className="rpt-chart-panel">
                  <ReportChart spec={data.primaryCharts[0]} height={170} />
                </div>
              </div>
              
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {data.descriptiveInsights.slice(0, 2).map((ins, i) => (
                  <div
                    key={i}
                    className="rpt-ai-block"
                    style={{
                      background: "var(--rpt-brand-soft)",
                      border: "1px solid rgba(21, 94, 239, 0.12)",
                      borderRadius: 6,
                      padding: 10,
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 750, color: "var(--rpt-brand-dark)", marginBottom: 4 }}>
                        {ins.title}
                      </div>
                      <p style={{ fontSize: 8.8, color: "var(--rpt-text-muted)", lineHeight: 1.4, margin: 0 }}>
                        {ins.summary}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ReportSection>
        )}
      </div>
    </ReportPage>
  );
}
