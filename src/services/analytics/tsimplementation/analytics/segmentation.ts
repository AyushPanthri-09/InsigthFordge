import { prettify } from "../eda";

export interface SegmentContribution {
  dimension: string;
  segmentValue: string;
  metricSum: number;
  totalSum: number;
  contributionPct: number; // contribution score 0-100
  meanValue: number;
  overallMean: number;
  deviationPct: number; // how far this segment's mean deviates from overall mean
}

export interface SegmentationResult {
  targetMetric: string;
  contributions: SegmentContribution[];
  explanation: string;
}

/**
 * Automatically decomposes a target metric across dimension columns,
 * identifying which segments (e.g. Region, Product, Category) contribute the most.
 */
export function runSegmentationAnalysis(
  rows: Record<string, unknown>[],
  columns: string[],
  targetMetric: string,
  dimensionColumns: string[],
): SegmentationResult {
  const contributions: SegmentContribution[] = [];

  const metricValues = rows
    .map((r) => Number(r[targetMetric]))
    .filter((v) => Number.isFinite(v));

  if (metricValues.length === 0 || rows.length === 0) {
    return {
      targetMetric,
      contributions: [],
      explanation: `No numeric data found for metric ${prettify(targetMetric)}.`,
    };
  }

  const overallSum = metricValues.reduce((sum, v) => sum + v, 0);
  const overallMean = overallSum / metricValues.length;

  for (const dim of dimensionColumns) {
    // Avoid segmenting by the metric itself or columns with extreme cardinality
    if (dim === targetMetric) continue;

    // Group rows by segment
    const segmentSums = new Map<string, number>();
    const segmentCounts = new Map<string, number>();

    for (const r of rows) {
      const val = r[targetMetric];
      const numVal =
        typeof val === "number"
          ? val
          : Number(
              String(val)
                .replace(/[$£€¥₹%,]/g, "")
                .trim(),
            );
      if (!Number.isFinite(numVal)) continue;

      const segName = String(r[dim] ?? "Unknown").trim();
      if (!segName) continue;

      segmentSums.set(segName, (segmentSums.get(segName) ?? 0) + numVal);
      segmentCounts.set(segName, (segmentCounts.get(segName) ?? 0) + 1);
    }

    for (const [segVal, sumVal] of segmentSums.entries()) {
      const count = segmentCounts.get(segVal) ?? 1;
      const meanVal = sumVal / count;
      const contributionPct =
        overallSum !== 0 ? (sumVal / overallSum) * 100 : 0;
      const deviationPct =
        overallMean !== 0 ? ((meanVal - overallMean) / overallMean) * 100 : 0;

      contributions.push({
        dimension: dim,
        segmentValue: segVal,
        metricSum: sumVal,
        totalSum: overallSum,
        contributionPct,
        meanValue: meanVal,
        overallMean,
        deviationPct,
      });
    }
  }

  // Sort by contribution score (absolute value of contribution percentage) descending
  const sortedContributions = contributions
    .sort((a, b) => Math.abs(b.contributionPct) - Math.abs(a.contributionPct))
    .slice(0, 10); // Return top 10 contributing segments

  // Generate business narrative explanation
  let explanation = `Segmentation analysis of '${prettify(targetMetric)}' across dimensions. `;
  if (sortedContributions.length > 0) {
    const top = sortedContributions[0];
    explanation += `The top driver is segment "${top.segmentValue}" in dimension "${prettify(top.dimension)}", `;
    explanation += `contributing $${formatMoney(top.metricSum)} (${top.contributionPct.toFixed(1)}% of total sum). `;
    explanation += `This segment's average value is ${top.meanValue.toFixed(1)}, which is ${Math.abs(top.deviationPct).toFixed(1)}% ${top.deviationPct > 0 ? "above" : "below"} the overall mean of ${overallMean.toFixed(1)}.`;
  } else {
    explanation += "No significant segment drivers detected.";
  }

  return {
    targetMetric,
    contributions: sortedContributions,
    explanation,
  };
}

function formatMoney(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${(v / 1e3).toFixed(2)}K`;
  return v.toFixed(2);
}
