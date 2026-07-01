import React from "react";
import type { ReportDocument } from "./types";
import { P1_Executive }       from "./pages/P1_Executive";
import { P2_Performance }     from "./pages/P2_Performance";
import { P3_Trends }          from "./pages/P3_Trends";
import { P4_DataQuality }     from "./pages/P4_DataQuality";
import { P5_Anomalies }       from "./pages/P5_Anomalies";
import { P6_Forecast }        from "./pages/P6_Forecast";
import { P7_Recommendations } from "./pages/P7_Recommendations";
import { Appendix }           from "./pages/Appendix";

interface Props {
  doc: ReportDocument;
}

/**
 * Renders the complete report as a sequence of .rpt-page divs.
 * Used both for the live in-app preview and as the source for PDF capture.
 */
export function HtmlReportDocument({ doc }: Props) {
  const shared = { datasetName: doc.datasetName, generatedAt: doc.generatedAt };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0, background: "#0f0e1a" }}>
      <P1_Executive      data={doc.p1} />
      <P2_Performance    data={doc.p2} {...shared} />
      <P3_Trends         data={doc.p3} {...shared} />
      <P4_DataQuality    data={doc.p4} {...shared} />
      <P5_Anomalies      data={doc.p5} {...shared} />
      <P6_Forecast       data={doc.p6} {...shared} />
      <P7_Recommendations data={doc.p7} {...shared} />
      <Appendix          data={doc.appendix} {...shared} />
    </div>
  );
}
