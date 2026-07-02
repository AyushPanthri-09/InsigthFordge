import React from "react";
import type { ReportDocument } from "./types";
import {
  P1_Cover,
  P2_ExecutiveSummary,
  P4_KPIDashboard,
  P5_DataQuality,
  P5_EDA,
  P6_Trends,
  P7_Correlations,
  P8_StatisticalAnalysis,
  P5_Anomalies,
  P10_RootCause,
  P6_Forecast,
  P7_Recommendations,
  Appendix,
} from "./pages";

interface Props {
  doc: ReportDocument;
}

/**
 * Renders the complete report as a sequence of exactly 13 A4 pages.
 * Used both for the live in-app preview and as the source for print HTML/PDF export.
 */
export function HtmlReportDocument({ doc }: Props) {
  const shared = { datasetName: doc.datasetName, generatedAt: doc.generatedAt };

  return (
    <div className="rpt-document">
      {/* Page 1: Cover Page */}
      <P1_Cover data={doc.p1} {...shared} />

      {/* Page 2: Executive Summary */}
      <P2_ExecutiveSummary data={doc.p1} {...shared} />

      {/* Page 3: KPI Dashboard */}
      <P4_KPIDashboard
        data={doc.p2}
        {...shared}
        businessHealthScore={doc.p1.businessHealthScore}
        dataQualityScore={doc.p1.dataQualityScore}
      />

      {/* Page 4: Data Quality Report */}
      <P5_DataQuality data={doc.p4} {...shared} />

      {/* Page 5: Exploratory Data Analysis */}
      <P5_EDA
        appendixData={doc.appendix}
        performanceData={doc.p2}
        trendsData={doc.p3}
        {...shared}
      />

      {/* Page 6: Trend Analysis */}
      <P6_Trends data={doc.p3} {...shared} />

      {/* Page 7: Correlation Analysis */}
      <P7_Correlations data={doc.p2} {...shared} />

      {/* Page 8: Statistical Analysis */}
      <P8_StatisticalAnalysis data={doc.p5} {...shared} />

      {/* Page 9: Anomaly Detection */}
      <P5_Anomalies data={doc.p5} {...shared} />

      {/* Page 10: Root Cause Analysis */}
      <P10_RootCause data={doc.p5} {...shared} />

      {/* Page 11: Forecasting */}
      <P6_Forecast data={doc.p6} {...shared} />

      {/* Page 12: Strategic Recommendations */}
      <P7_Recommendations data={doc.p7} {...shared} />

      {/* Page 13: Technical Appendix */}
      <Appendix data={doc.appendix} {...shared} />
    </div>
  );
}
