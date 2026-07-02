import React from "react";
import type { P5AnomaliesData } from "../types";
import { ReportPage } from "../primitives/ReportPage";
import { ReportSection } from "../primitives/ReportSection";
import { ReportTable } from "../primitives/ReportTable";
import { ReportBadge } from "../primitives/ReportBadge";

interface Props {
  data: P5AnomaliesData;
  datasetName: string;
  generatedAt: string;
}

export function P8_StatisticalAnalysis({
  data,
  datasetName,
  generatedAt,
}: Props) {
  const tests = data.statisticalTests ?? [];

  const statRows = tests.map((t, idx) => ({
    id: String(idx),
    testName: t.testName,
    status: t.isSignificant ? "Significant" : "Not Significant",
    interpretation: t.interpretation,
    implication: t.businessImplication,
  }));

  const statColumns = [
    { key: "testName", header: "Hypothesis Test", mono: true },
    {
      key: "status",
      header: "Result",
      render: (row: (typeof statRows)[number]) => (
        <ReportBadge
          label={row.status}
          variant={row.status === "Significant" ? "success" : "neutral"}
        />
      ),
    },
    { key: "interpretation", header: "Statistical Interpretation" },
    { key: "implication", header: "Business Implication" },
  ];

  return (
    <ReportPage
      pageNumber={8}
      totalPages={13}
      title="Statistical Hypothesis Testing"
      subtitle="Statistical comparisons, group variance tests, p-value calculations, and significance interpretations"
      datasetName={datasetName}
      generatedAt={generatedAt}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Statistical Summary Callout */}
        <div
          style={{
            background: "var(--rpt-surface2)",
            border: "1px solid var(--rpt-border)",
            borderRadius: 6,
            padding: 12,
            borderLeft: "3px solid var(--rpt-brand)",
          }}
        >
          <div
            style={{
              fontSize: 9,
              fontWeight: 800,
              color: "var(--rpt-brand)",
              textTransform: "uppercase",
              marginBottom: 3,
            }}
          >
            Statistical Framework Overview
          </div>
          <p
            style={{
              fontSize: 10.5,
              color: "var(--rpt-ink)",
              lineHeight: 1.5,
              margin: 0,
            }}
          >
            Automated hypothesis testing sweeps were executed to identify
            statistically significant differences and correlations across
            categories. We apply p-value checks (alpha = 0.05) to rule out
            chance variation and establish true business drivers.
          </p>
        </div>

        {/* Tests Table */}
        <ReportSection title="Hypothesis Testing Register">
          <div className="rpt-card" style={{ padding: 12 }}>
            {tests.length > 0 ? (
              <ReportTable columns={statColumns} rows={statRows} />
            ) : (
              <div
                style={{
                  textAlign: "center",
                  padding: "20px 0",
                  color: "var(--rpt-text-muted)",
                  fontSize: 11,
                }}
              >
                No active category hypothesis tests were generated. The dataset
                has uniform parameters.
              </div>
            )}
          </div>
        </ReportSection>

        {/* Statistical Interpretation Rationale */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.1fr 0.9fr",
            gap: 14,
          }}
        >
          <ReportSection title="Methodological Details">
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                {
                  title: "Normality Checks",
                  desc: "Skewness and kurtosis calculations identify deviations from the normal Gaussian bell-curve.",
                  type: "Shapiro-Wilk / KS",
                },
                {
                  title: "Group Comparisons",
                  desc: "ANOVA and Kruskal-Wallis tests assess if metric averages significantly differ across categories.",
                  type: "F-test / Chi-Sq",
                },
                {
                  title: "Feature Independence",
                  desc: "Chi-square contingency analysis validates relationships between categorical variables.",
                  type: "Independence Test",
                },
              ].map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    background: "var(--rpt-surface2)",
                    border: "1px solid var(--rpt-border-light)",
                    borderRadius: 6,
                    padding: 10,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 4,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 10.5,
                        fontWeight: 750,
                        color: "var(--rpt-brand-dark)",
                      }}
                    >
                      {item.title}
                    </span>
                    <ReportBadge label={item.type} variant="neutral" />
                  </div>
                  <p
                    style={{
                      fontSize: 9,
                      color: "var(--rpt-text-muted)",
                      lineHeight: 1.4,
                      margin: 0,
                    }}
                  >
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </ReportSection>

          <ReportSection title="Business Guidance">
            <div
              style={{
                background: "var(--rpt-brand-soft)",
                border: "1px solid rgba(21, 94, 239, 0.15)",
                borderRadius: 6,
                padding: 12,
                height: "100%",
                boxSizing: "border-box",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "var(--rpt-brand-dark)",
                  marginBottom: 6,
                }}
              >
                How to read results
              </div>
              <ul
                style={{
                  paddingLeft: 16,
                  margin: 0,
                  fontSize: 9.5,
                  color: "var(--rpt-text)",
                  lineHeight: 1.55,
                }}
              >
                <li style={{ marginBottom: 6 }}>
                  <strong>Significant:</strong> Rejects the null hypothesis.
                  There is a verified operational difference between these
                  groups that warrants action.
                </li>
                <li style={{ marginBottom: 6 }}>
                  <strong>Not Significant:</strong> Fails to reject the null
                  hypothesis. Differences are likely due to random noise, and no
                  category changes are recommended.
                </li>
                <li>
                  <strong>Effect Size:</strong> Measures the magnitude of
                  difference. Even significant results should only be
                  prioritized if the effect size is moderate or high.
                </li>
              </ul>
            </div>
          </ReportSection>
        </div>
      </div>
    </ReportPage>
  );
}
