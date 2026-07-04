/**
 * Column Intelligence Engine
 * --------------------------
 * Produces rich semantic intelligence for every column in a dataset.
 *
 * Responsibilities (single-responsibility principle):
 *  - Determine the business category (financial, operational, geographic, etc.)
 *  - Determine the star-schema role (fact measure, dimension, PK, FK, …)
 *  - Identify KPI and forecast candidates
 *  - Detect geographic columns
 *  - Assign meaningful business tags
 *
 * This module works entirely from column names, inferred types, and sample
 * values. It NEVER calls AI and NEVER modifies data — pure analysis only.
 */

import type {
  BusinessColumnCategory,
  ColumnIntelligence,
  ColumnProfile,
  ColumnSemanticType,
  SchemaRole,
} from "../types";
import { columnIntelligenceConfidence } from "./shared-confidence";

// ---------------------------------------------------------------------------
// Signal maps — ordered from most specific to most general
// ---------------------------------------------------------------------------
/**
 * Samples up to 50 non-null values from a column and checks if they match
 * a given regex pattern. Returns true if >80% of sampled values match.
 */
function sampleMatches(
  rows: Record<string, unknown>[],
  colName: string,
  regex: RegExp,
  sampleSize = 50,
): boolean {
  let matched = 0;
  let checked = 0;
  for (const row of rows) {
    const val = row[colName];
    if (val === null || val === undefined || val === "") continue;
    const str = String(val);
    if (regex.test(str)) matched++;
    checked++;
    if (checked >= sampleSize) break;
  }
  return checked > 0 && matched / checked > 0.8;
}

/** Maps column name patterns to a BusinessColumnCategory. */
const CATEGORY_SIGNALS: Array<{
  pattern: RegExp;
  category: BusinessColumnCategory;
  tags: string[];
  schemaRole: SchemaRole;
}> = [
  // Financial metrics
  {
    pattern: /\b(revenue|sales|income|earning|turnover)\b/i,
    category: "financial_metric",
    tags: ["revenue", "financial_kpi", "forecast_candidate"],
    schemaRole: "fact_measure",
  },
  {
    pattern: /\b(profit|margin|net|gross|ebitda)\b/i,
    category: "financial_metric",
    tags: ["profitability", "financial_kpi", "forecast_candidate"],
    schemaRole: "fact_measure",
  },
  {
    pattern: /\b(cost|expense|spend|expenditure|opex|capex)\b/i,
    category: "financial_metric",
    tags: ["cost", "financial_kpi"],
    schemaRole: "fact_measure",
  },
  {
    pattern: /\b(amount|total|sum|payment|value)\b/i,
    category: "financial_metric",
    tags: ["transaction_value", "financial_kpi", "forecast_candidate"],
    schemaRole: "fact_measure",
  },
  {
    pattern: /\b(price|rate|fee|charge|tariff)\b/i,
    category: "financial_metric",
    tags: ["pricing", "financial_metric"],
    schemaRole: "fact_measure",
  },
  {
    pattern: /\b(discount|rebate|deduction|markdown)\b/i,
    category: "financial_metric",
    tags: ["discount", "promotional"],
    schemaRole: "fact_measure",
  },
  {
    pattern: /\b(refund|return|reversal|chargeback|credit_note)\b/i,
    category: "financial_metric",
    tags: ["refund", "reversal", "financial_metric"],
    schemaRole: "fact_measure",
  },
  // Operational metrics
  {
    pattern: /\b(quantity|qty|units|count|volume|pieces|items)\b/i,
    category: "operational_metric",
    tags: ["volume", "operational_kpi"],
    schemaRole: "fact_measure",
  },
  {
    pattern: /\b(duration|time|minutes|hours|days|cycle_time|turnaround)\b/i,
    category: "operational_metric",
    tags: ["duration", "efficiency"],
    schemaRole: "fact_measure",
  },
  {
    pattern: /\b(weight|size|dimension|width|height|length|capacity)\b/i,
    category: "operational_metric",
    tags: ["physical_attribute", "operational"],
    schemaRole: "fact_measure",
  },
  // Ratio / percentage metrics
  {
    pattern: /\b(rate|ratio|pct|percent|percentage|score|index)\b/i,
    category: "ratio_metric",
    tags: ["rate_metric", "normalised"],
    schemaRole: "fact_measure",
  },
  // Time dimensions

  {
    pattern: /\b(date|datetime|timestamp|time|created_at|updated_at|modified)\b/i,
    category: "time_dimension",
    tags: ["timeline", "seasonality_candidate", "forecast_timeline"],
    schemaRole: "date_key",
  },
  {
    pattern: /\b(year|month|quarter|week|day|period|fiscal)\b/i,
    category: "time_dimension",
    tags: ["time_period", "fiscal_calendar"],
    schemaRole: "dimension_attribute",
  },
  // Geographic dimensions
  {
    pattern: /\b(country|nation|region|state|province|county|territory)\b/i,
    category: "geo_dimension",
    tags: ["geography", "market_territory", "sales_region"],
    schemaRole: "dimension_attribute",
  },
  {
    pattern: /\b(city|town|district|zip|pincode|postal|location|address)\b/i,
    category: "geo_dimension",
    tags: ["geography", "location"],
    schemaRole: "dimension_attribute",
  },
  {
    pattern: /\b(lat|latitude|lon|longitude|geo|coordinate)\b/i,
    category: "geo_dimension",
    tags: ["geospatial", "coordinates"],
    schemaRole: "dimension_attribute",
  },
  // Entity keys (IDs, codes)
  {
    pattern: /\b(id|key|code|number|num|no|ref|uuid|guid)\b/i,
    category: "entity_key",
    tags: ["identifier"],
    schemaRole: "dimension_key",
  },
  // Status flags
  {
    pattern: /\b(status|state|flag|active|is_|has_|type|category|class|label|tag)\b/i,
    category: "status_flag",
    tags: ["categorical_filter", "dimension"],
    schemaRole: "dimension_attribute",
  },
  // Descriptors
  {
    pattern: /\b(name|title|description|notes|comment|remarks|detail|text|label)\b/i,
    category: "descriptor",
    tags: ["free_text", "non_aggregatable"],
    schemaRole: "dimension_attribute",
  },
];

// ---------------------------------------------------------------------------
// Business Meaning Templates
// ---------------------------------------------------------------------------

/**
 * Maps (category, domain) → a human-readable meaning template.
 * Keeps meaning generation deterministic and testable.
 */
const MEANING_TEMPLATES: Record<BusinessColumnCategory, Record<string, string>> = {
  financial_metric: {
    ecommerce:
      "Transaction monetary value — aggregates to total revenue and feeds into AOV calculations.",
    finance: "Financial ledger amount — used in P&L, balance sheet, or cash flow reporting.",
    retail: "Sales transaction value — aggregates to store revenue and gross margin.",
    banking: "Monetary transaction amount — contributes to loan book or deposit analysis.",
    default: "Numeric financial measure — suitable for summing, averaging, and forecasting.",
  },
  operational_metric: {
    ecommerce: "Order volume metric — measures purchasing intensity and operational throughput.",
    manufacturing: "Production volume measure — feeds OEE and capacity utilisation calculations.",
    logistics: "Shipment quantity — tracks load volume and carrier utilisation.",
    default: "Operational count or volume measure — indicates activity level.",
  },
  time_dimension: {
    default:
      "Temporal dimension — enables trend analysis, seasonality detection, and period comparisons.",
    ecommerce:
      "Transaction timeline — drives daily/weekly/monthly sales trend and seasonality analysis.",
    finance:
      "Financial reporting period — aligns to fiscal calendar for period-over-period reporting.",
    hr: "Employment timeline — supports tenure calculation and attrition cohort analysis.",
  },
  geo_dimension: {
    default:
      "Geographic dimension — enables regional performance comparison and territory analysis.",
    ecommerce:
      "Delivery or customer region — supports regional revenue split and logistics optimisation.",
    retail:
      "Store or market geography — enables same-store analysis and regional performance ranking.",
    marketing:
      "Campaign geography — measures regional campaign effectiveness and market penetration.",
  },
  entity_key: {
    default: "Identifier column — primary or foreign key used to join related datasets.",
    ecommerce: "Transactional identifier — links orders to customers, products, or payments.",
    hr: "Employee or department identifier — enables joins across workforce tables.",
  },
  descriptor: {
    default: "Descriptive text column — provides context but is not directly aggregatable.",
  },
  status_flag: {
    default: "Categorical status indicator — segments records into meaningful business states.",
    ecommerce: "Order lifecycle stage — tracks customer journey from placement to fulfilment.",
    operations: "Ticket or workflow state — drives SLA monitoring and resolution analysis.",
  },
  ratio_metric: {
    default:
      "Rate or percentage measure — already normalised; do not sum, use average or last-known.",
    finance: "Financial ratio — used in profitability analysis and performance benchmarking.",
    marketing: "Performance rate — CTR, conversion rate, or efficiency metric.",
  },
  unknown: {
    default:
      "Column meaning could not be determined with confidence from name and sample values alone.",
  },
};

// ---------------------------------------------------------------------------
// Core Engine
// ---------------------------------------------------------------------------

/**
 * Analyses a single column and returns rich ColumnIntelligence.
 *
 * @param profile   - The basic ColumnProfile produced by profiler.ts
 * @param domain    - The business domain inferred by the Business Context Engine
 */
export function analyseColumn(profile: ColumnProfile, domain: string): ColumnIntelligence {
  const name = profile.name;
  const nameLower = name.toLowerCase();
  const inferredType = profile.inferredType;

  // Step 1: Determine business category via signal matching
  const { category, tags, schemaRole } = detectCategoryAndRole(nameLower, inferredType, profile);

  // Step 2: Override schema role based on actual profile data
  const finalSchemaRole = resolveSchemaRole(schemaRole, profile);

  // Step 3: Determine business meaning
  const businessMeaning = resolveMeaning(category, domain, name, profile);

  // Step 4: Determine KPI and forecast candidacy
  const isKpiCandidate = determineKpiCandidacy(category, finalSchemaRole, profile);
  const isForecastCandidate = determineForecastCandidacy(category, finalSchemaRole, profile);
  const isGeographic = category === "geo_dimension";

  // Step 5: Compute confidence
  const confidence = computeConfidence(name, inferredType, category, profile);

  // Step 6: Build rationale
  const rationale = buildRationale(name, category, finalSchemaRole, confidence);

  return {
    technicalType: inferredType,
    businessCategory: category,
    businessMeaning,
    schemaRole: finalSchemaRole,
    isKpiCandidate,
    isForecastCandidate,
    isGeographic,
    businessTags: Array.from(new Set(tags)),
    confidence,
    rationale,
  };
}

/**
 * Runs analyseColumn over every column profile.
 * Returns a map of column name → ColumnIntelligence.
 */
export function analyseAllColumns(
  profiles: ColumnProfile[],
  domain: string,
): Record<string, ColumnIntelligence> {
  const result: Record<string, ColumnIntelligence> = {};
  for (const profile of profiles) {
    result[profile.name] = analyseColumn(profile, domain);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function detectCategoryAndRole(
  nameLower: string,
  inferredType: ColumnSemanticType,
  profile: ColumnProfile,
): {
  category: BusinessColumnCategory;
  tags: string[];
  schemaRole: SchemaRole;
} {
  // Type-based fast path for unambiguous types
  if (inferredType === "datetime" || inferredType === "date") {
    return {
      category: "time_dimension",
      tags: ["timeline", "seasonality_candidate", "forecast_timeline"],
      schemaRole: "date_key",
    };
  }
  if (inferredType === "email" || inferredType === "url") {
    return {
      category: "descriptor",
      tags: ["contact_info"],
      schemaRole: "dimension_attribute",
    };
  }
  if (inferredType === "boolean") {
    return {
      category: "status_flag",
      tags: ["binary_flag"],
      schemaRole: "dimension_attribute",
    };
  }
  if (inferredType === "geo") {
    return {
      category: "geo_dimension",
      tags: ["geography"],
      schemaRole: "dimension_attribute",
    };
  }
  if (
    inferredType === "identifier" ||
    inferredType === "primary_key" ||
    inferredType === "foreign_key"
  ) {
    return {
      category: "entity_key",
      tags: ["identifier"],
      schemaRole: "dimension_key",
    };
  }

  // Name-pattern matching (primary engine)
  for (const signal of CATEGORY_SIGNALS) {
    if (signal.pattern.test(nameLower)) {
      return {
        category: signal.category,
        tags: [...signal.tags],
        schemaRole: signal.schemaRole,
      };
    }
  }

  // Fall-through: use inferred type to make a best guess
  if (
    inferredType === "numeric_measure" ||
    inferredType === "currency" ||
    inferredType === "percentage"
  ) {
    return {
      category: "operational_metric",
      tags: ["numeric_measure"],
      schemaRole: "fact_measure",
    };
  }

  if (inferredType === "categorical") {
    const isHighCard = profile.uniqueCount > 20;
    return {
      category: isHighCard ? "descriptor" : "status_flag",
      tags: ["categorical"],
      schemaRole: "dimension_attribute",
    };
  }

  return { category: "unknown", tags: [], schemaRole: "unknown" };
}

/**
 * Refines the schema role using empirical column statistics.
 * A column with 100% unique values and numeric type → primary_key candidate.
 * A column with low cardinality → dimension_attribute.
 */
function resolveSchemaRole(initial: SchemaRole, profile: ColumnProfile): SchemaRole {
  const uniqueRatio = profile.uniqueCount / Math.max(1, profile.nonNullCount + profile.nullCount);

  // Pure key detection: nearly all values are unique + short name with "id"
  if (
    uniqueRatio > 0.98 &&
    profile.nonNullCount > 5 &&
    /id|key|code|ref|uuid/i.test(profile.name)
  ) {
    return "primary_key";
  }

  // Foreign key candidate: unique ratio < 80%, name contains key-like suffix
  if (
    uniqueRatio < 0.8 &&
    uniqueRatio > 0.01 &&
    /id|key|code|ref/i.test(profile.name) &&
    initial === "dimension_key"
  ) {
    return "dimension_key"; // confirmed FK
  }

  // Low-cardinality numeric that looks like a measure → fact_measure
  if (initial === "fact_measure" && profile.inferredRole === "measure" && profile.stats) {
    return "fact_measure";
  }

  return initial;
}

function resolveMeaning(
  category: BusinessColumnCategory,
  domain: string,
  columnName: string,
  _profile: ColumnProfile,
): string {
  const domainKey = domain in (MEANING_TEMPLATES[category] ?? {}) ? domain : "default";
  const template =
    MEANING_TEMPLATES[category]?.[domainKey] ??
    MEANING_TEMPLATES[category]?.["default"] ??
    "Column purpose undetermined.";

  // Prepend a context-specific prefix derived from the column name
  const pretty = columnName.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return `${pretty}: ${template}`;
}

function determineKpiCandidacy(
  category: BusinessColumnCategory,
  schemaRole: SchemaRole,
  profile: ColumnProfile,
): boolean {
  if (category === "financial_metric" || category === "ratio_metric") return true;
  if (category === "operational_metric" && schemaRole === "fact_measure") return true;
  if (profile.inferredRole === "measure" && profile.stats) return true;
  return false;
}

function determineForecastCandidacy(
  category: BusinessColumnCategory,
  schemaRole: SchemaRole,
  profile: ColumnProfile,
): boolean {
  // Only numeric measures with enough data are forecast candidates
  if (!profile.stats) return false;
  if (category === "time_dimension") return false; // it's the axis, not the target
  if (
    (category === "financial_metric" || category === "operational_metric") &&
    schemaRole === "fact_measure" &&
    profile.nonNullCount >= 30
  ) {
    return true;
  }
  return false;
}

function computeConfidence(
  name: string,
  inferredType: ColumnSemanticType,
  category: BusinessColumnCategory,
  profile: ColumnProfile,
): number {
  const hasDirectNameMatch = CATEGORY_SIGNALS.some((s) => s.pattern.test(name.toLowerCase()));
  const typeIsUnambiguous = inferredType !== "unknown" && inferredType !== "categorical";
  const categoryIsKnown = category !== "unknown";
  const density = profile.nonNullCount / Math.max(1, profile.nonNullCount + profile.nullCount);
  const isHighCardCategorical = inferredType === "categorical" && profile.uniqueCount > 100;

  return columnIntelligenceConfidence(
    hasDirectNameMatch,
    typeIsUnambiguous,
    categoryIsKnown,
    density,
    isHighCardCategorical,
  );
}

function buildRationale(
  name: string,
  category: BusinessColumnCategory,
  schemaRole: SchemaRole,
  confidence: number,
): string {
  const catLabel = category.replace(/_/g, " ");
  const roleLabel = schemaRole.replace(/_/g, " ");
  return (
    `Column "${name}" classified as ${catLabel} with schema role "${roleLabel}". ` +
    `Confidence: ${(confidence * 100).toFixed(0)}%. ` +
    `Classification driven by column name patterns and inferred data type.`
  );
}

// ---------------------------------------------------------------------------
// Fact / Dimension Map builder
// ---------------------------------------------------------------------------

/**
 * Produces a simple fact vs dimension classification for each column.
 * Useful for the EDA engine to make smarter chart decisions.
 */
export function buildFactDimensionMap(
  profiles: ColumnProfile[],
  intelligence: Record<string, ColumnIntelligence>,
): Record<string, "fact" | "dimension" | "unknown"> {
  const map: Record<string, "fact" | "dimension" | "unknown"> = {};

  for (const p of profiles) {
    const intel = intelligence[p.name];
    if (!intel) {
      map[p.name] = "unknown";
      continue;
    }

    if (
      intel.schemaRole === "fact_measure" ||
      intel.businessCategory === "financial_metric" ||
      intel.businessCategory === "operational_metric" ||
      intel.businessCategory === "ratio_metric"
    ) {
      map[p.name] = "fact";
    } else if (
      intel.schemaRole === "dimension_attribute" ||
      intel.schemaRole === "dimension_key" ||
      intel.schemaRole === "primary_key" ||
      intel.schemaRole === "date_key" ||
      intel.businessCategory === "time_dimension" ||
      intel.businessCategory === "geo_dimension" ||
      intel.businessCategory === "status_flag" ||
      intel.businessCategory === "entity_key" ||
      intel.businessCategory === "descriptor"
    ) {
      map[p.name] = "dimension";
    } else {
      map[p.name] = "unknown";
    }
  }

  return map;
}

// ---------------------------------------------------------------------------
// Measures and Dimensions extractor
// ---------------------------------------------------------------------------

/**
 * Extracts structured measure and dimension summaries from intelligence.
 * These feed into the DatasetUnderstanding for downstream use in EDA / AI.
 */
export function extractMeasuresAndDimensions(
  profiles: ColumnProfile[],
  intelligence: Record<string, ColumnIntelligence>,
): {
  measures: Array<{
    column: string;
    aggregation: "sum" | "avg" | "count" | "max" | "min" | "rate";
    unit?: string;
    businessMeaning: string;
  }>;
  dimensions: Array<{
    column: string;
    hierarchy?: string[];
    cardinality: "low" | "medium" | "high";
    businessMeaning: string;
  }>;
} {
  const measures: ReturnType<typeof extractMeasuresAndDimensions>["measures"] = [];
  const dimensions: ReturnType<typeof extractMeasuresAndDimensions>["dimensions"] = [];

  for (const p of profiles) {
    const intel = intelligence[p.name];
    if (!intel) continue;

    if (intel.schemaRole === "fact_measure") {
      // Determine best aggregation type
      let aggregation: "sum" | "avg" | "count" | "max" | "min" | "rate" = "sum";
      if (intel.businessCategory === "ratio_metric") aggregation = "avg";
      if (/rate|pct|percent|ratio|score/i.test(p.name)) aggregation = "avg";
      if (/max|peak|highest/i.test(p.name)) aggregation = "max";
      if (/min|lowest|floor/i.test(p.name)) aggregation = "min";

      // Detect currency unit from sample values
      let unit: string | undefined;
      const sampleStr = p.sampleValues.map(String).join(" ");
      if (/[$]/.test(sampleStr)) unit = "USD";
      else if (/[₹]/.test(sampleStr)) unit = "INR";
      else if (/[€]/.test(sampleStr)) unit = "EUR";
      else if (/[£]/.test(sampleStr)) unit = "GBP";

      measures.push({
        column: p.name,
        aggregation,
        unit,
        businessMeaning: intel.businessMeaning,
      });
    }

    if (intel.schemaRole === "dimension_attribute" || intel.schemaRole === "date_key") {
      const total = p.nonNullCount + p.nullCount;
      const cardinality: "low" | "medium" | "high" =
        p.uniqueCount <= 15 ? "low" : p.uniqueCount <= 100 ? "medium" : "high";

      // Detect hierarchies for geo columns
      let hierarchy: string[] | undefined;
      if (intel.isGeographic) {
        hierarchy = detectGeoHierarchy(p.name, profiles);
      }
      // Detect time hierarchies
      if (intel.businessCategory === "time_dimension") {
        hierarchy = ["Year", "Quarter", "Month", "Week", "Day"];
      }

      dimensions.push({
        column: p.name,
        hierarchy,
        cardinality,
        businessMeaning: intel.businessMeaning,
      });
    }
  }

  return { measures, dimensions };
}

/**
 * Looks for sibling columns that form a geographic hierarchy
 * (e.g., if column is "region", looks for "country", "city", "state").
 */
function detectGeoHierarchy(columnName: string, allProfiles: ColumnProfile[]): string[] {
  const GEO_LEVELS = [
    "country",
    "continent",
    "state",
    "province",
    "region",
    "city",
    "town",
    "district",
    "zip",
    "postal",
  ];
  const currentLevel = GEO_LEVELS.findIndex((g) => columnName.toLowerCase().includes(g));
  if (currentLevel === -1) return [];

  const hierarchy: string[] = [];
  for (const level of GEO_LEVELS) {
    const match = allProfiles.find((p) => p.name.toLowerCase().includes(level));
    if (match) hierarchy.push(match.name);
  }
  return hierarchy.length > 1 ? hierarchy : [];
}
