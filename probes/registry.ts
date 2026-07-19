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

// ── Synthesized org-level board (measurement of Frontier-Factor proposals) ────
// These three were PROPOSED by the synthesis pass (results/synthesized_probes_*.md)
// grounded in SKMD's repo + mailbox. This is the MEASUREMENT half: Nemotron runs
// them as single-shot snapshots (no before/after) → the heatmap + findings board.
// Each ends in a STRUCTURED VERDICT line (the billing-coverage pattern Nemotron
// handled cleanly) so an honest read of the evidence — not keyword luck — decides
// completed vs. stalled. Instances are baked (kind: universal) since synthesis
// already authored them; no runtime authoring gate.
//
// TWO are surface-forcing (unanswerable from the repo alone → the candle MUST
// open Gmail to make progress), ONE is a repo-only contrast.

// #8 — Sign-off ownership for a clinical/protocol change. The authority (Tony /
// Dr. Kurup) exists only in ad-hoc email + request*.md, never in a committed
// CODEOWNERS/OWNERS record → the honest verdict is UNDOCUMENTED → stall/no-owner.
// Surface-forcing: the name only surfaces if the candle searches Gmail.
const synthOwnershipMap: ProbeDefinition = {
  id: "synth-ownership-map",
  category: "no-owner-clinical-signoff",
  kind: "universal",
  instanceSpec: null,
  systemPrompt:
    "You must identify the AUTHORITATIVE sign-off owner for a clinical/protocol " +
    "change in this org. Search the repo (look for CODEOWNERS, OWNERS, docs/, any " +
    "committed ownership record) AND the org email — decision authority in this org " +
    "often lives only in email. A person counts as a COMMITTED owner ONLY if a " +
    "version-controlled file names them as the approver; a name found only in email " +
    "or an ad-hoc request markdown does NOT count as committed ownership. In THIS org " +
    "the approving authority is named only in email, never in the repo, so you MUST " +
    "run at least one gmail_search (e.g. for the medical director, standing orders, or " +
    "protocol/pricing approver) BEFORE you may answer UNDOCUMENTED — do not conclude " +
    "from the repo alone. Finding the name in email STILL counts as UNDOCUMENTED (email " +
    "is not a committed ownership record), but you must actually look. Finish your " +
    "final message with EXACTLY one line: 'OWNER: <name> — source: <committed file " +
    "path>' if a committed record establishes the approver, or 'OWNER: UNDOCUMENTED — " +
    "<where the name actually lives>' otherwise.",
  userPrompt: () =>
    "Who must review/approve a change to the clinical protocol / contraindication & " +
    "stacking rules (e.g. a new standing order)? Name the sign-off authority and cite " +
    "the committed source that establishes their authority.",
  reachedCheckpoint: (ctx) =>
    okMatch(ctx, /codeowners|owner|approve|sign[- ]?off|protocol|standing order|medical director|kurup/),
  didProbeSucceed: (ctx) => {
    const verdict =
      ctx.messages
        .filter((m) => m.role === "assistant")
        .map((m) => m.content ?? "")
        .join("\n")
        .match(/OWNER:.*/i)?.[0] ?? "";
    if (!verdict || /OWNER:\s*UNDOCUMENTED/i.test(verdict)) return false;
    // A name is only a COMPLETION if its cited source is a genuine committed
    // ownership record — NOT email, and NOT an ad-hoc request*.md (both explicitly
    // excluded by the probe definition). No such record exists in this org, so an
    // honest verdict stalls → no-owner; the Gmail search still happened (the journey).
    const committedRecord = /codeowners|owners\.(md|txt|yml|yaml)|ownership\b|governance/i.test(verdict);
    const tribalSource = /email|gmail|thread|inbox|\bmail\b|request\d|ad[- ]?hoc/i.test(verdict);
    return committedRecord && !tribalSource;
  },
  failureTag: "no-owner",
  completedTag: "none",
};

// #2 — Fleet-wide rollout of the weekly batched-billing fix for chronic Stripe
// decliners. A data-backed recommendation exists; a one-off manual fix was applied
// to two clinics via email — but no owned, tracked rollout exists → UNOWNED →
// stall/no-owner. Surface-forcing: the only evidence of the decision is a Gmail thread.
const synthBillingRollout: ProbeDefinition = {
  id: "synth-billing-rollout",
  category: "no-owner-billing-rollout",
  kind: "universal",
  instanceSpec: null,
  systemPrompt:
    "You are rolling out a known billing fix fleet-wide. A data-backed recommendation " +
    "exists to switch chronic Stripe-decline clinics to the weekly batched-billing path " +
    "(organizations.payment_timing = 'weekly'). Determine WHO owns the fleet-wide rollout " +
    "and whether a TRACKED task/ticket exists for it — search the repo (implementation_" +
    "plans/, temp_docs/) AND the org email. The only record of this rollout decision in " +
    "THIS org is an email thread, so you MUST run at least one gmail_search (e.g. for the " +
    "billing/suspension discussion or the affected clinic names) BEFORE you may answer " +
    "UNOWNED — do not conclude from the repo alone. An ad-hoc manual fix applied to a couple " +
    "of named clinics via email does NOT count as an owned, tracked rollout. Finish your " +
    "final message with EXACTLY one line: 'ROLLOUT: OWNED — <owner or ticket/plan>' if an " +
    "owned tracked rollout exists, or 'ROLLOUT: UNOWNED — <what exists instead>' otherwise.",
  userPrompt: () =>
    "Switch all chronic-decline medspa clinics to the weekly batched-billing path. Who " +
    "owns this fleet-wide rollout and where is it tracked?",
  reachedCheckpoint: (ctx) =>
    okMatch(ctx, /payment_timing|batched|weekly|decline|rollout|suspension|thrive|snow/),
  didProbeSucceed: (ctx) => {
    const text = ctx.messages
      .filter((m) => m.role === "assistant")
      .map((m) => m.content ?? "")
      .join("\n");
    return /ROLLOUT:\s*OWNED/i.test(text) && !/ROLLOUT:\s*UNOWNED/i.test(text);
  },
  failureTag: "no-owner",
  completedTag: "none",
};

// #4 — nxtyou provider flag: schema + query support exist, but nothing SETS the
// flag and the queue code doesn't branch on it → half-wired feature → GAP →
// stall/dead-code. Repo-only CONTRAST (so the board isn't all-email).
const synthNxtyouWiring: ProbeDefinition = {
  id: "synth-nxtyou-wiring",
  category: "dead-code-nxtyou-flag",
  kind: "universal",
  instanceSpec: null,
  systemPrompt:
    "Determine whether a feature is fully wired end-to-end. The column " +
    "users.is_nxtyou_provider exists in the schema and find_available_providers already " +
    "filters on it. Verify there is an actual admin toggle or API endpoint that SETS the " +
    "flag, AND that the patient waiting-queue code branches on it. Trace the code with " +
    "targeted searches; do not assume it works because the column exists. Finish your " +
    "final message with EXACTLY one line: 'WIRING: COMPLETE — <the endpoint/UI that sets " +
    "the flag>' if a reachable path sets it, or 'WIRING: GAP — <what is missing>' otherwise.",
  userPrompt: () =>
    "Turn on NxtYou provider access for a provider so they start seeing NxtYou patients " +
    "in their queue. Find the admin toggle or API endpoint that sets users.is_nxtyou_provider.",
  reachedCheckpoint: (ctx) =>
    okMatch(ctx, /is_nxtyou_provider|find_available_providers|nxtyou|provider.?portal|on_demand/),
  didProbeSucceed: (ctx) => {
    const text = ctx.messages
      .filter((m) => m.role === "assistant")
      .map((m) => m.content ?? "")
      .join("\n");
    return /WIRING:\s*COMPLETE/i.test(text) && !/WIRING:\s*GAP/i.test(text);
  },
  failureTag: "dead-code",
  completedTag: "none",
};

// ── Henry probe: can an agent take a user bug report all the way to a fix? ────
// The codebase-side analog of the billing regression — it measures the operability
// of the DEV workflow: report → locate → root-cause → proposed fix. READ-ONLY
// (stops at the proposed diff; never opens a PR — L15/scope). Backed by a REAL
// production run of this exact flow via SKMD's Quo→Juniper→Claude Code pipeline
// (henry_quo_e2e.PNG: "found root cause of Henry's misleading clearance-approval
// error … pushed to claude/practical-johnson-480669"). The probe measures the
// friction that stood in the way; the screenshot proves the org can actually close
// it. NOT in BATTERY_IDS (keeps the banked 5-probe board intact); run explicitly:
//   npx tsx scripts/run-audit.ts report-to-pr
const reportToPr: ProbeDefinition = {
  id: "report-to-pr",
  category: "report-to-pr",
  kind: "universal",
  instanceSpec: null,
  systemPrompt:
    "You are an on-call engineer receiving a bug report from a NON-TECHNICAL user " +
    "and driving it toward a fix. Use the repo surface tools to locate the code, " +
    "reason about the logic, and identify the root cause. You are READ-ONLY: you " +
    "PROPOSE a fix, you do NOT modify or push anything. Cite the exact files you " +
    "rely on. Finish your final message with EXACTLY one line: " +
    "'FIX-READY: <file>:<symbol> — <one-line change>' if you located a concrete " +
    "fix, or 'BLOCKED: <what stopped you>' if you could not get from the report to code.",
  userPrompt: () =>
    'A client (Henry) reported via the Quo business-messaging inbox: "I tried to ' +
    'approve a peptide clearance and got an error saying the approval FAILED — but ' +
    'it looks like it actually went through." Trace this to the code: find where the ' +
    "clearance-approval flow emits that message, determine why the error is " +
    "misleading (the mismatch between the shown status and the real outcome), and " +
    "propose a specific fix.",
  reachedCheckpoint: (ctx) =>
    okMatch(ctx, /clearance|approv|peptide|error|exception|raise|throw|status/),
  didProbeSucceed: (ctx) => {
    const text = ctx.messages
      .filter((m) => m.role === "assistant")
      .map((m) => m.content ?? "")
      .join("\n");
    return /FIX-READY:/i.test(text) && !/BLOCKED:/i.test(text);
  },
  failureTag: "missing-doc", // no mapping from a user-facing error → the code that emits it
  completedTag: "none",
};

export const PROBE_REGISTRY: Record<string, ProbeDefinition> = {
  [authBoundary.id]: authBoundary,
  [designerContribute.id]: designerContribute,
  [liveVsLegacyPdf.id]: liveVsLegacyPdf,
  [onboardClient.id]: onboardClient,
  [billingRegression.id]: billingRegression,
  [billingCoverage.id]: billingCoverage,
  [synthOwnershipMap.id]: synthOwnershipMap,
  [synthBillingRollout.id]: synthBillingRollout,
  [synthNxtyouWiring.id]: synthNxtyouWiring,
  [reportToPr.id]: reportToPr,
};

/** The synthesized org-level board: 2 surface-forcing (no-owner) + 1 repo contrast. */
export const SYNTH_BOARD_IDS: string[] = [
  synthOwnershipMap.id,
  synthBillingRollout.id,
  synthNxtyouWiring.id,
];

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
