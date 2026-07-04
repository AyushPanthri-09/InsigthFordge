/**
 * Business Context Engine
 * -----------------------
 * Responsible for inferring the business domain, purpose, primary entities,
 * key processes, and important metrics from raw dataset metadata.
 *
 * Design principles:
 *  - Single responsibility: only domain/context inference, never data mutation.
 *  - Explainable: every inference carries a confidence score and rationale.
 *  - Extensible: add new domain descriptors without touching any other module.
 *  - No external dependencies: pure TypeScript, no AI calls (AI enriches later).
 */

import type { BusinessDomain, BusinessProcess } from "../types";

// ---------------------------------------------------------------------------
// Domain Descriptor Registry
// ---------------------------------------------------------------------------

/**
 * Each domain descriptor defines:
 *  - `terms`: keyword signals found in column names
 *  - `valueTerms`: keyword signals found in sample values
 *  - `processName`: the core business process this domain runs
 *  - `coreEntities`: the primary business objects typically present
 *  - `kpiHints`: KPI names commonly relevant to this domain
 */
interface DomainDescriptor {
  domain: BusinessDomain;
  terms: string[];
  valueTerms: string[];
  processName: string;
  coreEntities: string[];
  kpiHints: string[];
  purposeTemplate: string;
}

const DOMAIN_REGISTRY: DomainDescriptor[] = [
  {
    domain: "ecommerce",
    terms: [
      "order",
      "product",
      "customer",
      "cart",
      "checkout",
      "sku",
      "price",
      "quantity",
      "discount",
      "coupon",
      "refund",
      "return",
      "shipping",
      "payment",
      "invoice",
      "purchase",
      "item",
      "catalog",
    ],
    valueTerms: ["pending", "shipped", "delivered", "cancelled", "refunded", "processing"],
    processName: "Order-to-Cash",
    coreEntities: ["Customer", "Order", "Product", "Payment"],
    kpiHints: ["Revenue", "AOV", "Conversion Rate", "Cart Abandonment", "Refund Rate", "CLV"],
    purposeTemplate:
      "Track and analyze online transactions, customer purchasing behaviour, and product performance.",
  },
  {
    domain: "retail",
    terms: [
      "store",
      "branch",
      "shelf",
      "pos",
      "transaction",
      "receipt",
      "barcode",
      "category",
      "supplier",
      "inventory",
      "stock",
      "upc",
      "margin",
      "markup",
    ],
    valueTerms: ["in-stock", "out-of-stock", "clearance", "markdown"],
    processName: "Procure-to-Sell",
    coreEntities: ["Store", "Product", "Transaction", "Category"],
    kpiHints: [
      "Same-Store Sales",
      "Inventory Turnover",
      "Gross Margin",
      "Shrinkage",
      "Sell-Through Rate",
    ],
    purposeTemplate:
      "Monitor retail sales performance, inventory health, and category profitability.",
  },
  {
    domain: "finance",
    terms: [
      "revenue",
      "profit",
      "expense",
      "cost",
      "budget",
      "forecast",
      "gl",
      "ledger",
      "account",
      "debit",
      "credit",
      "balance",
      "accrual",
      "amortization",
      "depreciation",
      "cashflow",
      "cash_flow",
      "ebitda",
    ],
    valueTerms: ["income", "expense", "asset", "liability", "equity"],
    processName: "Record-to-Report",
    coreEntities: ["Account", "Transaction", "Period", "CostCenter"],
    kpiHints: [
      "Net Revenue",
      "Gross Margin",
      "EBITDA",
      "Operating Expense Ratio",
      "Budget Variance",
    ],
    purposeTemplate:
      "Analyse financial performance, track budget vs actuals, and support period-end reporting.",
  },
  {
    domain: "banking",
    terms: [
      "loan",
      "emi",
      "interest",
      "deposit",
      "withdraw",
      "account_number",
      "ifsc",
      "npa",
      "default",
      "collateral",
      "kyc",
      "aml",
      "transaction_id",
      "branch_code",
      "swift",
    ],
    valueTerms: ["active", "closed", "defaulted", "npa", "sanctioned"],
    processName: "Loan-to-Collection",
    coreEntities: ["Customer", "Account", "Loan", "Branch"],
    kpiHints: [
      "NPA Ratio",
      "Loan Disbursement",
      "Collection Efficiency",
      "Interest Income",
      "CASA Ratio",
    ],
    purposeTemplate:
      "Monitor loan portfolio quality, transaction activity, and branch performance.",
  },
  {
    domain: "healthcare",
    terms: [
      "patient",
      "diagnosis",
      "treatment",
      "doctor",
      "hospital",
      "admission",
      "discharge",
      "prescription",
      "icd",
      "procedure",
      "claim",
      "insurance",
      "ward",
      "bed",
      "visit",
      "appointment",
    ],
    valueTerms: ["inpatient", "outpatient", "admitted", "discharged", "critical"],
    processName: "Patient-Care-Cycle",
    coreEntities: ["Patient", "Doctor", "Diagnosis", "Treatment"],
    kpiHints: ["Avg Length of Stay", "Readmission Rate", "Bed Occupancy", "Claim Approval Rate"],
    purposeTemplate: "Track patient outcomes, clinical operations, and healthcare cost management.",
  },
  {
    domain: "hr",
    terms: [
      "employee",
      "salary",
      "department",
      "hire",
      "manager",
      "tenure",
      "performance",
      "attrition",
      "resignation",
      "headcount",
      "payroll",
      "grade",
      "band",
      "leave",
      "appraisal",
      "designation",
    ],
    valueTerms: ["active", "resigned", "terminated", "on-leave", "probation"],
    processName: "Hire-to-Retire",
    coreEntities: ["Employee", "Department", "Role", "Manager"],
    kpiHints: [
      "Attrition Rate",
      "Avg Tenure",
      "Headcount",
      "Salary Band Distribution",
      "Time-to-Hire",
    ],
    purposeTemplate:
      "Analyse workforce composition, attrition drivers, and compensation structures.",
  },
  {
    domain: "marketing",
    terms: [
      "campaign",
      "channel",
      "ctr",
      "impressions",
      "conversion",
      "spend",
      "lead",
      "acquisition",
      "roas",
      "cpa",
      "cpm",
      "click",
      "ad",
      "email",
      "open_rate",
      "bounce",
      "utm",
      "source",
      "medium",
    ],
    valueTerms: ["email", "social", "paid", "organic", "referral", "direct"],
    processName: "Lead-to-Customer",
    coreEntities: ["Campaign", "Channel", "Lead", "Audience"],
    kpiHints: ["ROAS", "CPA", "CTR", "Conversion Rate", "CAC", "Marketing ROI"],
    purposeTemplate:
      "Evaluate campaign effectiveness, channel ROI, and customer acquisition efficiency.",
  },
  {
    domain: "logistics",
    terms: [
      "shipment",
      "delivery",
      "warehouse",
      "route",
      "carrier",
      "tracking",
      "dispatch",
      "eta",
      "pod",
      "freight",
      "weight",
      "package",
      "manifest",
      "dock",
      "load",
    ],
    valueTerms: ["in-transit", "delivered", "delayed", "returned", "lost"],
    processName: "Ship-to-Deliver",
    coreEntities: ["Shipment", "Route", "Warehouse", "Carrier"],
    kpiHints: ["On-Time Delivery Rate", "Avg Delivery Days", "Cost per Shipment", "Return Rate"],
    purposeTemplate: "Monitor shipment performance, delivery SLAs, and logistics cost efficiency.",
  },
  {
    domain: "saas",
    terms: [
      "user",
      "subscription",
      "mrr",
      "arr",
      "churn",
      "plan",
      "trial",
      "feature",
      "seat",
      "tier",
      "renewal",
      "upgrade",
      "downgrade",
      "session",
      "event",
      "funnel",
    ],
    valueTerms: ["trial", "active", "churned", "cancelled", "paused", "enterprise", "pro", "free"],
    processName: "Trial-to-Revenue",
    coreEntities: ["User", "Subscription", "Plan", "Feature"],
    kpiHints: ["MRR", "ARR", "Churn Rate", "Net Revenue Retention", "Expansion MRR", "DAU/MAU"],
    purposeTemplate:
      "Track subscription growth, churn, user engagement, and product-led revenue expansion.",
  },
  {
    domain: "manufacturing",
    terms: [
      "production",
      "machine",
      "batch",
      "defect",
      "yield",
      "downtime",
      "shift",
      "line",
      "oee",
      "scrap",
      "rework",
      "bom",
      "material",
      "work_order",
      "cycle_time",
    ],
    valueTerms: ["running", "idle", "maintenance", "breakdown", "completed"],
    processName: "Plan-to-Produce",
    coreEntities: ["Machine", "Batch", "Product", "WorkOrder"],
    kpiHints: ["OEE", "Defect Rate", "Yield", "Cycle Time", "Scrap Rate", "Downtime"],
    purposeTemplate: "Monitor production efficiency, equipment performance, and quality metrics.",
  },
  {
    domain: "education",
    terms: [
      "student",
      "course",
      "grade",
      "enrollment",
      "semester",
      "teacher",
      "subject",
      "attendance",
      "marks",
      "exam",
      "pass",
      "fail",
      "cgpa",
    ],
    valueTerms: ["pass", "fail", "absent", "present", "enrolled", "graduated"],
    processName: "Enroll-to-Graduate",
    coreEntities: ["Student", "Course", "Teacher", "Enrollment"],
    kpiHints: ["Pass Rate", "Avg Score", "Attendance Rate", "Dropout Rate", "Enrollment Growth"],
    purposeTemplate:
      "Analyse student performance, course outcomes, and institutional effectiveness.",
  },
  {
    domain: "operations",
    terms: [
      "task",
      "ticket",
      "incident",
      "sla",
      "resolution",
      "priority",
      "escalation",
      "queue",
      "agent",
      "workload",
      "throughput",
    ],
    valueTerms: ["open", "closed", "in-progress", "escalated", "resolved", "pending"],
    processName: "Request-to-Resolution",
    coreEntities: ["Ticket", "Agent", "Queue", "SLA"],
    kpiHints: ["Resolution Rate", "Avg Handle Time", "SLA Breach Rate", "Backlog", "CSAT"],
    purposeTemplate: "Track operational tickets, SLA compliance, and team throughput.",
  },
];

// ---------------------------------------------------------------------------
// Domain Inference
// ---------------------------------------------------------------------------

export interface DomainInferenceResult {
  domain: BusinessDomain;
  confidence: number;
  rationale: string;
  processName: string;
  coreEntities: string[];
  kpiHints: string[];
  purposeTemplate: string;
  /** All domain candidates with their individual scores (for debugging). */
  candidateScores: Array<{ domain: BusinessDomain; score: number }>;
}

/**
 * Infers the business domain from column names and optional sample values.
 *
 * Algorithm:
 *  1. Normalise all column names to lowercase tokens.
 *  2. For each domain descriptor, compute a hit-ratio across its term list.
 *  3. Optionally boost the score using sample value matching.
 *  4. Return the highest-scoring domain; fall back to "generic" if no domain
 *     exceeds the minimum threshold.
 *
 * Why hit-ratio instead of raw count?
 *  - Prevents large term lists from artificially dominating.
 *  - Makes scores comparable across domains with different term list sizes.
 */
export function inferBusinessDomain(
  columns: string[],
  sampleValues: string[] = [],
): DomainInferenceResult {
  const MINIMUM_CONFIDENCE = 0.15; // below this → generic
  const lowerCols = columns.map((c) => c.toLowerCase().replace(/[_\-\s]+/g, " "));
  const colStr = lowerCols.join(" ");
  const valStr = sampleValues.map((v) => String(v).toLowerCase()).join(" ");

  const candidateScores = DOMAIN_REGISTRY.map((desc) => {
    // Column-name hit ratio (primary signal — weight 0.7)
    const colHits = desc.terms.filter((t) => colStr.includes(t)).length;
    const colScore = colHits / desc.terms.length;

    // Sample-value hit ratio (secondary signal — weight 0.3)
    const valHits = desc.valueTerms.filter((t) => valStr.includes(t)).length;
    const valScore = desc.valueTerms.length > 0 ? valHits / desc.valueTerms.length : 0;

    return {
      domain: desc.domain,
      score: colScore * 0.7 + valScore * 0.3,
      raw: {
        colHits,
        valHits,
        colTotal: desc.terms.length,
        valTotal: desc.valueTerms.length,
      },
    };
  });

  const sorted = [...candidateScores].sort((a, b) => b.score - a.score);
  const best = sorted[0];

  if (best.score < MINIMUM_CONFIDENCE) {
    return {
      domain: "generic",
      confidence: 0.3,
      rationale:
        "No strong domain signals found in column names or sample values. Defaulting to generic analysis.",
      processName: "Data-to-Insight",
      coreEntities: [],
      kpiHints: ["Record Count", "Completeness Rate"],
      purposeTemplate: "General-purpose structured dataset analysis.",
      candidateScores: sorted.map(({ domain, score }) => ({ domain, score })),
    };
  }

  const descriptor = DOMAIN_REGISTRY.find((d) => d.domain === best.domain)!;

  // Confidence is bounded at 0.95 to reflect that heuristics cannot be certain.
  const confidence = Math.min(0.95, 0.35 + best.score * 0.65);
  const runnerUp = sorted[1];
  const isAmbiguous = runnerUp && runnerUp.score > best.score * 0.8;

  const rationale = buildDomainRationale(
    descriptor,
    columns,
    best.score,
    isAmbiguous ? runnerUp.domain : undefined,
  );

  return {
    domain: best.domain,
    confidence,
    rationale,
    processName: descriptor.processName,
    coreEntities: descriptor.coreEntities,
    kpiHints: descriptor.kpiHints,
    purposeTemplate: descriptor.purposeTemplate,
    candidateScores: sorted.map(({ domain, score }) => ({ domain, score })),
  };
}

function buildDomainRationale(
  desc: DomainDescriptor,
  columns: string[],
  score: number,
  ambiguousWith?: BusinessDomain,
): string {
  const lc = columns.map((c) => c.toLowerCase());
  const matched = desc.terms.filter((t) => lc.some((c) => c.includes(t))).slice(0, 5);
  let r = `Domain inferred as "${desc.domain}" (score ${(score * 100).toFixed(0)}%) based on column signals: ${matched.join(", ")}.`;
  if (ambiguousWith) {
    r += ` Note: dataset also shows signals for "${ambiguousWith}"; consider providing analyst notes if domain is unclear.`;
  }
  return r;
}

// ---------------------------------------------------------------------------
// Business Process Inference
// ---------------------------------------------------------------------------

/**
 * Infers business processes present in the dataset.
 * A dataset can participate in multiple processes (e.g., an e-commerce dataset
 * may have both Order-to-Cash and Return-to-Refund processes).
 */
export function inferBusinessProcesses(
  columns: string[],
  domain: BusinessDomain,
): BusinessProcess[] {
  const lc = columns.map((c) => c.toLowerCase());
  const processes: BusinessProcess[] = [];

  // Primary process from the domain registry
  const domainDesc = DOMAIN_REGISTRY.find((d) => d.domain === domain);
  if (domainDesc) {
    const relevant = domainDesc.terms
      .filter((t) => lc.some((c) => c.includes(t)))
      .map((t) => columns.find((c) => c.toLowerCase().includes(t)) ?? t)
      .filter(Boolean) as string[];

    if (relevant.length > 0) {
      processes.push({
        name: domainDesc.processName,
        description: domainDesc.purposeTemplate,
        involvedColumns: relevant.slice(0, 8),
        confidence: Math.min(0.95, 0.5 + relevant.length * 0.05),
      });
    }
  }

  // Cross-domain process detection: returns/refunds
  const returnSignals = ["return", "refund", "reversal", "chargeback", "cancellation"];
  const returnCols = columns.filter((c) => returnSignals.some((s) => c.toLowerCase().includes(s)));
  if (returnCols.length >= 2) {
    processes.push({
      name: "Return-to-Refund",
      description: "Handles product returns and financial reversals.",
      involvedColumns: returnCols,
      confidence: 0.7,
    });
  }

  // Cross-domain process detection: time-series / forecasting process
  const hasDate = columns.some((c) => /date|period|month|year|quarter|week/i.test(c));
  const hasMeasure = columns.some((c) => /amount|revenue|sales|quantity|count|total/i.test(c));
  if (hasDate && hasMeasure) {
    processes.push({
      name: "Trend-and-Forecast",
      description: "Time-series analysis to track performance over time and project future values.",
      involvedColumns: columns.filter((c) =>
        /date|period|month|year|quarter|week|amount|revenue|sales/i.test(c),
      ),
      confidence: 0.75,
    });
  }

  return processes;
}

// ---------------------------------------------------------------------------
// Entity Extraction
// ---------------------------------------------------------------------------

/**
 * Extracts primary business entities from column names.
 * Uses noun patterns common in transactional datasets.
 */
export function extractPrimaryEntities(columns: string[], domain: BusinessDomain): string[] {
  const domainDesc = DOMAIN_REGISTRY.find((d) => d.domain === domain);
  const knownEntities = domainDesc?.coreEntities ?? [];

  // Match known entities against column names
  const detected: Set<string> = new Set();
  for (const entity of knownEntities) {
    if (columns.some((c) => c.toLowerCase().includes(entity.toLowerCase()))) {
      detected.add(entity);
    }
  }

  // Generic entity detection from ID columns (e.g. customer_id → Customer)
  const ID_RE = /^(.+?)[\s_-]?id$/i;
  for (const col of columns) {
    const match = ID_RE.exec(col);
    if (match) {
      const entity = capitalise(match[1].replace(/[_-]/g, " ").trim());
      if (entity.length > 1 && entity.length < 30) detected.add(entity);
    }
  }

  return Array.from(detected).slice(0, 6);
}

function capitalise(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

// ---------------------------------------------------------------------------
// KPI Candidate Suggestions
// ---------------------------------------------------------------------------

/**
 * Produces suggested KPIs based on domain + available column profiles.
 * This is a heuristic pre-pass; AI enrichment will refine these later.
 */
export function suggestKPICandidates(
  columns: string[],
  domain: BusinessDomain,
): Array<{ name: string; rationale: string; columns: string[] }> {
  const descriptor = DOMAIN_REGISTRY.find((d) => d.domain === domain);
  if (!descriptor) return [];

  const lc = columns.map((c) => c.toLowerCase());
  const kpis: Array<{ name: string; rationale: string; columns: string[] }> = [];

  // Revenue / amount KPI
  const revenueCol = columns.find((c) => /revenue|amount|sales|total|price/i.test(c));
  if (revenueCol) {
    kpis.push({
      name: "Total Revenue",
      rationale: "Sum of all transaction amounts — primary financial health indicator.",
      columns: [revenueCol],
    });
  }

  // Count-based KPI
  const countCol = columns.find((c) => /count|quantity|units|volume/i.test(c));
  if (countCol) {
    kpis.push({
      name: "Total Volume",
      rationale: "Aggregate units or transactions — operational throughput indicator.",
      columns: [countCol],
    });
  }

  // Date-based KPI
  const dateCol = columns.find((c) => /date|time|period|created|updated/i.test(c));
  if (dateCol && revenueCol) {
    kpis.push({
      name: "Period-over-Period Growth",
      rationale: "Compare revenue across periods to identify trends and seasonality.",
      columns: [dateCol, revenueCol],
    });
  }

  // Domain-specific KPIs from registry hints
  const specificKpis = descriptor.kpiHints.slice(0, 3);
  for (const hint of specificKpis) {
    if (!kpis.some((k) => k.name === hint)) {
      const relatedCols = columns.filter((c) =>
        hint
          .toLowerCase()
          .split(/\s+/)
          .some((word) => c.toLowerCase().includes(word)),
      );
      kpis.push({
        name: hint,
        rationale: `Standard ${descriptor.domain} KPI for monitoring ${descriptor.processName}.`,
        columns: relatedCols.length > 0 ? relatedCols : lc.slice(0, 2),
      });
    }
  }

  return kpis.slice(0, 6);
}
