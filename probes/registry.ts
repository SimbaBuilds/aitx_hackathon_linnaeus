// ─────────────────────────────────────────────────────────────────────────────
// WS-B — The hackathon probe battery (registry).
// 4 universal (hardcoded instance) + 1 synthesized (authored against the target).
// Mirrors the battery in friction_measurement_spec.md / probe_lifecycle.md and
// the probe ids in fixtures/demo.json.
// ─────────────────────────────────────────────────────────────────────────────

import type { ProbeDefinition, CheckpointContext } from "./types";

/** Lowercased haystack of a tool result (data + note) for cheap semantic checks. */
function hay(ctx: CheckpointContext): string {
  const { result } = ctx;
  let data = "";
  try {
    data = typeof result.data === "string" ? result.data : JSON.stringify(result.data ?? "");
  } catch {
    data = String(result.data ?? "");
  }
  return `${data} ${result.note ?? ""}`.toLowerCase();
}

/** Checkpoint = an OK tool result whose payload matches the probe's key artifact. */
function okMatch(ctx: CheckpointContext, re: RegExp): boolean {
  return ctx.result.ok === true && re.test(hay(ctx));
}

// ── Universal probes ─────────────────────────────────────────────────────────

const authBoundary: ProbeDefinition = {
  id: "auth-boundary",
  category: "auth-boundary",
  kind: "universal",
  instanceSpec: null,
  systemPrompt:
    "You are auditing an unfamiliar codebase. Use the provided surface tools to " +
    "read and search the repo. Be precise and cite the files you rely on.",
  userPrompt: () =>
    "Find where authentication/authorization is enforced in this system and " +
    "describe the boundary: which layer enforces it, and how a request is rejected.",
  reachedCheckpoint: (ctx) =>
    okMatch(ctx, /\bauth|middleware|guard|permission|session|jwt|rbac\b/),
  didProbeSucceed: (ctx) => ctx.checkpointReached,
  failureTag: "missing-doc",
  completedTag: "none",
};

const designerContribute: ProbeDefinition = {
  id: "designer-contribute",
  category: "can-a-designer-contribute",
  kind: "universal",
  instanceSpec: null,
  systemPrompt:
    "You are a designer (non-engineer) contributing a small change on day one, " +
    "using ONLY what is documented in the repo. Do not assume tribal knowledge.",
  userPrompt: () =>
    "Make a designer-scoped styling/component change following the repo's " +
    "conventions and design tokens. First locate the component conventions and " +
    "the design-token reference you must follow.",
  reachedCheckpoint: (ctx) =>
    okMatch(ctx, /design[-_ ]?token|component convention|claude\.md|style guide|review\.md/),
  didProbeSucceed: (ctx) => ctx.checkpointReached,
  failureTag: "missing-doc",
  completedTag: "none",
};

const liveVsLegacyPdf: ProbeDefinition = {
  id: "live-vs-legacy-pdf",
  category: "live-vs-legacy",
  kind: "universal",
  instanceSpec: null,
  systemPrompt:
    "You are auditing an unfamiliar codebase for dead vs. live code paths. Use " +
    "the surface tools to trace imports and call sites before concluding.",
  userPrompt: () =>
    "Classify the prescription-PDF generation path: is it live (wired to a route/" +
    "job) or legacy/orphaned (generated, never called)? Show the call sites that " +
    "justify your classification.",
  // Checkpoint = confirming whether the path is referenced anywhere (call-site proof).
  reachedCheckpoint: (ctx) =>
    okMatch(ctx, /call site|imported by|referenced by|route|no references|orphan/),
  didProbeSucceed: (ctx) => ctx.checkpointReached,
  failureTag: "dead-code",
  completedTag: "none",
};

const onboardClient: ProbeDefinition = {
  id: "onboard-client",
  category: "onboard-a-client",
  kind: "universal",
  instanceSpec: null,
  systemPrompt:
    "You are onboarding a new client end-to-end across the org's surfaces (repo, " +
    "email, drive, database). Follow the actual workflow; note any missing step.",
  userPrompt: () =>
    "Onboard a new client end-to-end: create the client record, wire the required " +
    "config, and confirm the steps needed to make them billable.",
  reachedCheckpoint: (ctx) =>
    okMatch(ctx, /client (created|record)|onboard|provision|created client|new client id/),
  didProbeSucceed: (ctx) => ctx.checkpointReached,
  failureTag: "missing-doc",
  // Completes, but the workflow lives in someone's head — no written runbook.
  completedTag: "no-runbook",
};

// ── Synthesized probe ────────────────────────────────────────────────────────

const billingRegression: ProbeDefinition = {
  id: "billing-regression",
  category: "billing-regression",
  kind: "synthesized",
  instanceSpec: null, // authored against the target before the loop
  systemPrompt:
    "You are computing this month's client invoices from usage data. Find the " +
    "billing script and apply the correct per-client pricing scope.",
  userPrompt: (spec) =>
    spec ??
    "Compute this month's client invoices from usage across all client scopes.",
  authoringPrompt:
    "Explore the target to author a concrete billing probe: locate the monthly " +
    "billing script and identify the client-scope distinction it prices (e.g. " +
    "medspa vs. D2C). Reply with a one-sentence concrete task instance the auditor " +
    "should run, or reply exactly 'CANNOT_AUTHOR' if you cannot find the script " +
    "or the scope distinction.",
  // The correct move is COMPUTING invoices across the live client scope — not
  // merely finding the (possibly stale) script. Finding the script is progress,
  // but only priced/computed invoices satisfy the criterion.
  reachedCheckpoint: (ctx) =>
    okMatch(ctx, /invoice.*comput|comput.*invoice|invoice total|priced all clients|billing complete/),
  didProbeSucceed: (ctx) => ctx.checkpointReached,
  failureTag: "stale-code",
  completedTag: "none",
};

// ── Billing coverage (demo probe for the before/after regression) ─────────────
// Code-coverage framing: repo-only answerable. The candle traces the invoice
// script and ends with a STRUCTURED verdict ("COVERAGE: COMPLETE" | "COVERAGE:
// GAP - …") that drives success — so the model's honest read of the code decides,
// not keyword-guessing. Run twice with scoped instances (medspa vs. +D2C): the
// medspa scope has a code path → COMPLETE; the D2C scope has none → GAP → stall.
const billingCoverage: ProbeDefinition = {
  id: "billing-coverage",
  category: "billing-regression",
  kind: "universal", // instance is supplied explicitly per run (no authoring)
  instanceSpec: null,
  systemPrompt:
    "You audit whether the monthly invoice-generation code contains a PRICING " +
    "PATH for each client type in a requested scope. Use the repo tools to search " +
    "and read the billing/invoice code. A client type is COVERED only if you find " +
    "the specific code that computes its invoice — grep for it; do not assume. You " +
    "do NOT need to verify every edge case, only whether a pricing code path " +
    "EXISTS for each requested client type. Be efficient (a few targeted searches/" +
    "reads). Finish your final message with EXACTLY one line: 'COVERAGE: COMPLETE' " +
    "if every client type in the requested scope has a pricing code path, or " +
    "'COVERAGE: GAP - <client type(s) with no pricing code path>' otherwise.",
  userPrompt: (spec) =>
    spec ?? "Does a pricing code path exist for every client in the current book of business?",
  reachedCheckpoint: (ctx) =>
    okMatch(ctx, /invoice|billing|pricing|generate_skmd_monthly_invoice/),
  didProbeSucceed: (ctx) => {
    const text = ctx.messages
      .filter((m) => m.role === "assistant")
      .map((m) => m.content ?? "")
      .join("\n");
    const complete = /COVERAGE:\s*COMPLETE/i.test(text);
    const gap = /COVERAGE:\s*GAP/i.test(text);
    return complete && !gap; // full coverage only; any reported gap = a stall
  },
  failureTag: "stale-code", // an uncovered scope = the billing code is stale for it
  completedTag: "none",
};

export const PROBE_REGISTRY: Record<string, ProbeDefinition> = {
  [authBoundary.id]: authBoundary,
  [designerContribute.id]: designerContribute,
  [liveVsLegacyPdf.id]: liveVsLegacyPdf,
  [onboardClient.id]: onboardClient,
  [billingRegression.id]: billingRegression,
  [billingCoverage.id]: billingCoverage,
};

/** The default hackathon battery order (4 universal + 1 synthesized). */
export const BATTERY_IDS: string[] = [
  authBoundary.id,
  designerContribute.id,
  liveVsLegacyPdf.id,
  onboardClient.id,
  billingRegression.id,
];

export function getProbe(id: string): ProbeDefinition {
  const p = PROBE_REGISTRY[id];
  if (!p) throw new Error(`Unknown probe id: ${id}`);
  return p;
}
