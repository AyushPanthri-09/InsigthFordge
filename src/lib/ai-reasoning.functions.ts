import { createServerFn } from "@tanstack/react-start";
import { generateText, Output } from "ai";
import { z } from "zod";

const MODEL = "google/gemini-3-flash-preview";

async function getGateway() {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY is not configured on the server.");
  const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
  return createLovableAiGatewayProvider(key);
}

/* ───────────────────────────── Dataset Understanding ──────────────────────── */

const UnderstandingInput = z.object({
  fileName: z.string(),
  columns: z.array(z.string()),
  sampleRows: z.array(z.record(z.string(), z.unknown())).max(15),
  rowCount: z.number(),
  notes: z.string().optional(),
});

const UnderstandingInputV2 = UnderstandingInput.extend({
  // Phase 1: enriched context from the Business Context Engine
  heuristicDomain: z.string().optional(),
  heuristicConfidence: z.number().optional(),
  domainRationale: z.string().optional(),
  processName: z.string().optional(),
  kpiHints: z.array(z.string()).optional(),
  columnIntelligenceSummary: z.array(z.object({
    column: z.string(),
    businessCategory: z.string(),
    schemaRole: z.string(),
    businessTags: z.array(z.string()),
    isKpiCandidate: z.boolean(),
    isForecastCandidate: z.boolean(),
    confidence: z.number(),
  })).optional(),
  detectedRelationships: z.array(z.object({
    from: z.string(),
    to: z.string(),
    type: z.string(),
    confidence: z.number(),
    rationale: z.string(),
  })).optional(),
  timeIntelligence: z.object({
    primaryDateColumn: z.string(),
    granularity: z.string(),
    hasSeasonalitySignal: z.boolean(),
    dateRangeStart: z.string().optional(),
    dateRangeEnd: z.string().optional(),
    spanDays: z.number().optional(),
  }).optional(),
});

export const generateUnderstanding = createServerFn({ method: "POST" })
  .validator((input: unknown) => UnderstandingInputV2.parse(input))
  .handler(async ({ data }) => {
    const gateway = await getGateway();

    // Build an enriched context block from Phase 1 heuristic engines
    const heuristicContext = data.heuristicDomain ? `
Pre-analysis from heuristic engines (verify and refine, do not blindly accept):
- Heuristic domain: ${data.heuristicDomain} (confidence: ${((data.heuristicConfidence ?? 0) * 100).toFixed(0)}%)
- Domain rationale: ${data.domainRationale ?? "N/A"}
- Business process: ${data.processName ?? "N/A"}
- KPI hints from domain registry: ${(data.kpiHints ?? []).join(", ") || "N/A"}
${data.timeIntelligence ? `- Time intelligence: primary date="${data.timeIntelligence.primaryDateColumn}", granularity=${data.timeIntelligence.granularity}, span=${data.timeIntelligence.spanDays ?? "?"} days, seasonality signal=${data.timeIntelligence.hasSeasonalitySignal}` : ""}
${data.columnIntelligenceSummary && data.columnIntelligenceSummary.length > 0
  ? `\nColumn intelligence pre-analysis:\n${data.columnIntelligenceSummary.map((c) =>
      `  ${c.column}: category=${c.businessCategory}, role=${c.schemaRole}, kpi=${c.isKpiCandidate}, forecast=${c.isForecastCandidate}, tags=[${c.businessTags.slice(0,3).join(",")}]`
    ).join("\n")}`
  : ""}
${data.detectedRelationships && data.detectedRelationships.length > 0
  ? `\nDetected structural relationships (top 8):\n${data.detectedRelationships.slice(0,8).map((r) =>
      `  ${r.from} → ${r.to} (${r.type}, conf=${r.confidence.toFixed(2)})`
    ).join("\n")}`
  : ""}
` : "";

    const { output } = await generateText({
      model: gateway(MODEL),
      system: [
        "You are a Senior Data Scientist and Business Consultant performing deep dataset understanding.",
        "You have been given pre-analysis from heuristic engines (domain inference, column intelligence, relationship discovery).",
        "Your job is to:",
        "  1. VALIDATE or CORRECT the heuristic analysis using the actual sample data.",
        "  2. Infer the BUSINESS MEANING of each column — not just its data type. Think about what it represents in the real world.",
        "  3. Identify what this dataset is used FOR and the BUSINESS PROCESS it captures.",
        "  4. Propose SPECIFIC, MEASURABLE KPIs relevant to this domain — not generic ones.",
        "  5. Discover RELATIONSHIPS between columns (PK/FK, hierarchies, measure-dimension links).",
        "  6. Flag any DATA QUALITY risks or ANALYTICAL RISKS.",
        "Be precise and evidence-driven. Reference specific column names and sample values. Never fabricate. If uncertain, state your confidence explicitly.",
      ].join("\n"),
      prompt: `Dataset: ${data.fileName}
Row count: ${data.rowCount}
Columns: ${data.columns.join(", ")}

Sample rows (first 15, JSON):
${JSON.stringify(data.sampleRows, null, 2)}
${heuristicContext}
${data.notes ? `\nAnalyst notes from the user (treat as guidance, not mandatory):\n${data.notes}\n` : ""}
Produce a comprehensive structured understanding of this dataset. For each column, provide a specific business meaning — not just the data type. For example: "Amount" → "Transaction monetary value in the customer's currency, aggregates to total revenue".
For KPIs, propose metrics that are SPECIFIC to this dataset and domain, not generic ones like 'Average Value'.`,
      output: Output.object({
        schema: z.object({
          domain: z.enum([
            "ecommerce", "retail", "finance", "banking", "healthcare", "education",
            "manufacturing", "logistics", "hr", "marketing", "saas", "operations", "generic",
          ]),
          domainConfidence: z.number().min(0).max(1),
          summary: z.string(),
          purpose: z.string(),
          primaryEntities: z.array(z.string()),
          suggestedKPIs: z.array(z.object({
            name: z.string(),
            rationale: z.string(),
            columns: z.array(z.string()),
          })),
          columnMeanings: z.array(z.object({
            column: z.string(),
            meaning: z.string(),
            role: z.enum(["dimension", "measure", "key", "date", "metadata"]),
          })),
          relationships: z.array(z.object({
            from: z.string(),
            to: z.string(),
            type: z.string(),
            confidence: z.number().min(0).max(1),
          })),
          warnings: z.array(z.string()),
        }),
      }),
    });
    return output;
  });

/* ───────────────────────────── Cleaning Reasoning ─────────────────────────── */

const CleaningInput = z.object({
  domain: z.string(),
  columnSummaries: z.array(z.object({
    column: z.string(),
    inferredType: z.string(),
    nullPct: z.number(),
    uniquePct: z.number(),
    sampleValues: z.array(z.unknown()).max(8),
    outlierPct: z.number().optional(),
    // Phase 1: enriched with column intelligence
    businessCategory: z.string().optional(),
    schemaRole: z.string().optional(),
    isKpiCandidate: z.boolean().optional(),
    possibleCauses: z.array(z.object({
      cause: z.string(),
      plausibility: z.number(),
      evidence: z.string(),
    })).optional(),
  })),
  duplicateRowCount: z.number(),
  rowCount: z.number(),
  processName: z.string().optional(),
  notes: z.string().optional(),
});

export const reasonCleaningIssues = createServerFn({ method: "POST" })
  .validator((input: unknown) => CleaningInput.parse(input))
  .handler(async ({ data }) => {
    const gateway = await getGateway();
    const { output } = await generateText({
      model: gateway(MODEL),
      system: [
        "You are a Senior Data Scientist performing intelligent, context-aware data cleaning.",
        "Core principle: NEVER blindly apply rules. Before recommending any action, ask WHY this issue exists.",
        "For EVERY issue:",
        "  1. State the OBSERVATION (what the data shows).",
        "  2. List POSSIBLE CAUSES with plausibility scores — consider business context, not just statistics.",
        "  3. State your RECOMMENDED ACTION and explain WHY it is the least destructive appropriate action.",
        "  4. Flag issues that require HUMAN REVIEW before any automated action.",
        "Domain context has been pre-analysed and provided. Use it.",
        "Never assume negative values are errors (negative profit = real loss). Never assume outliers are errors (outliers may be your best customers).",
        "When uncertain, always prefer flag_only over drop_column or remove_outliers.",
      ].join("\n"),
      prompt: `Domain: ${data.domain} | Business process: ${data.processName ?? "unknown"}
Rows: ${data.rowCount}; duplicate row count: ${data.duplicateRowCount}

Column summaries with pre-analysed business context:
${JSON.stringify(data.columnSummaries, null, 2)}
${data.notes ? `\nAnalyst notes:\n${data.notes}\n` : ""}

For each data quality issue found, apply the Observation → Possible Causes → Recommended Action chain. Prioritise by business impact. Never recommend dropping a KPI candidate column without very high confidence.`,
      output: Output.object({
        schema: z.object({
          issues: z.array(z.object({
            severity: z.enum(["info", "warning", "critical"]),
            action: z.enum([
              "drop_duplicates", "drop_column", "drop_rows", "fill_missing",
              "convert_type", "strip_whitespace", "standardize_case",
              "remove_outliers", "flag_only", "treat_as_metadata",
            ]),
            title: z.string(),
            description: z.string(),
            reasoning: z.string(),
            confidence: z.number().min(0).max(1),
            affectedColumns: z.array(z.string()).optional(),
            businessImpact: z.string(),
            requiresApproval: z.boolean(),
          })),
          overallNotes: z.string(),
        }),
      }),
    });
    return output;
  });

/* ───────────────────────────── Analytics Reasoning ────────────────────────── */

const AnalyticsInput = z.object({
  domain: z.string(),
  understanding: z.string(),
  kpis: z.array(z.object({ label: z.string(), value: z.string() })),
  topFindings: z.array(z.string()),
  correlations: z.array(z.object({ a: z.string(), b: z.string(), r: z.number() })),
  trendSummaries: z.array(z.string()).optional(),
  notes: z.string().optional(),
  // Phase 1: enriched analytics context
  processName: z.string().optional(),
  primaryEntities: z.array(z.string()).optional(),
  measuresContext: z.array(z.object({
    column: z.string(),
    aggregation: z.string(),
    businessMeaning: z.string(),
  })).optional(),
  dimensionsContext: z.array(z.object({
    column: z.string(),
    cardinality: z.string(),
    businessMeaning: z.string(),
    hierarchy: z.array(z.string()).optional(),
  })).optional(),
  timeContext: z.object({
    primaryDateColumn: z.string(),
    granularity: z.string(),
    hasSeasonalitySignal: z.boolean(),
    spanDays: z.number().optional(),
  }).optional(),
  suggestedKPIs: z.array(z.object({ name: z.string(), rationale: z.string() })).optional(),
  // Phase 2: Advanced Analytical Intelligence context
  timeSeriesNarratives: z.array(z.string()).optional(),
  rootCauseSummaries: z.array(z.string()).optional(),
  distributionInsights: z.array(z.object({
    column: z.string(),
    shape: z.string(),
    explanation: z.string(),
    anomalyCount: z.number(),
    cv: z.number(),
  })).optional(),
  statisticalTestResults: z.array(z.object({
    testName: z.string(),
    isSignificant: z.boolean(),
    interpretation: z.string(),
    businessImplication: z.string(),
  })).optional(),
  forecastSummaries: z.array(z.object({
    column: z.string(),
    method: z.string(),
    trend: z.string(),
    totalGrowthPct: z.number(),
    confidence: z.number(),
    nextPeriods: z.array(z.object({ period: z.string(), predicted: z.number() })),
  })).optional(),
});

export const reasonAnalytics = createServerFn({ method: "POST" })
  .validator((input: unknown) => AnalyticsInput.parse(input))
  .handler(async ({ data }) => {
    const gateway = await getGateway();

    // Build enriched context string from Phase 1 intelligence
    const enrichedContext = [
      data.processName ? `Business process: ${data.processName}` : "",
      data.primaryEntities?.length ? `Primary entities: ${data.primaryEntities.join(", ")}` : "",
      data.timeContext
        ? `Time context: primary date="${data.timeContext.primaryDateColumn}", granularity=${data.timeContext.granularity}, span=${data.timeContext.spanDays ?? "?"} days, seasonality=${data.timeContext.hasSeasonalitySignal}` : "",
      data.measuresContext?.length
        ? `Measures (fact columns):\n${data.measuresContext.map((m) => `  - ${m.column} (${m.aggregation}): ${m.businessMeaning}`).join("\n")}` : "",
      data.dimensionsContext?.length
        ? `Dimensions:\n${data.dimensionsContext.map((d) => `  - ${d.column} (${d.cardinality} cardinality)${d.hierarchy ? ` → hierarchy: ${d.hierarchy.join(" > ")}` : ""}: ${d.businessMeaning}`).join("\n")}` : "",
      data.suggestedKPIs?.length
        ? `Suggested domain KPIs: ${data.suggestedKPIs.map((k) => k.name).join(", ")}` : "",
      // Phase 2: Advanced analytical intelligence
      data.timeSeriesNarratives?.length
        ? `Time-series narratives (pre-computed):\n${data.timeSeriesNarratives.map((n) => `  - ${n}`).join("\n")}` : "",
      data.rootCauseSummaries?.length
        ? `Root cause analysis results:\n${data.rootCauseSummaries.map((r) => `  - ${r}`).join("\n")}` : "",
      data.distributionInsights?.length
        ? `Distribution intelligence:\n${data.distributionInsights.map((d) =>
            `  - ${d.column}: ${d.shape} distribution, ${d.anomalyCount} anomalies, CV=${(d.cv * 100).toFixed(1)}%`
          ).join("\n")}` : "",
      data.statisticalTestResults?.filter((t) => t.isSignificant).length
        ? `Significant statistical tests:\n${data.statisticalTestResults!.filter((t) => t.isSignificant).map((t) =>
            `  - ${t.testName}: ${t.interpretation}`
          ).join("\n")}` : "",
      data.forecastSummaries?.length
        ? `Forecast intelligence (statistical models):\n${data.forecastSummaries.map((f) =>
            `  - ${f.column}: ${f.trend} trend, ${f.totalGrowthPct.toFixed(1)}% total growth, model=${f.method}, next periods=[${f.nextPeriods.map((p) => `${p.period}:${p.predicted.toFixed(0)}`).join(", ")}]`
          ).join("\n")}` : "",
    ].filter(Boolean).join("\n");

    const { output } = await generateText({
      model: gateway(MODEL),
      system:
        [
          "You are a Senior Data Scientist and Business Consultant. You DO NOT generate reports — you reason.",
          "You have been given pre-computed statistical analysis: distribution shapes, time-series trends, root cause findings, and forecasts. Use them as YOUR evidence base. Do not ignore them.",
          "For EVERY important insight (descriptive, diagnostic, predictive, prescriptive) you MUST follow this exact chain:",
          "  1. OBSERVATION — a single, falsifiable factual statement from the dataset (e.g. 'November had 38% higher sales than the 11-month average').",
          "  2. HYPOTHESES — propose AT LEAST 2 and ideally 3-4 competing explanations. Include obvious causes AND non-obvious ones (seasonality, promotion, pricing, channel mix, data artifact, survivorship bias, external shock).",
          "  3. EVIDENCE — for EACH hypothesis collect BOTH supportingEvidence AND opposingEvidence from the dataset (KPIs, correlations, trends, segment splits, statistical tests). Tag each piece as 'dataset' (in the data), 'external' (general business knowledge — clearly flagged), or 'inference' (derived).",
          "  4. VERDICT — mark each hypothesis 'supported', 'rejected', or 'inconclusive', with a one-sentence rationale. REJECT hypotheses that the evidence contradicts.",
          "  5. RANK the surviving hypotheses by confidence (rank=1 is the leading cause).",
          "  6. CONCLUSION — synthesize the leading cause(s) into a clear conclusion with an overall confidence.",
          "  7. RECOMMENDATION — for prescriptive insights, be EXECUTIVE-GRADE: include expected impact, effort level (low/medium/high), priority (critical/high/medium/low), risk of inaction, success metric, and time horizon. Cite specific dataset evidence. No generic advice.",
          "Hard rules: Never state a conclusion without showing rejected alternatives. Never invent numbers. If the dataset is insufficient, say so in 'limitations' and lower the confidence. Predictive insights must reference the pre-computed forecast data and list assumptions explicitly.",
        ].join("\n"),
      prompt: `Domain: ${data.domain}
Dataset understanding: ${data.understanding}
${enrichedContext ? `\nAnalytical intelligence (pre-computed by statistical and time-series engines):\n${enrichedContext}\n` : ""}
KPIs: ${JSON.stringify(data.kpis)}
Top findings: ${JSON.stringify(data.topFindings)}
Correlations: ${JSON.stringify(data.correlations)}
${data.trendSummaries ? `Trends: ${JSON.stringify(data.trendSummaries)}\n` : ""}${data.notes ? `Analyst notes: ${data.notes}\n` : ""}

Generate insights at all 4 levels using the Observation → Hypotheses → Evidence → Verdict → Rank → Conclusion → Recommendation chain.

For PRESCRIPTIVE insights specifically: produce executive-consultant-level recommendations. Reference the forecast data, root cause findings, and statistical tests. Each recommendation must have a specific expected impact, effort, priority, risk of inaction, and success metric.

For PREDICTIVE insights: use the pre-computed forecast summaries as your primary evidence. State confidence intervals and assumptions explicitly. Do not forecast without the statistical model results as backing evidence.`,
      output: Output.object({
        schema: z.object({
          executiveSummary: z.string(),
          businessHealthScore: z.number().min(0).max(100),
          descriptive: z.array(insightSchema()).max(4),
          diagnostic: z.array(insightSchema()).max(4),
          predictive: z.array(insightSchema()).max(3),
          prescriptive: z.array(insightSchema()).max(4),
        }),
      }),
    });
    return output;
  });

function insightSchema() {
  const evidence = z.object({
    type: z.enum(["dataset", "external", "inference"]),
    description: z.string(),
    weight: z.number().min(0).max(1),
  });
  const hypothesis = z.object({
    statement: z.string(),
    supportingEvidence: z.array(evidence),
    opposingEvidence: z.array(evidence),
    verdict: z.enum(["supported", "rejected", "inconclusive"]),
    rationale: z.string(),
    confidence: z.number().min(0).max(1),
    rank: z.number().int().min(0).optional(),
  });
  return z.object({
    title: z.string(),
    observation: z.string(),
    summary: z.string(),
    reasoning: z.string(),
    hypotheses: z.array(hypothesis).min(2),
    evidence: z.array(evidence),
    confidence: z.number().min(0).max(1),
    conclusion: z.string(),
    recommendation: z.string(),
    assumptions: z.array(z.string()).optional(),
    limitations: z.array(z.string()).optional(),
    relatedColumns: z.array(z.string()).optional(),
  });
}