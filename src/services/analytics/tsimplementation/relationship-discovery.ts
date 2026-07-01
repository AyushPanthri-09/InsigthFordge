/**
 * Relationship Discovery Engine
 * ------------------------------
 * Automatically detects structural and semantic relationships between columns.
 *
 * Detects:
 *  - Primary keys (columns with near-100% unique, non-null values)
 *  - Foreign key relationships (ID columns that reference entities)
 *  - Date hierarchies (Year → Quarter → Month → Week → Day)
 *  - Geographic hierarchies (Country → State → City → ZIP)
 *  - Measure–dimension relationships (which measures belong to which dimensions)
 *  - Parent–child relationships (self-referential e.g. manager_id → employee_id)
 *  - Lookup/code columns (low cardinality + paired label column)
 *
 * Design:
 *  - Pure analysis — never modifies data.
 *  - All results are confidence-scored and include a rationale.
 *  - Integrates with ColumnIntelligence output for richer inference.
 */

import type { ColumnIntelligence, ColumnProfile, ColumnRelationship, TimeIntelligence } from "../types";

// ---------------------------------------------------------------------------
// Primary Key Detection
// ---------------------------------------------------------------------------

/**
 * Identifies columns that are likely primary keys.
 * Criteria:
 *   1. Unique ratio > 95% (allows for small data quality issues)
 *   2. Null rate < 5%
 *   3. Column name matches ID patterns (preferred but not required)
 */
export function detectPrimaryKeys(profiles: ColumnProfile[]): ColumnRelationship[] {
  const relationships: ColumnRelationship[] = [];

  for (const p of profiles) {
    const total = p.nonNullCount + p.nullCount;
    if (total === 0) continue;

    const uniqueRatio = p.uniqueCount / total;
    const nullRatio = p.nullCount / total;
    const nameIsKey = /\b(id|key|code|uuid|guid|ref|number|no)\b/i.test(p.name);

    if (uniqueRatio > 0.95 && nullRatio < 0.05 && nameIsKey) {
      relationships.push({
        fromColumn: p.name,
        toColumn: p.name,
        relationshipType: "primary_key",
        confidence: Math.min(0.95, 0.6 + uniqueRatio * 0.35),
        rationale: `"${p.name}" has ${(uniqueRatio * 100).toFixed(1)}% unique values and matches key naming patterns — strong primary key candidate.`,
      });
    }
  }

  return relationships;
}

// ---------------------------------------------------------------------------
// Foreign Key Detection
// ---------------------------------------------------------------------------

/**
 * Detects foreign key relationships by matching naming patterns.
 *
 * Strategy:
 *  - If column A is named "customer_id" and there is also a "customer_name"
 *    or "customer" prefix in other columns, A is likely a FK to a customer entity.
 *  - Explicit pattern: "[entity]_id" → infer FK to entity table.
 *  - Self-reference: "manager_id" in an employee table → parent-child.
 */
export function detectForeignKeys(
  profiles: ColumnProfile[],
  primaryKeys: ColumnRelationship[],
): ColumnRelationship[] {
  const relationships: ColumnRelationship[] = [];
  const pkNames = new Set(primaryKeys.map((r) => r.fromColumn.toLowerCase()));
  const allColLower = profiles.map((p) => p.name.toLowerCase());

  // Pattern: [entity]_id columns that are NOT primary keys
  const FK_SUFFIX_RE = /^(.+?)[\s_-]?(id|key|code|ref)$/i;

  for (const p of profiles) {
    if (pkNames.has(p.name.toLowerCase())) continue; // skip known PKs

    const match = FK_SUFFIX_RE.exec(p.name);
    if (!match) continue;

    const entityName = match[1].toLowerCase();

    // Look for sibling columns that share the entity name prefix
    const siblingCols = profiles.filter(
      (other) =>
        other.name !== p.name &&
        other.name.toLowerCase().startsWith(entityName) &&
        !FK_SUFFIX_RE.test(other.name),
    );

    // Self-reference detection: e.g., manager_id in a table that also has employee_id
    const isSelfRef = allColLower.some(
      (c) => c !== p.name.toLowerCase() && c.includes(entityName) && c.endsWith("id"),
    );

    if (siblingCols.length > 0) {
      relationships.push({
        fromColumn: p.name,
        toColumn: siblingCols[0].name,
        relationshipType: isSelfRef ? "parent_child" : "foreign_key",
        confidence: isSelfRef ? 0.7 : 0.75,
        rationale: isSelfRef
          ? `"${p.name}" appears to reference a parent record in the same entity (self-referential hierarchy).`
          : `"${p.name}" follows the [entity]_id pattern and has sibling columns ("${siblingCols.map((c) => c.name).join(", ")}") — likely a foreign key to the ${entityName} entity.`,
      });
    } else {
      // No sibling columns but strong naming pattern — still flag as FK candidate
      const total = p.nonNullCount + p.nullCount;
      const uniqueRatio = total > 0 ? p.uniqueCount / total : 0;
      if (uniqueRatio < 0.9 && uniqueRatio > 0.001) {
        // Low unique ratio = many rows share the same FK value = good FK signal
        relationships.push({
          fromColumn: p.name,
          toColumn: `${entityName}_table`,
          relationshipType: "foreign_key",
          confidence: 0.6,
          rationale: `"${p.name}" matches FK naming convention. Unique ratio ${(uniqueRatio * 100).toFixed(1)}% suggests multiple rows share the same ${entityName}.`,
        });
      }
    }
  }

  return relationships;
}

// ---------------------------------------------------------------------------
// Date Hierarchy Detection
// ---------------------------------------------------------------------------

/**
 * Detects date-related columns and infers the hierarchy they form.
 * Also extracts time intelligence (range, granularity, seasonality signal).
 */
export function detectDateHierarchies(
  profiles: ColumnProfile[],
  rows: Record<string, unknown>[],
): { relationships: ColumnRelationship[]; timeIntelligence: TimeIntelligence | null } {
  const relationships: ColumnRelationship[] = [];

  const dateProfiles = profiles.filter(
    (p) => p.inferredRole === "date" || p.inferredType === "datetime" || p.inferredType === "date",
  );

  if (dateProfiles.length === 0) return { relationships, timeIntelligence: null };

  // Identify the primary date column (highest non-null rate among date cols)
  const primary = dateProfiles.reduce((best, cur) =>
    cur.nonNullCount > best.nonNullCount ? cur : best,
  );

  // Extract date range from sample rows
  const rawDates: Date[] = [];
  for (const row of rows.slice(0, 500)) {
    const val = row[primary.name];
    const d = toDate(val);
    if (d) rawDates.push(d);
  }

  rawDates.sort((a, b) => a.getTime() - b.getTime());
  const dateRangeStart = rawDates[0]?.toISOString().split("T")[0];
  const dateRangeEnd = rawDates[rawDates.length - 1]?.toISOString().split("T")[0];
  const spanDays =
    rawDates.length >= 2
      ? Math.round((rawDates[rawDates.length - 1].getTime() - rawDates[0].getTime()) / 86_400_000)
      : undefined;

  // Detect granularity by looking at unique dates per period
  const granularity = detectGranularity(rawDates);

  // Heuristic seasonality signal: >12 months of data AND numeric measures exist
  const hasMeasures = profiles.some((p) => p.inferredRole === "measure");
  const hasSeasonalitySignal = (spanDays ?? 0) > 365 && hasMeasures;

  // Build hierarchy relationships between sibling date columns
  const DATE_HIERARCHY = ["year", "quarter", "month", "week", "day"];
  for (let i = 0; i < dateProfiles.length - 1; i++) {
    const a = dateProfiles[i];
    const b = dateProfiles[i + 1];
    const aLevel = DATE_HIERARCHY.findIndex((l) => a.name.toLowerCase().includes(l));
    const bLevel = DATE_HIERARCHY.findIndex((l) => b.name.toLowerCase().includes(l));

    if (aLevel !== -1 && bLevel !== -1 && aLevel < bLevel) {
      relationships.push({
        fromColumn: a.name,
        toColumn: b.name,
        relationshipType: "date_hierarchy",
        confidence: 0.8,
        rationale: `"${a.name}" (coarser period) → "${b.name}" (finer period): natural date drill-down hierarchy.`,
      });
    }
  }

  // Relationship from primary date to secondary date columns
  const secondary = dateProfiles.filter((p) => p.name !== primary.name);
  for (const sec of secondary) {
    relationships.push({
      fromColumn: primary.name,
      toColumn: sec.name,
      relationshipType: "date_hierarchy",
      confidence: 0.65,
      rationale: `"${sec.name}" is a secondary date column that may represent a different event in the same business process (e.g., order date vs delivery date).`,
    });
  }

  const timeIntelligence: TimeIntelligence = {
    primaryDateColumn: primary.name,
    granularity,
    hasSeasonalitySignal,
    dateRangeStart,
    dateRangeEnd,
    spanDays,
    secondaryDateColumns: secondary.map((p) => p.name),
  };

  return { relationships, timeIntelligence };
}

// ---------------------------------------------------------------------------
// Geographic Hierarchy Detection
// ---------------------------------------------------------------------------

const GEO_LEVELS = [
  { level: "continent", pattern: /continent|region(?!al)/i },
  { level: "country", pattern: /country|nation/i },
  { level: "state", pattern: /state|province|oblast/i },
  { level: "city", pattern: /city|town|municipality/i },
  { level: "district", pattern: /district|county|borough/i },
  { level: "zip", pattern: /zip|postal|pincode|postcode/i },
];

export function detectGeoHierarchies(profiles: ColumnProfile[]): ColumnRelationship[] {
  const relationships: ColumnRelationship[] = [];

  const geoProfiles: Array<{ profile: ColumnProfile; level: number }> = [];
  for (const p of profiles) {
    const idx = GEO_LEVELS.findIndex((g) => g.pattern.test(p.name));
    if (idx !== -1) geoProfiles.push({ profile: p, level: idx });
  }

  geoProfiles.sort((a, b) => a.level - b.level);

  for (let i = 0; i < geoProfiles.length - 1; i++) {
    const parent = geoProfiles[i];
    const child = geoProfiles[i + 1];
    relationships.push({
      fromColumn: parent.profile.name,
      toColumn: child.profile.name,
      relationshipType: "geo_hierarchy",
      confidence: 0.8,
      rationale: `"${parent.profile.name}" (broader geography) → "${child.profile.name}" (narrower geography): natural geographic drill-down hierarchy.`,
    });
  }

  return relationships;
}

// ---------------------------------------------------------------------------
// Measure–Dimension Relationship Detection
// ---------------------------------------------------------------------------

/**
 * Links fact/measure columns to the dimension columns that contextualise them.
 * Example: "Revenue" is analysable by "Region", "Category", "Date" — these
 * measure-dimension links drive intelligent chart generation in EDA.
 */
export function detectMeasureDimensionLinks(
  profiles: ColumnProfile[],
  intelligence: Record<string, ColumnIntelligence>,
): ColumnRelationship[] {
  const relationships: ColumnRelationship[] = [];

  const measures = profiles.filter((p) => intelligence[p.name]?.schemaRole === "fact_measure");
  const dimensions = profiles.filter(
    (p) =>
      intelligence[p.name]?.schemaRole === "dimension_attribute" ||
      intelligence[p.name]?.schemaRole === "date_key",
  );

  // Link each measure to each dimension (cross product, bounded)
  for (const m of measures.slice(0, 4)) {
    for (const d of dimensions.slice(0, 8)) {
      relationships.push({
        fromColumn: m.name,
        toColumn: d.name,
        relationshipType: "measure_dimension",
        confidence: 0.7,
        rationale: `"${m.name}" can be analysed across "${d.name}" — standard fact-to-dimension analytical relationship.`,
      });
    }
  }

  return relationships;
}

// ---------------------------------------------------------------------------
// Lookup Column Detection
// ---------------------------------------------------------------------------

/**
 * Detects code-label pairs: columns where one column is a short code
 * and another is a descriptive label for the same entity.
 * Example: "product_code" → "product_name"
 */
export function detectLookupRelationships(profiles: ColumnProfile[]): ColumnRelationship[] {
  const relationships: ColumnRelationship[] = [];
  const CODE_RE = /\b(code|id|key|num|no|ref|sku)\b/i;
  const LABEL_RE = /\b(name|label|title|description|desc|text)\b/i;

  for (const codeCol of profiles.filter((p) => CODE_RE.test(p.name))) {
    // Extract prefix of the code column (e.g., "product" from "product_code")
    const prefix = codeCol.name
      .toLowerCase()
      .replace(CODE_RE, "")
      .replace(/[_\-\s]+/g, "")
      .trim();

    if (!prefix) continue;

    const labelCol = profiles.find(
      (p) =>
        p.name !== codeCol.name &&
        p.name.toLowerCase().includes(prefix) &&
        LABEL_RE.test(p.name),
    );

    if (labelCol) {
      relationships.push({
        fromColumn: codeCol.name,
        toColumn: labelCol.name,
        relationshipType: "lookup",
        confidence: 0.8,
        rationale: `"${codeCol.name}" appears to be a code that maps to the descriptive label "${labelCol.name}" — a lookup / code-to-name relationship.`,
      });
    }
  }

  return relationships;
}

// ---------------------------------------------------------------------------
// Master orchestrator
// ---------------------------------------------------------------------------

/**
 * Runs all relationship discovery engines and returns a deduplicated,
 * confidence-sorted list of ColumnRelationship objects.
 */
export function discoverAllRelationships(
  profiles: ColumnProfile[],
  intelligence: Record<string, ColumnIntelligence>,
  rows: Record<string, unknown>[],
): {
  relationships: ColumnRelationship[];
  timeIntelligence: TimeIntelligence | null;
} {
  const pks = detectPrimaryKeys(profiles);
  const fks = detectForeignKeys(profiles, pks);
  const { relationships: dateRels, timeIntelligence } = detectDateHierarchies(profiles, rows);
  const geoRels = detectGeoHierarchies(profiles);
  const mdRels = detectMeasureDimensionLinks(profiles, intelligence);
  const lookupRels = detectLookupRelationships(profiles);

  // Merge and deduplicate (same fromColumn + toColumn + type → keep highest confidence)
  const all = [...pks, ...fks, ...dateRels, ...geoRels, ...mdRels, ...lookupRels];
  const seen = new Map<string, ColumnRelationship>();
  for (const r of all) {
    const key = `${r.fromColumn}|${r.toColumn}|${r.relationshipType}`;
    const existing = seen.get(key);
    if (!existing || r.confidence > existing.confidence) {
      seen.set(key, r);
    }
  }

  const relationships = Array.from(seen.values()).sort((a, b) => b.confidence - a.confidence);

  return { relationships, timeIntelligence };
}

// ---------------------------------------------------------------------------
// Internal utilities
// ---------------------------------------------------------------------------

function toDate(val: unknown): Date | null {
  if (val instanceof Date && !isNaN(val.getTime())) return val;
  if (typeof val === "string" || typeof val === "number") {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

function detectGranularity(dates: Date[]): TimeIntelligence["granularity"] {
  if (dates.length < 2) return "day";

  // Compute median gap between consecutive dates in days
  const gaps: number[] = [];
  for (let i = 1; i < Math.min(dates.length, 100); i++) {
    gaps.push((dates[i].getTime() - dates[i - 1].getTime()) / 86_400_000);
  }
  gaps.sort((a, b) => a - b);
  const medianGap = gaps[Math.floor(gaps.length / 2)] ?? 1;

  if (medianGap < 2) return "day";
  if (medianGap < 9) return "week";
  if (medianGap < 35) return "month";
  if (medianGap < 100) return "quarter";
  return "year";
}
