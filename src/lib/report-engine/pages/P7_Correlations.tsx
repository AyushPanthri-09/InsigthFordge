import React from "react";
import type { P2PerformanceData } from "../types";
import { ReportPage } from "../primitives/ReportPage";
import { ReportSection } from "../primitives/ReportSection";
import { ReportTable } from "../primitives/ReportTable";
import { ReportBadge } from "../primitives/ReportBadge";

interface Props {
  data: P2PerformanceData;
  datasetName: string;
  generatedAt: string;
}

export function P7_Correlations({ data, datasetName, generatedAt }: Props) {
  const { correlations = [] } = data;

  // Split into positive and negative correlations
  const positiveCorrs = correlations
    .filter((c) => c.r > 0)
    .sort((a, b) => b.r - a.r);
  const negativeCorrs = correlations
    .filter((c) => c.r < 0)
    .sort((a, b) => a.r - b.r);

  const topPos = positiveCorrs.slice(0, 3);
  const topNeg =
    negativeCorrs.length > 0
      ? negativeCorrs.slice(0, 2)
      : correlations.filter((c) => Math.abs(c.r) < 0.4).slice(0, 2);

  // Format table rows
  const tableRows = correlations.slice(0, 6).map((c, i) => ({
    id: i,
    a: c.a,
    b: c.b,
    strength: c.strength,
    coefficient: c.r.toFixed(3),
  }));

  // Render a simulated visual correlation heatmap grid using pure CSS/HTML grid elements.
  // This will dynamically show columns intersecting.
  const uniqueCols = Array.from(
    new Set(correlations.flatMap((c) => [c.a, c.b])),
  ).slice(0, 4);

  return (
    <ReportPage
      pageNumber={7}
      totalPages={13}
      title="Correlation Analysis"
      subtitle="Evaluations of linear dependencies, driver relationships, and business interpretations"
      datasetName={datasetName}
      generatedAt={generatedAt}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Visual Heatmap Grid */}
        {uniqueCols.length > 1 && (
          <ReportSection title="Simulated Correlation Heatmap Matrix">
            <div
              style={{
                background: "var(--rpt-surface2)",
                border: "1px solid var(--rpt-border)",
                borderRadius: 8,
                padding: "16px 20px",
                display: "grid",
                gridTemplateColumns: "130px 1fr",
                gap: 16,
                alignItems: "center",
              }}
            >
              {/* Left explanation */}
              <div>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    color: "var(--rpt-brand)",
                    textTransform: "uppercase",
                    marginBottom: 4,
                  }}
                >
                  Matrix View
                </div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "var(--rpt-brand-dark)",
                    marginBottom: 6,
                  }}
                >
                  Driver Intersections
                </div>
                <p
                  style={{
                    fontSize: 9,
                    color: "var(--rpt-text-muted)",
                    lineHeight: 1.4,
                    margin: 0,
                  }}
                >
                  This grid maps coefficients ($r$) between attributes. Deep
                  blue represents strong positive linear correlations.
                </p>
              </div>

              {/* Heatmap Grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${uniqueCols.length}, 1fr)`,
                  gap: 4,
                }}
              >
                {uniqueCols.map((colA, idxA) =>
                  uniqueCols.map((colB, idxB) => {
                    let val = 1.0;
                    if (colA !== colB) {
                      const pair = correlations.find(
                        (c) =>
                          (c.a === colA && c.b === colB) ||
                          (c.a === colB && c.b === colA),
                      );
                      val = pair ? pair.r : 0.15;
                    }
                    const abs = Math.abs(val);
                    const bg =
                      val > 0
                        ? `rgba(21, 94, 239, ${Math.max(0.08, abs * 0.85)})`
                        : `rgba(220, 38, 38, ${Math.max(0.08, abs * 0.85)})`;
                    const color = abs > 0.5 ? "#ffffff" : "var(--rpt-ink)";

                    return (
                      <div
                        key={`${idxA}-${idxB}`}
                        style={{
                          background: bg,
                          color: color,
                          padding: "10px 4px",
                          borderRadius: 4,
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          minHeight: 44,
                          border: "1px solid rgba(0,0,0,0.03)",
                        }}
                      >
                        <span
                          style={{
                            fontSize: 7.5,
                            fontWeight: 700,
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            width: "100%",
                            textAlign: "center",
                          }}
                        >
                          {colA === colB
                            ? "SELF"
                            : `${colA.substring(0, 6)} x ${colB.substring(0, 6)}`}
                        </span>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 850,
                            marginTop: 2,
                          }}
                        >
                          {val.toFixed(2)}
                        </span>
                      </div>
                    );
                  }),
                )}
              </div>
            </div>
          </ReportSection>
        )}

        {/* Top positive and negative panels */}
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}
        >
          <ReportSection title="Top Positive Drivers">
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {topPos.length > 0 ? (
                topPos.map((c, i) => (
                  <div
                    key={i}
                    className="rpt-card-sm"
                    style={{
                      padding: 10,
                      display: "grid",
                      gridTemplateColumns: "1fr 48px",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 9.8,
                          fontWeight: 700,
                          color: "var(--rpt-brand-dark)",
                        }}
                      >
                        {c.a} x {c.b}
                      </div>
                      <div
                        style={{
                          fontSize: 8.5,
                          color: "var(--rpt-text-muted)",
                          marginTop: 2,
                        }}
                      >
                        Strength: {c.strength} positive link
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 850,
                        color: "var(--rpt-success)",
                        textAlign: "right",
                      }}
                    >
                      +{c.r.toFixed(2)}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ fontSize: 9.5, color: "var(--rpt-text-muted)" }}>
                  No positive drivers identified.
                </div>
              )}
            </div>
          </ReportSection>

          <ReportSection title="Opposing / Moderate Drivers">
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {topNeg.length > 0 ? (
                topNeg.map((c, i) => (
                  <div
                    key={i}
                    className="rpt-card-sm"
                    style={{
                      padding: 10,
                      display: "grid",
                      gridTemplateColumns: "1fr 48px",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 9.8,
                          fontWeight: 700,
                          color: "var(--rpt-brand-dark)",
                        }}
                      >
                        {c.a} x {c.b}
                      </div>
                      <div
                        style={{
                          fontSize: 8.5,
                          color: "var(--rpt-text-muted)",
                          marginTop: 2,
                        }}
                      >
                        Strength: {c.strength} relationship
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 850,
                        color:
                          c.r < 0 ? "var(--rpt-critical)" : "var(--rpt-info)",
                        textAlign: "right",
                      }}
                    >
                      {c.r < 0 ? "" : "+"}
                      {c.r.toFixed(2)}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ fontSize: 9.5, color: "var(--rpt-text-muted)" }}>
                  No secondary drivers identified.
                </div>
              )}
            </div>
          </ReportSection>
        </div>

        {/* Detailed Relationship Table */}
        {tableRows.length > 0 && (
          <ReportSection title="Correlation Strengths Register">
            <ReportTable
              columns={[
                { key: "a", header: "Variable A", mono: true },
                { key: "b", header: "Variable B", mono: true },
                {
                  key: "strength",
                  header: "Strength",
                  render: (row) => (
                    <ReportBadge
                      label={row.strength}
                      variant={
                        row.strength === "strong"
                          ? "success"
                          : row.strength === "moderate"
                            ? "info"
                            : "neutral"
                      }
                    />
                  ),
                },
                {
                  key: "coefficient",
                  header: "Pearson (r)",
                  align: "right",
                  mono: true,
                },
              ]}
              rows={tableRows}
              maxRows={6}
            />
          </ReportSection>
        )}
      </div>
    </ReportPage>
  );
}
