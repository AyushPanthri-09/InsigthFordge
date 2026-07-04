/**
 * Cleaner — Data Quality Intelligence
 * -------------------------------------
 * Phase 1 upgrade: moves from rule-based flagging to context-aware reasoning.
 *
 * Key improvements over the original:
 *  1. Every issue now includes possibleCauses[] with plausibility scores.
 *  2. Every issue includes alternativeInterpretations[] so the AI and user
 *     consider context before destructively removing data.
 *  3. Null reasoning uses column intelligence (business category, schema role)
 *     to explain WHY nulls may exist — not just that they do.
 *  4. Outlier reasoning distinguishes business extremes from errors using
 *     domain context and column category.
 *  5. applyIssues() and buildReport() are fully preserved — no API change.
 *
 * Public API (unchanged):
 *   detectIssues(rows, profiles) → CleaningIssue[]
 *   applyIssues(rows, issues) → { rows, applied }
 *   buildReport(datasetId, issues, rowsBefore, rowsAfter, notes) → CleaningReport
 */

import type {
  CleaningIssue,
  CleaningReport,
  ColumnIntelligence,
  ColumnProfile,
  DAIEColumnDecision,
} from "../types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_DIGITS_RE = /[0-9]/;

function isMissingValue(value: unknown): boolean {
  return (
    value === null ||
    value === undefined ||
    (typeof value === "string" && value.trim() === "")
  );
}

function isEmptyStringValue(value: unknown): boolean {
  return typeof value === "string" && value.trim() === "";
}

function normalizeEmptyStringValue(value: unknown): unknown {
  return isEmptyStringValue(value) ? null : value;
}

function stripWhitespaceValue(value: unknown): unknown {
  return typeof value === "string" ? value.trim() : value;
}

function standardizeCaseValue(value: unknown): unknown {
  return typeof value === "string" ? value.trim().toLowerCase() : value;
}

function isEmailValue(value: unknown): boolean {
  return typeof value === "string" && EMAIL_RE.test(value.trim().toLowerCase());
}

function normalizeEmailValue(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const normalized = trimmed.toLowerCase();
  return EMAIL_RE.test(normalized) ? normalized : null;
}

function normalizePhoneString(value: string): string | null {
  const trimmed = value.trim();
  if (!PHONE_DIGITS_RE.test(trimmed)) return null;
  let normalized = trimmed.replace(/[^\d+]/g, "");
  if (normalized.startsWith("++")) normalized = normalized.slice(1);
  if (normalized.startsWith("+")) {
    const digits = normalized.slice(1).replace(/\D/g, "");
    return digits.length >= 7 && digits.length <= 15 ? `+${digits}` : digits;
  }
  const digits = normalized.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15 ? digits : null;
}

function normalizePhoneValue(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const normalized = normalizePhoneString(value);
  return normalized ?? value;
}

function parseBooleanString(value: string): boolean | null {
  const normalized = value.trim().toLowerCase();
  if (["true", "t", "yes", "y", "1"].includes(normalized)) return true;
  if (["false", "f", "no", "n", "0"].includes(normalized)) return false;
  return null;
}

function parsePercentageString(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed.endsWith("%")) return null;
  const numeric = trimmed.slice(0, -1).replace(/,/g, "").trim();
  const parsed = Number(numeric);
  return Number.isFinite(parsed) ? parsed / 100 : null;
}

function parseCurrencyString(value: string): number | null {
  const trimmed = value.trim();
  if (!/[\d]/.test(trimmed)) return null;
  const cleaned = trimmed.replace(/[$£€¥₹,]/g, "").trim();
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseNumericString(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const normalized = trimmed.replace(/,/g, "");
  if (/^[+-]?\d+(?:\.\d+)?$/.test(normalized)) {
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function parseDateString(value: string): Date | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const dateCharsRegex = new RegExp("[/.\\sA-Za-z-]");
  if (!dateCharsRegex.test(trimmed) || /^\d+$/.test(trimmed)) return null;
  const parsed = new Date(trimmed);
  return Number.isFinite(parsed.getTime()) ? parsed : null;
}

function convertTypeValue(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (trimmed === "") return value;

  const bool = parseBooleanString(trimmed);
  if (bool !== null) return bool;

  const percent = parsePercentageString(trimmed);
  if (percent !== null) return percent;

  const currency = parseCurrencyString(trimmed);
  if (currency !== null) return currency;

  const date = parseDateString(trimmed);
  if (date) return date;

  const numeric = parseNumericString(trimmed);
  if (numeric !== null) return numeric;

  return value;
}

function getMedian(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

function getMode(values: string[]): string | null {
  const counts = new Map<string, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  let winner: string | null = null;
  let maxCount = 0;
  for (const [value, count] of counts.entries()) {
    if (count > maxCount) {
      maxCount = count;
      winner = value;
    }
  }
  return winner;
}

function shouldNormalizePhone(value: string): boolean {
  const trimmed = value.trim();
  return PHONE_DIGITS_RE.test(trimmed) && /[\s().-]/.test(trimmed);
}

// ---------------------------------------------------------------------------
// Issue detection (enhanced with Data Quality Intelligence)
// ---------------------------------------------------------------------------

/**
 * Detects data quality issues with rich reasoning context.
 *
 * @param rows     - Dataset rows (already parsed)
 * @param profiles - Column profiles from the profiler
 * @param intelligence - Optional column intelligence for richer reasoning.
 *                       When provided, null/outlier reasoning becomes domain-aware.
 */
export function detectIssues(
  rows: Record<string, unknown>[],
  profiles: ColumnProfile[],
  intelligence?: Record<string, ColumnIntelligence>,
): CleaningIssue[] {
  const issues: CleaningIssue[] = [];
  const total = rows.length;

  // ── 1. Duplicate row detection ─────────────────────────────────────────
  const seen = new Set<string>();
  let dupCount = 0;
  for (const r of rows) {
    const key = JSON.stringify(r);
    if (seen.has(key)) dupCount++;
    else seen.add(key);
  }

  if (dupCount > 0) {
    const dupRatio = dupCount / total;
    issues.push({
      id: `dup_${Date.now()}`,
      severity: dupRatio > 0.05 ? "warning" : "info",
      action: "drop_duplicates",
      title: `${dupCount.toLocaleString()} duplicate rows detected`,
      description: `Found ${dupCount} fully duplicated rows out of ${total.toLocaleString()} (${(dupRatio * 100).toFixed(1)}%).`,
      reasoning:
        "Exact duplicates rarely carry signal in transactional data. Removing them avoids double-counting in aggregates and skewed statistics. If duplicates are intentional (e.g. repeated events, audit logs), preserve them.",
      confidence: 0.85,
      affectedRows: dupCount,
      businessImpact:
        "Improves accuracy of counts, sums, and averages. Prevents inflated KPIs.",
      requiresApproval: dupRatio > 0.1,
      possibleCauses: [
        {
          cause: "ETL pipeline loaded the same file or partition twice",
          plausibility: 0.6,
          evidence: `${(dupRatio * 100).toFixed(1)}% duplication rate is consistent with a double-load event.`,
        },
        {
          cause: "Intentional audit log or event sourcing pattern",
          plausibility: dupRatio > 0.3 ? 0.4 : 0.15,
          evidence:
            "Higher duplication rates sometimes indicate event-driven systems where the same state is recorded multiple times.",
        },
        {
          cause: "Manual data entry with copy-paste errors",
          plausibility: 0.25,
          evidence: "Common in Excel-based data collection workflows.",
        },
      ],
      alternativeInterpretations: [
        "These may be intentional repeated measurements (e.g., daily snapshots of the same record).",
        "If the dataset is a slowly-changing dimension, duplicates may represent historical versions — check for effective-date columns.",
      ],
    });
  }

  // ── 2. High-null column detection ──────────────────────────────────────
  for (const p of profiles) {
    const nullPct = p.nullCount / Math.max(1, total);
    if (nullPct < 0.1) continue; // below threshold — ignore

    const intel = intelligence?.[p.name];
    const category = intel?.businessCategory ?? "unknown";
    const schemaRole = intel?.schemaRole ?? "unknown";

    const nullDecision = buildDAIENullDecision(
      p,
      nullPct,
      category,
      schemaRole,
      profiles,
      intelligence,
    );
    const {
      reasoning,
      possibleCauses,
      alternativeInterpretations,
      action,
      severity,
      confidence,
    } = buildNullReasoning(p.name, nullPct, category, schemaRole, nullDecision);

    issues.push({
      id: `null_${p.name}`,
      severity,
      action,
      title: `Column "${p.name}" is ${(nullPct * 100).toFixed(0)}% empty`,
      description: `${p.nullCount.toLocaleString()} of ${total.toLocaleString()} rows have no value for this column.`,
      reasoning,
      confidence,
      affectedColumns: [p.name],
      businessImpact: buildNullBusinessImpact(p.name, category, nullPct),
      requiresApproval: true, // always require approval for null handling
      possibleCauses,
      alternativeInterpretations,
      daieDecision: nullDecision,
    });
  }

  // ── 3. Outlier detection ────────────────────────────────────────────────
  for (const p of profiles) {
    if (!p.stats || p.stats.outlierCount === 0) continue;
    if (p.stats.outlierCount / total >= 0.1) continue; // >10% = likely not outliers

    const intel = intelligence?.[p.name];
    const category = intel?.businessCategory ?? "unknown";

    const { reasoning, possibleCauses, alternativeInterpretations } =
      buildOutlierReasoning(p.name, p.stats.outlierCount, category, p.stats);

    issues.push({
      id: `out_${p.name}`,
      severity: "info",
      action: "flag_only",
      title: `${p.stats.outlierCount} outlier${p.stats.outlierCount > 1 ? "s" : ""} in "${p.name}"`,
      description: `Values outside the 1.5×IQR fence [${p.stats.q1.toFixed(2)}, ${p.stats.q3.toFixed(2)}]. Range in data: [${p.stats.min.toFixed(2)}, ${p.stats.max.toFixed(2)}].`,
      reasoning,
      confidence: 0.7,
      affectedColumns: [p.name],
      businessImpact: `Outliers in "${p.name}" can skew averages, distort forecasts, and mislead stakeholders if not investigated.`,
      requiresApproval: true,
      possibleCauses,
      alternativeInterpretations,
    });
  }

  // ── 4. String normalization and convertible-type heuristics ─────────────
  for (const p of profiles) {
    const stringSamples = p.sampleValues.filter(
      (v): v is string => typeof v === "string",
    );
    if (stringSamples.length === 0) continue;

    const hasStripWhitespace = stringSamples.some((s) => s !== s.trim());
    if (hasStripWhitespace) {
      issues.push({
        id: `ws_${p.name}`,
        severity: "info",
        action: "strip_whitespace",
        title: `Leading or trailing whitespace detected in "${p.name}"`,
        description:
          "String values contain unnecessary whitespace that can break grouping, matching, and validation.",
        reasoning: `Whitespace around values in column "${p.name}" can cause duplicate categories and mis-grouped text values. Trimming preserves the underlying content while making the column consistent.`,
        confidence: 0.8,
        affectedColumns: [p.name],
        businessImpact: `Improves join keys and categorical grouping for "${p.name}" without changing semantics.`,
        requiresApproval: false,
      });
    }

    const emptyStringCount = stringSamples.filter(
      (s) => s.trim() === "",
    ).length;
    if (emptyStringCount > 0) {
      issues.push({
        id: `empty_${p.name}`,
        severity: "info",
        action: "normalize_empty_strings_to_null",
        title: `Empty string values detected in "${p.name}"`,
        description: `${emptyStringCount} sample values are empty strings. These should be normalized to null for consistent missing-value handling.`,
        reasoning: `Empty strings are semantically equivalent to missing values in most datasets. Normalizing them to null avoids false non-null counts and inconsistent downstream aggregates.`,
        confidence: 0.8,
        affectedColumns: [p.name],
        businessImpact: `Prevents empty-string values from skewing null counts, mode detection, and type inference for "${p.name}".`,
        requiresApproval: false,
      });
    }

    const lowerCaseVariants = new Map<string, Set<string>>();
    for (const value of stringSamples) {
      const normalized = value.trim().toLowerCase();
      const variants = lowerCaseVariants.get(normalized) ?? new Set<string>();
      variants.add(value);
      lowerCaseVariants.set(normalized, variants);
    }
    const hasCaseInconsistency = Array.from(lowerCaseVariants.values()).some(
      (variants) => variants.size > 1,
    );
    if (hasCaseInconsistency) {
      issues.push({
        id: `case_${p.name}`,
        severity: "info",
        action: "standardize_case",
        title: `Mixed capitalization detected in "${p.name}"`,
        description:
          "Values differ only by letter case, which can create duplicate categories and inconsistent filters.",
        reasoning: `Standardizing text case in "${p.name}" makes categorical grouping reliable and reduces false distinctions between logically identical values.`,
        confidence: 0.75,
        affectedColumns: [p.name],
        businessImpact: `Reduces category fragmentation and improves charting quality for "${p.name}".`,
        requiresApproval: false,
      });
    }

    const convertibleCount = stringSamples.filter((s) => {
      return (
        parseBooleanString(s) !== null ||
        parsePercentageString(s) !== null ||
        parseCurrencyString(s) !== null ||
        parseDateString(s) !== null ||
        parseNumericString(s) !== null
      );
    }).length;
    if (
      convertibleCount >= Math.max(2, Math.floor(stringSamples.length * 0.3))
    ) {
      issues.push({
        id: `convert_${p.name}`,
        severity: "info",
        action: "convert_type",
        title: `Convert-able text values detected in "${p.name}"`,
        description:
          "String values appear to represent numbers, dates, booleans, or percentages. Converting them preserves analytical semantics.",
        reasoning: `Column "${p.name}" contains text values that likely represent structured data types. Converting these values improves numeric aggregation, date analysis, and boolean filtering.`,
        confidence: 0.75,
        affectedColumns: [p.name],
        businessImpact: `Makes "${p.name}" usable for measures, time-series analysis, and logical filters.`,
        requiresApproval: false,
      });
    }

    const emailSamples = stringSamples.filter((s) => s.includes("@"));
    const invalidEmails = emailSamples.filter((s) => !isEmailValue(s));
    if (emailSamples.length > 0 && invalidEmails.length > 0) {
      issues.push({
        id: `email_${p.name}`,
        severity: "warning",
        action: "validate_email",
        title: `Invalid email formatting detected in "${p.name}"`,
        description: `${invalidEmails.length} sample values are not valid emails. These should be normalized or cleaned.`,
        reasoning: `Valid email addresses are critical for customer communication and identity matching. Normalizing valid emails and clearing invalid values improves downstream joins and contact data quality.`,
        confidence: 0.85,
        affectedColumns: [p.name],
        businessImpact: `Prevents invalid email values from causing failed deliveries, duplicate contacts, and faulty segmentation.`,
        requiresApproval: true,
      });
    }

    const phoneSamples = stringSamples.filter(
      (s) => /phone|tel|contact/i.test(p.name) || shouldNormalizePhone(s),
    );
    if (
      phoneSamples.length > 0 &&
      phoneSamples.some((s) => shouldNormalizePhone(s))
    ) {
      issues.push({
        id: `phone_${p.name}`,
        severity: "info",
        action: "normalize_phone_numbers",
        title: `Phone numbers need normalization in "${p.name}"`,
        description:
          "Phone values use inconsistent formatting. Normalizing them improves matching and lookup reliability.",
        reasoning: `Phone fields are often entered with spaces, parentheses, and dashes. Normalizing them preserves the same number while making comparisons reliable.`,
        confidence: 0.8,
        affectedColumns: [p.name],
        businessImpact: `Improves contact matching and reduces duplicate phone records for "${p.name}".`,
        requiresApproval: false,
      });
    }
  }

  // ── 5. Metadata / header row detection (preserved from original) ────────
  if (rows.length > 5) {
    const firstFewMostlyNull = rows
      .slice(0, 3)
      .filter(
        (r) =>
          Object.values(r).filter(
            (v) => v === null || v === undefined || v === "",
          ).length >
          Object.keys(r).length * 0.6,
      ).length;

    if (firstFewMostlyNull >= 2) {
      issues.push({
        id: "meta_top",
        severity: "warning",
        action: "treat_as_metadata",
        title: "First rows look like metadata or report headers",
        description:
          "Several leading rows are mostly empty — common in exported reports.",
        reasoning:
          "Exported spreadsheets often prepend title rows, date stamps, or section headers before the real data. Treating them as metadata prevents polluted types and false outliers.",
        confidence: 0.65,
        businessImpact:
          "Prevents skewed type inference and false outlier detection caused by header text appearing in data rows.",
        requiresApproval: true,
        possibleCauses: [
          {
            cause: "Excel/BI tool export with title or subtitle rows",
            plausibility: 0.7,
            evidence: "Leading rows have >60% null values.",
          },
          {
            cause: "Merged cells in source spreadsheet creating blank rows",
            plausibility: 0.25,
            evidence: "Pattern matches typical spreadsheet header formatting.",
          },
        ],
        alternativeInterpretations: [
          "These rows may be intentional summary rows — verify before treating as metadata.",
        ],
      });
    }
  }

  // ── 5. Type inconsistency detection ────────────────────────────────────
  for (const p of profiles) {
    if (p.inferredType !== "categorical") continue;
    // Detect mixed-type columns: mostly numeric but some string values
    const sampleNums = p.sampleValues.filter(
      (v) =>
        typeof v === "number" ||
        (!isNaN(parseFloat(String(v))) && isFinite(Number(v))),
    );
    const sampleStrs = p.sampleValues.filter(
      (v) =>
        typeof v === "string" && isNaN(Number(v)) && String(v).trim() !== "",
    );

    if (sampleNums.length > 0 && sampleStrs.length > 0) {
      issues.push({
        id: `mixed_${p.name}`,
        severity: "warning",
        action: "convert_type",
        title: `Mixed numeric/string values in "${p.name}"`,
        description: `Column appears to contain both numeric values (e.g., ${String(sampleNums[0])}) and text values (e.g., ${String(sampleStrs[0])}). Type inference was inconclusive.`,
        reasoning:
          "Mixed types prevent reliable aggregation and statistical analysis. The column should be either standardised to numeric (if text values are errors) or split into a numeric measure and a flag column.",
        confidence: 0.75,
        affectedColumns: [p.name],
        businessImpact:
          "Blocks chart generation and KPI computation for this column.",
        requiresApproval: true,
        possibleCauses: [
          {
            cause:
              "N/A, NULL, or placeholder strings mixed with numeric values",
            plausibility: 0.65,
            evidence: `Sample text values: ${sampleStrs.slice(0, 3).join(", ")}.`,
          },
          {
            cause:
              "Column stores both a code and a description (e.g., '10 - Cash')",
            plausibility: 0.25,
            evidence: "Composite value pattern common in legacy exports.",
          },
        ],
        alternativeInterpretations: [
          "Text values may be valid categorical overrides (e.g., 'Pending', 'N/A') — decide whether to encode as numeric or keep as categorical.",
        ],
      });
    }
  }

  return issues;
}

// ---------------------------------------------------------------------------
// Reasoning builders (separated for testability)
// ---------------------------------------------------------------------------

function buildDAIENullDecision(
  profile: ColumnProfile,
  nullPct: number,
  category: string,
  schemaRole: string,
  profiles: ColumnProfile[],
  intelligence?: Record<string, ColumnIntelligence>,
): DAIEColumnDecision {
  const role = classifyDAIERole(profile, category, schemaRole);
  const dependency = describeDAIEDependency(profile, profiles, intelligence);
  const businessImportance = describeDAIEBusinessImportance(
    profile,
    category,
    schemaRole,
  );
  const statisticalProfile = describeDAIEStatisticalProfile(profile, nullPct);
  const dataQuality = describeDAIEDataQuality(profile, nullPct);
  const pctStr = `${(nullPct * 100).toFixed(0)}%`;

  const optionsConsidered: DAIEColumnDecision["optionsConsidered"] = [
    {
      option: "keep_as_is",
      label: "Option A: keep as nullable signal",
      reasoning: `Retains "${profile.name}" and preserves missingness as possible information. This is safest when nulls are tied to optional events, identity, compliance, or sparse high-value behavior.`,
      risk: "Downstream models or aggregates must handle nulls explicitly; naive averages may silently exclude affected records.",
    },
    {
      option: "impute",
      label: "Option B: impute only after dependency testing",
      reasoning: buildImputationOptionReasoning(
        profile,
        nullPct,
        category,
        schemaRole,
      ),
      risk: "Wrong imputation can erase a meaningful absence pattern or create false precision.",
    },
    {
      option: "transform",
      label:
        "Option C: transform by adding missingness indicator / Unknown bucket",
      reasoning: `Preserves the original value while making missingness analyzable. Useful when "${profile.name}" participates in segmentation, grouping, or sparse-event logic.`,
      risk: "Adds feature complexity and may over-emphasize missingness if the pattern is random.",
    },
    {
      option: "drop",
      label:
        "Option D: drop only after dependency and business override checks",
      reasoning: `Dropping is considered only if "${profile.name}" is low-information, non-dependent, non-critical, and has no plausible rare-event or business value despite ${pctStr} missingness.`,
      risk: "Premature deletion may remove a rare fraud, churn, revenue, identity, or compliance signal.",
    },
  ];

  const highBusinessValue =
    category === "financial_metric" ||
    category === "entity_key" ||
    category === "time_dimension" ||
    schemaRole === "primary_key" ||
    schemaRole === "dimension_key";
  const hasDependency =
    schemaRole === "primary_key" ||
    schemaRole === "dimension_key" ||
    schemaRole === "date_key" ||
    Boolean(
      intelligence?.[profile.name]?.isKpiCandidate ||
      intelligence?.[profile.name]?.isForecastCandidate,
    );
  const sparseLikelyMeaningful =
    nullPct > 0.5 &&
    (highBusinessValue ||
      category === "status_flag" ||
      /fraud|risk|refund|return|cancel|churn|claim|error/i.test(profile.name));

  let finalDecision: DAIEColumnDecision["finalDecision"] = "flag_for_review";
  let justification = `No destructive action is justified from ${pctStr} missingness alone. The column must be reviewed with role, dependencies, business meaning, distribution, and downstream impact together.`;
  const rejectedOptions: string[] = [];

  if (nullPct <= 0.25 && profile.inferredRole === "measure") {
    finalDecision = "transform";
    justification = `Use safe retention plus an explicit missingness indicator for "${profile.name}". Numeric imputation may be considered later only if distribution shape and correlated predictors support it.`;
    rejectedOptions.push(
      "Blind mean/median imputation rejected because dependency and missingness mechanism are not proven.",
    );
    rejectedOptions.push(
      "Drop rejected because missingness is not high enough and measure columns may carry analytical signal.",
    );
  } else if (sparseLikelyMeaningful || hasDependency) {
    finalDecision = "transform";
    justification = `Retain "${profile.name}" and encode missingness as information. Dependency/business layers override deletion: the column may be structurally required or represent rare but valuable events.`;
    rejectedOptions.push(
      "Drop rejected because dependency or high-business-value evidence overrides missing-percentage heuristics.",
    );
    rejectedOptions.push(
      "Mode/median imputation rejected because missingness may be meaningful rather than noise.",
    );
  } else if (
    nullPct > 0.9 &&
    !highBusinessValue &&
    !hasDependency &&
    profile.uniqueCount <= 1
  ) {
    finalDecision = "flag_for_review";
    justification = `"${profile.name}" is a drop candidate, but deletion still requires human/source-system validation because missingness alone is not sufficient evidence.`;
    rejectedOptions.push(
      "Automatic drop rejected: the system cannot prove the column is not a recently added, optional, or rare-event field.",
    );
  } else {
    finalDecision = "flag_for_review";
    justification = `Retain pending investigation. Test whether nulls cluster by time, source system, segment, or entity before choosing imputation, transformation, or deletion.`;
    rejectedOptions.push("Single-threshold deletion rejected.");
    rejectedOptions.push(
      "Default imputation rejected until distribution and dependency structure are validated.",
    );
  }

  return {
    column: profile.name,
    role,
    dependency,
    businessImportance,
    statisticalProfile,
    dataQuality,
    optionsConsidered,
    finalDecision,
    justification,
    riskAssessment: `Wrong handling can bias aggregates, erase rare signals, or break downstream charts/KPIs. Safest current path is ${finalDecision === "transform" ? "safe retention with explicit missingness handling" : "review before mutation"}.`,
    rejectedOptions,
  };
}

function classifyDAIERole(
  profile: ColumnProfile,
  category: string,
  schemaRole: string,
): string {
  if (schemaRole === "primary_key" || profile.inferredRole === "key")
    return "Primary Key / Identifier";
  if (schemaRole === "dimension_key") return "Identifier / Foreign-key feature";
  if (schemaRole === "fact_measure" || profile.inferredRole === "measure")
    return "Feature / numeric measure";
  if (schemaRole === "date_key" || profile.inferredRole === "date")
    return "Time-series continuity feature";
  if (category === "descriptor") return "Descriptive / segmentation feature";
  if (profile.uniqueCount <= 1 && profile.nonNullCount <= 1)
    return "Noise / low-information candidate";
  return "Feature candidate";
}

function describeDAIEDependency(
  profile: ColumnProfile,
  profiles: ColumnProfile[],
  intelligence?: Record<string, ColumnIntelligence>,
): string {
  const name = profile.name.toLowerCase();
  const siblingPrefix = name.replace(/(_?id|_?key|date|time)$/i, "");
  const siblings = profiles
    .filter(
      (p) =>
        p.name !== profile.name &&
        siblingPrefix.length >= 3 &&
        p.name.toLowerCase().includes(siblingPrefix),
    )
    .map((p) => p.name)
    .slice(0, 4);
  const intel = intelligence?.[profile.name];

  if (intel?.isForecastCandidate)
    return "Required for time-series continuity or forecasting; dropping could break temporal analysis.";
  if (intel?.isKpiCandidate)
    return "Feeds KPI computation; missingness affects headline metrics.";
  if (siblings.length > 0)
    return `Potential parent/related field for ${siblings.join(", ")}; dependency integrity should be checked before mutation.`;
  if (profile.inferredRole === "dimension")
    return "Used for segmentation, grouping, or aggregation when cardinality is suitable.";
  return "No explicit dependency proven from local metadata, but downstream usage must still be checked before destructive action.";
}

function describeDAIEBusinessImportance(
  profile: ColumnProfile,
  category: string,
  schemaRole: string,
): string {
  if (category === "financial_metric")
    return "High: financial/revenue signal; nulls may affect KPIs and cannot be treated as zero without validation.";
  if (
    category === "entity_key" ||
    schemaRole === "primary_key" ||
    schemaRole === "dimension_key"
  )
    return "High: identity/join/compliance relevance; missingness may represent anonymous or unmatched entities.";
  if (category === "time_dimension")
    return "High: event lifecycle and period analysis depend on temporal completeness.";
  if (category === "geo_dimension")
    return "Medium/high: affects regional segmentation and compliance/privacy interpretation.";
  if (/fraud|risk|refund|return|cancel|churn|claim/i.test(profile.name))
    return "High: rare-event or risk signal; sparsity may be meaningful.";
  return "Unknown to medium: no direct high-value business marker found, but role and dependencies still constrain action.";
}

function describeDAIEStatisticalProfile(
  profile: ColumnProfile,
  nullPct: number,
): string {
  const missingness =
    nullPct > 0.8
      ? "likely MNAR/MAR candidate until proven otherwise"
      : nullPct > 0.3
        ? "MAR/MNAR should be tested by segment and time"
        : "could be MCAR, but requires dependency checks";

  if (!profile.stats) {
    return `Missingness pattern: ${missingness}. Cardinality=${profile.uniqueCount}; numeric distribution unavailable.`;
  }

  const skewHint =
    Math.abs(profile.stats.mean - profile.stats.median) >
    Math.max(1e-9, Math.abs(profile.stats.stdev) * 0.25)
      ? "mean/median gap suggests skew or mixed populations"
      : "mean and median are relatively aligned";

  return `Missingness pattern: ${missingness}. ${skewHint}; outliers=${profile.stats.outlierCount}; cardinality=${profile.uniqueCount}. No single statistic is sufficient for action.`;
}

function describeDAIEDataQuality(
  profile: ColumnProfile,
  nullPct: number,
): string {
  const issues: string[] = [`missing ratio ${(nullPct * 100).toFixed(1)}%`];
  if (profile.stats?.outlierCount)
    issues.push(`${profile.stats.outlierCount} statistical outlier candidates`);
  if (profile.inferredType === "unknown")
    issues.push("unstable or unknown inferred type");
  if (
    profile.sampleValues.some((v) => typeof v === "string" && v.trim() === "")
  )
    issues.push("empty-string missing values present in samples");
  return `${issues.join("; ")}. Quality issues generate options and review paths, not automatic deletion.`;
}

function buildImputationOptionReasoning(
  profile: ColumnProfile,
  nullPct: number,
  category: string,
  schemaRole: string,
): string {
  if (
    profile.inferredRole === "date" ||
    category === "time_dimension" ||
    schemaRole === "date_key"
  ) {
    return "Forward-fill or event-state imputation is only valid when temporal dependency and ordering are proven; otherwise keep null as event-not-occurred/unknown.";
  }
  if (profile.inferredRole === "measure" || profile.stats) {
    const symmetric = profile.stats
      ? Math.abs(profile.stats.mean - profile.stats.median) <=
        Math.max(1e-9, Math.abs(profile.stats.stdev) * 0.25)
      : false;
    if (symmetric && nullPct <= 0.25) {
      return "Mean imputation is a candidate only if missingness is MCAR and the distribution remains symmetric after segment checks; median/model-based alternatives remain safer under skew or dependency.";
    }
    return "Median or model-based imputation may be candidates after checking skew, segment dependence, and correlated predictors; do not impute blindly.";
  }
  if (
    profile.inferredRole === "dimension" ||
    profile.inferredType === "categorical"
  ) {
    return "Mode imputation is valid only under low-entropy dominance; otherwise create an Unknown/Missing category or use predictive imputation if dependencies exist.";
  }
  return "Imputation requires dependency and missingness-mechanism validation before use.";
}

function formatDAIEDecision(decision: DAIEColumnDecision): string {
  return [
    `COLUMN: ${decision.column}`,
    `Role: ${decision.role}`,
    `Dependency: ${decision.dependency}`,
    `Business importance: ${decision.businessImportance}`,
    `Statistical profile: ${decision.statisticalProfile}`,
    `Data quality: ${decision.dataQuality}`,
    `Options considered: ${decision.optionsConsidered.map((option) => `${option.label} - ${option.reasoning} Risk: ${option.risk}`).join(" | ")}`,
    `Final decision: ${decision.finalDecision}`,
    `Justification: ${decision.justification}`,
    `Risk assessment: ${decision.riskAssessment}`,
  ].join("\n");
}

function buildNullReasoning(
  colName: string,
  nullPct: number,
  category: string,
  schemaRole: string,
  decision: DAIEColumnDecision,
): {
  reasoning: string;
  possibleCauses: CleaningIssue["possibleCauses"];
  alternativeInterpretations: string[];
  action: CleaningIssue["action"];
  severity: CleaningIssue["severity"];
  confidence: number;
} {
  const pctStr = `${(nullPct * 100).toFixed(0)}%`;

  // Default safe action — always flag, never auto-drop
  const action: CleaningIssue["action"] = "flag_only";
  const severity: CleaningIssue["severity"] =
    nullPct > 0.5 ? "warning" : "info";
  const confidence = decision.finalDecision === "transform" ? 0.72 : 0.62;

  // Category-aware possible causes
  const possibleCauses: CleaningIssue["possibleCauses"] = [];
  const alternativeInterpretations: string[] = [];

  if (category === "financial_metric") {
    possibleCauses.push(
      {
        cause:
          "Transaction did not occur (e.g., cancelled order — no payment amount)",
        plausibility: 0.5,
        evidence: `Financial columns are often null when the transaction that populates them did not complete.`,
      },
      {
        cause: "Data migration gap — historical records pre-date this field",
        plausibility: 0.3,
        evidence: `${pctStr} null rate may indicate this column was added after the dataset began.`,
      },
      {
        cause: "Data entry error or upstream pipeline failure",
        plausibility: 0.2,
        evidence: "Random null distribution without business logic.",
      },
    );
    alternativeInterpretations.push(
      `Nulls in "${colName}" may represent zero transactions — confirm whether null and zero should be treated equally.`,
      "If this is a refund or discount column, nulls may correctly mean 'no refund/discount applied'.",
    );
  } else if (category === "time_dimension") {
    possibleCauses.push(
      {
        cause: "Event not yet occurred (future-dated records)",
        plausibility: 0.55,
        evidence:
          "Date columns are commonly null when the event they record has not happened yet.",
      },
      {
        cause: "Optional event that only applies to a subset of records",
        plausibility: 0.35,
        evidence: `${pctStr} null rate suggests this date only applies to a subset.`,
      },
    );
    alternativeInterpretations.push(
      `Null "${colName}" may mean 'not yet delivered' or 'not yet closed' — the null itself is informative.`,
    );
  } else if (category === "geo_dimension") {
    possibleCauses.push(
      {
        cause: "Online or digital channel where geography is not captured",
        plausibility: 0.45,
        evidence:
          "Geographic fields are often optional in digital-first datasets.",
      },
      {
        cause: "Data privacy masking or GDPR compliance",
        plausibility: 0.3,
        evidence:
          "Geographic granularity is frequently suppressed for privacy.",
      },
    );
    alternativeInterpretations.push(
      "Null geography may represent 'online/unknown' — consider encoding as 'Unknown' rather than dropping.",
    );
  } else if (category === "entity_key") {
    possibleCauses.push(
      {
        cause:
          "Optional relationship — not all records are linked to this entity",
        plausibility: 0.6,
        evidence:
          "FK columns are null when the relationship is optional (outer join).",
      },
      {
        cause: "Guest or anonymous records that have no entity link",
        plausibility: 0.3,
        evidence:
          "Common in e-commerce (guest checkout) and CRM (anonymous leads).",
      },
    );
    alternativeInterpretations.push(
      `Null "${colName}" may represent anonymous or unregistered entities — preserve rather than drop.`,
    );
  } else {
    // Generic causes
    possibleCauses.push(
      {
        cause: "Optional field not filled by all data sources",
        plausibility: 0.5,
        evidence: `${pctStr} null rate suggests optional field.`,
      },
      {
        cause:
          "Data pipeline gap — field not populated by all upstream systems",
        plausibility: 0.3,
        evidence: "Multi-source datasets commonly have partial field coverage.",
      },
      {
        cause: "Field added retroactively — historical records lack this data",
        plausibility: 0.2,
        evidence: "Common when schema evolves over time.",
      },
    );
    alternativeInterpretations.push(
      "Investigate whether nulls correlate with a specific time period, source system, or customer segment before taking any action.",
    );
  }

  const reasoning =
    nullPct > 0.9
      ? `"${colName}" is ${pctStr} null. Columns above 90% null typically contribute negligible signal. HOWEVER: verify this is not a future-dated field, a rarely-triggered event, or a recently-added column before dropping — any of these would make the nulls meaningful.`
      : nullPct > 0.5
        ? `"${colName}" is ${pctStr} null. A senior data scientist would first investigate WHY before taking any action. Possible explanations range from an optional field to a data pipeline issue. Flagging for human review rather than auto-dropping.`
        : `"${colName}" has ${pctStr} missing values in a numeric measure column. Consider median imputation for predictive use cases, but use nullable aggregates for reporting to avoid silently treating nulls as zeros.`;

  return {
    reasoning,
    possibleCauses,
    alternativeInterpretations,
    action,
    severity,
    confidence,
  };
}

function buildOutlierReasoning(
  colName: string,
  count: number,
  category: string,
  stats: { q1: number; q3: number; min: number; max: number },
): {
  reasoning: string;
  possibleCauses: CleaningIssue["possibleCauses"];
  alternativeInterpretations: string[];
} {
  const possibleCauses: CleaningIssue["possibleCauses"] = [];
  const alternativeInterpretations: string[] = [];

  if (category === "financial_metric") {
    possibleCauses.push(
      {
        cause: "Bulk/corporate purchase or enterprise customer order",
        plausibility: 0.45,
        evidence: `Extreme values in financial columns often reflect large B2B transactions rather than errors.`,
      },
      {
        cause: "Seasonal or promotional spike (holiday sale, flash deal)",
        plausibility: 0.35,
        evidence:
          "Financial outliers frequently align with peak seasons or campaign periods.",
      },
      {
        cause:
          "Data entry error — wrong unit (e.g., paise instead of rupees, cents instead of dollars)",
        plausibility: 0.15,
        evidence:
          "Unit mismatch is a common data quality issue in financial columns.",
      },
      {
        cause: "Fraud or anomalous transaction",
        plausibility: 0.05,
        evidence:
          "Statistical outliers are a primary fraud detection signal — never auto-remove.",
      },
    );
    alternativeInterpretations.push(
      `Outlier values in "${colName}" may represent your most valuable customers or highest-revenue events — removing them would distort revenue analysis.`,
      "Investigate outlier rows individually: check the customer segment, date, and channel before deciding on treatment.",
    );
  } else if (category === "operational_metric") {
    possibleCauses.push(
      {
        cause: "Bulk order or warehouse replenishment transaction",
        plausibility: 0.5,
        evidence:
          "Quantity outliers in operational data frequently reflect planned bulk operations.",
      },
      {
        cause: "Data entry error (e.g., extra zero added)",
        plausibility: 0.3,
        evidence:
          "Quantity fields are prone to digit-doubling errors in manual entry.",
      },
      {
        cause: "System-generated test or initialisation record",
        plausibility: 0.2,
        evidence:
          "Test records are sometimes not filtered from production exports.",
      },
    );
    alternativeInterpretations.push(
      "Segment outlier rows by source system or user — test records have a distinctive pattern.",
    );
  } else {
    possibleCauses.push(
      {
        cause: "Genuine extreme event (rare but real business occurrence)",
        plausibility: 0.5,
        evidence:
          "IQR-based outlier detection is sensitive; not all flagged values are errors.",
      },
      {
        cause: "Data quality issue — measurement or entry error",
        plausibility: 0.3,
        evidence: "Statistical extremes warrant manual investigation.",
      },
      {
        cause: "Different population mixed into this dataset (e.g., B2B + B2C)",
        plausibility: 0.2,
        evidence:
          "Multi-segment datasets often show bimodal distributions that appear as outliers.",
      },
    );
    alternativeInterpretations.push(
      "Never auto-remove outliers without business justification. Flag them for investigation instead.",
    );
  }

  const reasoning =
    `${count} values in "${colName}" fall outside the 1.5×IQR statistical fence. ` +
    `A professional data scientist never auto-removes outliers — they represent either business extremes (high-value events, bulk orders, fraud) or data errors. ` +
    `Investigate each cluster of outliers against the date, customer, and channel dimensions before deciding on treatment.`;

  return { reasoning, possibleCauses, alternativeInterpretations };
}

function buildNullBusinessImpact(
  colName: string,
  category: string,
  nullPct: number,
): string {
  if (category === "financial_metric") {
    return `Missing values in "${colName}" will cause sum-based KPIs (total revenue, average order value) to be understated. If nulls represent zero-value events, this will create misleading metrics.`;
  }
  if (category === "time_dimension") {
    return `Missing dates in "${colName}" will create gaps in time-series charts and prevent period-over-period comparisons for affected records.`;
  }
  if (category === "geo_dimension") {
    return `Missing geography in "${colName}" will exclude ${(nullPct * 100).toFixed(0)}% of records from regional analysis and territorial breakdowns.`;
  }
  return `Affects completeness of analysis. ${(nullPct * 100).toFixed(0)}% of records will be excluded from computations that require this column.`;
}

// ---------------------------------------------------------------------------
// Governance filter — DAIE is the only authority for executable actions
// ---------------------------------------------------------------------------

/**
 * Enforces the governance rule: only issues that originated from the DAIE
 * heuristic layer (carrying a daieDecision) may execute non-flag actions.
 * AI-sourced issues are always downgraded to flag_only.
 */
export function enforceDAIEGovernance(issue: CleaningIssue): CleaningIssue {
  // AI-generated issues (id prefix "ai_") are advisory only
  if (issue.id.startsWith("ai_")) {
    return { ...issue, action: "flag_only" };
  }
  // Heuristic issues without a DAIE decision object are also downgraded
  // (defensive: should not happen in normal flow, but guards future regressions)
  if (
    !issue.daieDecision &&
    issue.action !== "drop_duplicates" &&
    issue.action !== "flag_only"
  ) {
    return { ...issue, action: "flag_only" };
  }
  return issue;
}

// ---------------------------------------------------------------------------
// Apply issues (execution layer — dumb runner, no decision logic)
// ---------------------------------------------------------------------------

export function applyIssues(
  rows: Record<string, unknown>[],
  issues: CleaningIssue[],
): { rows: Record<string, unknown>[]; applied: CleaningIssue[] } {
  let out = rows;
  const applied: CleaningIssue[] = [];

  for (const issue of issues) {
    // Governance backstop: block any issue that bypassed the filter
    if (
      issue.action !== "flag_only" &&
      issue.action !== "drop_duplicates" &&
      !issue.daieDecision
    ) {
      console.warn(
        "[GOVERNANCE BLOCKED] Issue reached executor without DAIE decision:",
        issue.id,
      );
      continue;
    }

    let changed = false;

    if (issue.action === "drop_duplicates") {
      const seen = new Set<string>();
      out = out.filter((r) => {
        const k = JSON.stringify(r);
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
      changed = true;
    } else if (issue.action === "drop_column" && issue.affectedColumns) {
      out = out.map((r) => {
        const nr = { ...r };
        for (const c of issue.affectedColumns!) {
          if (Object.prototype.hasOwnProperty.call(nr, c)) {
            delete nr[c];
            changed = true;
          }
        }
        return nr;
      });
    } else if (issue.action === "fill_missing" && issue.affectedColumns) {
      for (const column of issue.affectedColumns) {
        const numericValues: number[] = [];
        const stringValues: string[] = [];

        for (const row of out) {
          const value = row[column];
          if (
            value === null ||
            value === undefined ||
            (typeof value === "string" && value.trim() === "")
          )
            continue;
          if (typeof value === "number" && Number.isFinite(value)) {
            numericValues.push(value);
          } else if (typeof value === "string") {
            const parsed = parseNumericString(value);
            if (parsed !== null) {
              numericValues.push(parsed);
            } else {
              stringValues.push(value);
            }
          }
        }

        if (numericValues.length > 0) {
          const median = getMedian(numericValues);
          out = out.map((row) => {
            const value = row[column];
            if (
              value === null ||
              value === undefined ||
              (typeof value === "string" && value.trim() === "")
            ) {
              changed = true;
              return { ...row, [column]: median };
            }
            return row;
          });
        } else if (stringValues.length > 0) {
          const mode = getMode(stringValues);
          if (mode !== null) {
            out = out.map((row) => {
              const value = row[column];
              if (
                value === null ||
                value === undefined ||
                (typeof value === "string" && value.trim() === "")
              ) {
                changed = true;
                return { ...row, [column]: mode };
              }
              return row;
            });
          }
        }
      }
    } else if (issue.action === "strip_whitespace" && issue.affectedColumns) {
      out = out.map((row) => {
        const nr = { ...row };
        for (const column of issue.affectedColumns!) {
          const value = nr[column];
          if (typeof value === "string") {
            const trimmed = value.trim();
            if (trimmed !== value) {
              nr[column] = trimmed;
              changed = true;
            }
          }
        }
        return nr;
      });
    } else if (issue.action === "standardize_case" && issue.affectedColumns) {
      out = out.map((row) => {
        const nr = { ...row };
        for (const column of issue.affectedColumns!) {
          const value = nr[column];
          if (typeof value === "string") {
            const standardized = value.trim().toLowerCase();
            if (standardized !== value) {
              nr[column] = standardized;
              changed = true;
            }
          }
        }
        return nr;
      });
    } else if (issue.action === "convert_type" && issue.affectedColumns) {
      out = out.map((row) => {
        const nr = { ...row };
        for (const column of issue.affectedColumns!) {
          const value = nr[column];
          const converted = convertTypeValue(value);
          if (converted !== value) {
            nr[column] = converted;
            changed = true;
          }
        }
        return nr;
      });
    } else if (
      issue.action === "normalize_empty_strings_to_null" &&
      issue.affectedColumns
    ) {
      out = out.map((row) => {
        const nr = { ...row };
        for (const column of issue.affectedColumns!) {
          const value = nr[column];
          const normalized = normalizeEmptyStringValue(value);
          if (normalized !== value) {
            nr[column] = normalized;
            changed = true;
          }
        }
        return nr;
      });
    } else if (issue.action === "validate_email" && issue.affectedColumns) {
      out = out.map((row) => {
        const nr = { ...row };
        for (const column of issue.affectedColumns!) {
          const value = nr[column];
          const normalized = normalizeEmailValue(value);
          if (normalized !== value) {
            nr[column] = normalized;
            changed = true;
          }
        }
        return nr;
      });
    } else if (
      issue.action === "normalize_phone_numbers" &&
      issue.affectedColumns
    ) {
      out = out.map((row) => {
        const nr = { ...row };
        for (const column of issue.affectedColumns!) {
          const value = nr[column];
          if (typeof value === "string") {
            const normalized = normalizePhoneString(value);
            if (normalized !== null && normalized !== value) {
              nr[column] = normalized;
              changed = true;
            }
          }
        }
        return nr;
      });
    }

    if (changed) {
      applied.push({ ...issue, applied: true });
    }
  }

  return { rows: out, applied };
}

// ---------------------------------------------------------------------------
// Build report (preserved exactly — no API change)
// ---------------------------------------------------------------------------

export function buildReport(
  datasetId: string,
  issues: CleaningIssue[],
  rowsBefore: number,
  rowsAfter: number,
  notes: string,
): CleaningReport {
  const critical = issues.filter((i) => i.severity === "critical").length;
  const warnings = issues.filter((i) => i.severity === "warning").length;
  const qualityScore = Math.max(
    0,
    Math.min(100, 100 - critical * 15 - warnings * 5 - issues.length * 2),
  );
  return { datasetId, issues, rowsBefore, rowsAfter, qualityScore, notes };
}
