import React from "react";
import type { P1ExecutiveData } from "../types";
import { ReportPage } from "../primitives/ReportPage";
import { ReportBadge } from "../primitives/ReportBadge";

interface Props {
  data: P1ExecutiveData;
  datasetName: string;
  generatedAt: string;
}

export function P1_Cover({ data, datasetName, generatedAt }: Props) {
  const domainConfPct = Math.round((data.domainConfidence ?? 0.9) * 100);

  return (
    <ReportPage
      pageNumber={1}
      totalPages={13}
      title="Cover Page"
      isCover={true}
      className="rpt-cover"
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          height: "100%",
          padding: "20px 10px",
          color: "var(--rpt-ink)",
        }}
      >
        {/* Top Header Row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid var(--rpt-border)",
            paddingBottom: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 8,
                background:
                  "linear-gradient(135deg, var(--rpt-brand), var(--rpt-accent))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
                fontSize: 18,
                fontWeight: 900,
              }}
            >
              IF
            </div>
            <div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "var(--rpt-brand-dark)",
                }}
              >
                InsightForge AI
              </div>
              <div
                style={{
                  fontSize: 9,
                  color: "var(--rpt-text-muted)",
                  marginTop: 2,
                }}
              >
                Enterprise Business Intelligence Platform
              </div>
            </div>
          </div>
          <ReportBadge
            label="Confidential - Executive Review"
            variant="critical"
            dot
          />
        </div>

        {/* Center Hero Title */}
        <div style={{ margin: "50px 0 30px 0", position: "relative" }}>
          <div
            style={{
              position: "absolute",
              top: -30,
              left: -20,
              width: 120,
              height: 120,
              borderLeft: "2px solid var(--rpt-brand-soft)",
              borderTop: "2px solid var(--rpt-brand-soft)",
              opacity: 0.5,
              pointerEvents: "none",
            }}
          />

          <div
            style={{
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "var(--rpt-brand)",
              marginBottom: 12,
            }}
          >
            Project Name: InsightForge Analytics
          </div>
          <h1
            style={{
              fontSize: 32,
              lineHeight: 1.15,
              fontWeight: 900,
              color: "var(--rpt-brand-dark)",
              margin: 0,
              letterSpacing: "-0.02em",
            }}
          >
            {data.reportTitle || "Dataset Strategic Analysis"}
          </h1>

          {/* Executive Summary Snippet on Cover */}
          <div
            style={{
              marginTop: 20,
              padding: 16,
              background: "var(--rpt-surface2)",
              borderRadius: 8,
              borderLeft: "4px solid var(--rpt-brand)",
            }}
          >
            <div
              style={{
                fontSize: 9,
                fontWeight: 800,
                color: "var(--rpt-brand)",
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              Executive Abstract
            </div>
            <p
              style={{
                fontSize: 10.5,
                color: "var(--rpt-text)",
                lineHeight: 1.55,
                margin: 0,
              }}
            >
              {data.executiveSummary}
            </p>
          </div>
        </div>

        {/* Middle Overview Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 14,
            marginBottom: 20,
          }}
        >
          {/* Card 1: Domain & Confidence */}
          <div
            style={{
              background: "var(--rpt-surface2)",
              border: "1px solid var(--rpt-border)",
              borderRadius: 8,
              padding: 14,
            }}
          >
            <span
              style={{
                display: "block",
                fontSize: 9,
                fontWeight: 800,
                textTransform: "uppercase",
                color: "var(--rpt-text-muted)",
                marginBottom: 4,
              }}
            >
              Business Domain
            </span>
            <div
              style={{
                fontSize: 13,
                fontWeight: 800,
                color: "var(--rpt-brand-dark)",
                marginBottom: 6,
              }}
            >
              {data.domain}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 8.5,
                  color: "var(--rpt-text-muted)",
                }}
              >
                <span>Classification Confidence:</span>
                <span style={{ fontWeight: 700 }}>{domainConfPct}%</span>
              </div>
              {/* Confidence Meter Bar */}
              <div
                style={{
                  width: "100%",
                  height: 4,
                  borderRadius: 2,
                  background: "var(--rpt-border-light)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${domainConfPct}%`,
                    height: "100%",
                    background: "var(--rpt-accent)",
                    borderRadius: 2,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Card 2: Health Index */}
          <div
            style={{
              background: "var(--rpt-surface2)",
              border: "1px solid var(--rpt-border)",
              borderRadius: 8,
              padding: 14,
            }}
          >
            <span
              style={{
                display: "block",
                fontSize: 9,
                fontWeight: 800,
                textTransform: "uppercase",
                color: "var(--rpt-text-muted)",
                marginBottom: 4,
              }}
            >
              Dataset Health Score
            </span>
            <div
              style={{
                fontSize: 22,
                fontWeight: 900,
                color:
                  data.businessHealthScore >= 80
                    ? "var(--rpt-success)"
                    : "var(--rpt-warning)",
              }}
            >
              {data.businessHealthScore}%
            </div>
            <span style={{ fontSize: 8.5, color: "var(--rpt-text-muted)" }}>
              Weighted compliance and format posture.
            </span>
          </div>

          {/* Card 3: Quality Score */}
          <div
            style={{
              background: "var(--rpt-surface2)",
              border: "1px solid var(--rpt-border)",
              borderRadius: 8,
              padding: 14,
            }}
          >
            <span
              style={{
                display: "block",
                fontSize: 9,
                fontWeight: 800,
                textTransform: "uppercase",
                color: "var(--rpt-text-muted)",
                marginBottom: 4,
              }}
            >
              Data Quality Score
            </span>
            <div
              style={{
                fontSize: 22,
                fontWeight: 900,
                color:
                  data.dataQualityScore >= 80
                    ? "var(--rpt-success)"
                    : "var(--rpt-warning)",
              }}
            >
              {data.dataQualityScore}%
            </div>
            <span style={{ fontSize: 8.5, color: "var(--rpt-text-muted)" }}>
              Completeness and duplicate-free metrics.
            </span>
          </div>
        </div>

        {/* Bottom Details Grid */}
        <div
          style={{
            background: "var(--rpt-surface2)",
            border: "1px solid var(--rpt-border)",
            borderRadius: 8,
            padding: 16,
            display: "grid",
            gridTemplateColumns: "1.2fr 1fr",
            gap: 20,
          }}
        >
          <div>
            <div style={{ marginBottom: 12 }}>
              <span
                style={{
                  display: "block",
                  fontSize: 8.5,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  color: "var(--rpt-text-muted)",
                  letterSpacing: "0.08em",
                  marginBottom: 3,
                }}
              >
                Staged Dataset Name
              </span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "var(--rpt-ink)",
                  wordBreak: "break-all",
                }}
              >
                {datasetName}
              </span>
            </div>
            <div>
              <span
                style={{
                  display: "block",
                  fontSize: 8.5,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  color: "var(--rpt-text-muted)",
                  letterSpacing: "0.08em",
                  marginBottom: 3,
                }}
              >
                Analysis Metadata
              </span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "var(--rpt-ink)",
                }}
              >
                {data.rowCount.toLocaleString()} records / {data.columnCount}{" "}
                features
              </span>
            </div>
          </div>
          <div>
            <div style={{ marginBottom: 12 }}>
              <span
                style={{
                  display: "block",
                  fontSize: 8.5,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  color: "var(--rpt-text-muted)",
                  letterSpacing: "0.08em",
                  marginBottom: 3,
                }}
              >
                Date Generated
              </span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "var(--rpt-ink)",
                }}
              >
                {generatedAt}
              </span>
            </div>
            <div>
              <span
                style={{
                  display: "block",
                  fontSize: 8.5,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  color: "var(--rpt-text-muted)",
                  letterSpacing: "0.08em",
                  marginBottom: 3,
                }}
              >
                Platform Engine
              </span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "var(--rpt-ink)",
                }}
              >
                InsightForge v1.0.0 (100% Offline)
              </span>
            </div>
          </div>
        </div>

        {/* Footer Meta */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 9,
            color: "var(--rpt-text-faint)",
            borderTop: "1px solid var(--rpt-border-light)",
            paddingTop: 12,
            marginTop: 20,
          }}
        >
          <span>Prepared For: Corporate Executives & Stakeholders</span>
          <span>© InsightForge AI. All rights reserved.</span>
        </div>
      </div>
    </ReportPage>
  );
}
