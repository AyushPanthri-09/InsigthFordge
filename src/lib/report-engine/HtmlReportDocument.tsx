import React from "react";
import type { ReportDocument } from "./types";
import {
  P1_Cover,
  P2_ExecutiveSummary,
  P3_TOC,
  P4_KPIDashboard,
  P5_DataQuality,
  P6_Trends,
  P7_Correlations,
  P5_Anomalies,
  P6_Forecast,
  P7_Recommendations,
  Appendix,
} from "./pages";

interface Props {
  doc: ReportDocument;
}

/**
 * Renders the complete report as a sequence of exactly 11 A4 pages.
 * Used both for the live in-app preview and as the source for print HTML/PDF export.
 */
export function HtmlReportDocument({ doc }: Props) {
  const shared = { datasetName: doc.datasetName, generatedAt: doc.generatedAt };

  return (
    <div className="rpt-document">
      <P1_Cover data={doc.p1} {...shared} />
      <P2_ExecutiveSummary data={doc.p1} {...shared} />
      <P3_TOC executiveData={doc.p1} performanceData={doc.p2} {...shared} />
      <P4_KPIDashboard
        data={doc.p2}
        {...shared}
        businessHealthScore={doc.p1.businessHealthScore}
        dataQualityScore={doc.p1.dataQualityScore}
      />
      <P5_DataQuality data={doc.p4} {...shared} />
      <P6_Trends data={doc.p3} {...shared} />
      <P7_Correlations data={doc.p2} {...shared} />
      <P5_Anomalies data={doc.p5} {...shared} />
      <P6_Forecast data={doc.p6} {...shared} />
      <P7_Recommendations data={doc.p7} {...shared} />
      <Appendix data={doc.appendix} {...shared} />
    </div>
  );
}
