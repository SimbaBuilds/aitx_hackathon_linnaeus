// ─────────────────────────────────────────────────────────────────────────────
// Anonymizer for public-facing trace strings (demo decision 1a: name-free board).
// The synthesized-board call_log carries LIVE identifiers (client name, people,
// clinics). Every trace string rendered in the UI passes through anonymize()
// first. Curated + ordered (most-specific rules first) — small and auditable,
// which is the safe choice for a public room. The raw run stays the 1c
// proof-on-demand artifact (terminal + JSON), never the public UI.
// ─────────────────────────────────────────────────────────────────────────────

// [pattern, replacement] applied in order. Specific identifiers before generic.
const RULES: Array<[RegExp, string]> = [
  // Surface / identifier map (matches the anonymized demo surfaces).
  [/skmd[_\s-]?wellness/gi, "telehealth_ops"],
  [/skmd_fastapi/gi, "telehealth_api"],
  [/docuspa[_\w]*/gi, "medspa_web"],
  [/nxtyou[_\w]*/gi, "d2c_web"],
  [/\bskmd\b/gi, "Telehealth Monorepo"],
  // Curated person / client redaction (known org names → [redacted]).
  [/\b(dr\.?\s+)?(sunil\s+)?kurup\b/gi, "[redacted]"],
  [/\bsunil\b/gi, "[redacted]"],
  [/\bthrive(\s+vitality)?\b/gi, "[redacted]"],
  [/\bsnow\b/gi, "[redacted]"],
  [/\btony\b/gi, "[redacted]"],
];

/** Replace live identifiers/person names with anonymized/redacted equivalents. */
export function anonymize(s: string | null | undefined): string {
  if (!s) return "";
  let out = s;
  for (const [re, rep] of RULES) out = out.replace(re, rep);
  return out;
}
