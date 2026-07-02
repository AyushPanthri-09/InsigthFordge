const ARTIFACT_REPLACEMENTS: Array<[RegExp, string]> = [
  [
    /<table[\s\S]*?<\/table>/gi,
    "Structured table rendered in the evidence section.",
  ],
  [/<thead[\s\S]*?<\/thead>/gi, " "],
  [/<tbody[\s\S]*?<\/tbody>/gi, " "],
  [/<tr[\s\S]*?<\/tr>/gi, " "],
  [/image\[\[[^\]]*\]\]/gi, ""],
  [
    /<\/?(table|thead|tbody|tr|th|td|div|span|p|br|strong|em|ul|ol|li|h[1-6])[^>]*>/gi,
    " ",
  ],
  [/```[\s\S]*?```/g, " "],
  [/`([^`]+)`/g, "$1"],
  [/\*\*([^*]+)\*\*/g, "$1"],
  [/\*([^*]+)\*/g, "$1"],
  [/__([^_]+)__/g, "$1"],
  [/_([^_]+)_/g, "$1"],
  [/\[([^\]]+)\]\([^)]+\)/g, "$1"],
  [/&nbsp;/gi, " "],
  [/&amp;/gi, "&"],
  [/&lt;/gi, "<"],
  [/&gt;/gi, ">"],
  [/&quot;/gi, '"'],
  [/&#39;/gi, "'"],
];

const BLOCKED_PHRASES: Array<[RegExp, string]> = [
  [
    /AI reasoning is temporarily unavailable\.?/gi,
    "Deterministic business readiness assessment generated from available dataset evidence.",
  ],
  [/AI reasoning unavailable/gi, "Deterministic reasoning mode active"],
  [
    /AI multi-hypothesis reasoning unavailable/gi,
    "Multi-factor deterministic assessment used for this run",
  ],
  [
    /Re-run analysis once the AI reasoning engine is reachable/gi,
    "Validate the deterministic findings with domain owners and rerun enrichment when additional context is available",
  ],
  [/No data/gi, "Readiness inputs not yet sufficient"],
  [/Unavailable/gi, "Readiness gated"],
  [/Insufficient Data/gi, "Readiness inputs limited"],
];

export function sanitizeReportText(value: string): string {
  let text = value;

  for (const [pattern, replacement] of ARTIFACT_REPLACEMENTS) {
    text = text.replace(pattern, replacement);
  }

  for (const [pattern, replacement] of BLOCKED_PHRASES) {
    text = text.replace(pattern, replacement);
  }

  return text.replace(/\s+/g, " ").trim();
}

export function sanitizeReportValue<T>(value: T): T {
  if (typeof value === "string") {
    return sanitizeReportText(value) as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeReportValue(item)) as T;
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value).map(([key, entry]) => [
      key,
      sanitizeReportValue(entry),
    ]);
    return Object.fromEntries(entries) as T;
  }

  return value;
}
