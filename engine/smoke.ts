// ─────────────────────────────────────────────────────────────────────────────
// WS-B — Offline smoke test.  Drives runProbe end-to-end with a StubCandleClient
// and in-memory SurfaceTools (NO network).  Proves: the loop wiring, the
// testability gate, friction-vector emission (Contract A), and that a stalled
// run outscores a completed run.  Run: `npx tsx engine/smoke.ts`.
// ─────────────────────────────────────────────────────────────────────────────

import type { Finding, FrictionVector } from "@/lib/contracts";
import { frictionScore } from "@/lib/instrumentation";
import type { SurfaceTool } from "@/lib/surfaces";
import { runProbe } from "./index";
import { StubCandleClient, makeTool, ok, dead, type StubTurn } from "./stub";

interface Scenario {
  label: string;
  probeId: string;
  tools: SurfaceTool[];
  script: StubTurn[];
}

const scenarios: Scenario[] = [
  // ── 1. auth-boundary: universal, clean completion ──────────────────────────
  {
    label: "auth-boundary (universal, expect completed)",
    probeId: "auth-boundary",
    tools: [
      makeTool(
        "repo_search",
        "repo",
        ok("authentication enforced in the middleware layer via session + JWT; unauthenticated requests are rejected with 401"),
      ),
    ],
    script: [
      { tools: [{ name: "repo_search", arguments: { q: "auth" } }] },
      { text: "Auth is enforced in the middleware layer (session/JWT); unauthenticated requests get 401." },
    ],
  },

  // ── 2. billing-regression BEFORE: synthesized, authors + completes ─────────
  {
    label: "billing-regression BEFORE (synthesized, expect completed)",
    probeId: "billing-regression",
    tools: [
      makeTool("repo_search", "repo", ok("found skmd_fastapi/scripts/monthly_billing.py")),
      makeTool("db_query", "rds", ok("usage rows loaded; invoices computed for all docuspa clients, totals attached")),
    ],
    script: [
      // authoring pass
      { tools: [{ name: "repo_search", arguments: { q: "billing script" } }] },
      { text: "Compute this month's invoices for docuspa medspa clients using scripts/monthly_billing.py." },
      // execution loop
      { tools: [{ name: "repo_search", arguments: { q: "monthly billing" } }] },
      { tools: [{ name: "db_query", arguments: { q: "usage" } }] },
      { text: "Invoices computed for all docuspa clients." },
    ],
  },

  // ── 3. billing-regression AFTER: authors, but stalls on the D2C scope ──────
  {
    label: "billing-regression AFTER (synthesized, expect stalled → stale-code)",
    probeId: "billing-regression",
    tools: [
      makeTool("repo_search", "repo", ok("found skmd_fastapi/scripts/monthly_billing.py")),
      makeTool("repo_read", "repo", ok("monthly_billing.py prices only docuspa medspa clients; there is NO D2C/nxtyou pricing branch")),
      makeTool("db_query", "rds", dead("no pricing rule found for nxtyou D2C clients")),
    ],
    script: [
      // authoring pass (still succeeds — the script exists, it's just stale)
      { tools: [{ name: "repo_search", arguments: { q: "billing" } }] },
      { text: "Compute this month's invoices including nxtyou D2C clients using scripts/monthly_billing.py." },
      // execution loop
      { text: "I'm not sure how nxtyou D2C clients are priced.", tools: [{ name: "repo_read", arguments: { file: "monthly_billing.py" } }] },
      { text: "The script has no D2C branch; I assume medspa pricing but can't be sure.", tools: [{ name: "db_query", arguments: { scope: "d2c" } }] },
      { text: "I still cannot determine the D2C pricing.", tools: [{ name: "db_query", arguments: { scope: "d2c" } }] },
      { text: "I probably cannot compute these invoices correctly.", tools: [{ name: "db_query", arguments: { scope: "d2c" } }] },
      { text: "I could not compute nxtyou invoices; the billing script does not support D2C." },
    ],
  },

  // ── 4. billing-regression FAILED_TO_AUTHOR: illegible target, gate fires ───
  {
    label: "billing-regression NO-SCRIPT (synthesized, expect failed_to_author)",
    probeId: "billing-regression",
    tools: [makeTool("repo_search", "repo", dead("no billing script found in repo"))],
    script: [
      { tools: [{ name: "repo_search", arguments: { q: "billing" } }] },
      { tools: [{ name: "repo_search", arguments: { q: "invoice" } }] },
      { text: "CANNOT_AUTHOR" },
    ],
  },
];

const VECTOR_KEYS: (keyof FrictionVector)[] = [
  "completed",
  "seconds_to_first_correct_move",
  "surfaces_opened",
  "tool_calls",
  "retries",
  "dead_ends",
  "guessed",
  "hedging_count",
];

function validateVector(v: FrictionVector): string[] {
  const errs: string[] = [];
  for (const k of VECTOR_KEYS) {
    if (!(k in v)) errs.push(`missing ${k}`);
  }
  if (typeof v.completed !== "boolean") errs.push("completed not boolean");
  if (v.seconds_to_first_correct_move !== null && typeof v.seconds_to_first_correct_move !== "number")
    errs.push("seconds_to_first_correct_move bad type");
  for (const k of ["surfaces_opened", "tool_calls", "retries", "dead_ends", "hedging_count"] as const) {
    if (typeof v[k] !== "number") errs.push(`${k} not number`);
  }
  if (typeof v.guessed !== "boolean") errs.push("guessed not boolean");
  return errs;
}

async function main() {
  const results: Record<string, { finding: Finding; score: number }> = {};
  let failures = 0;

  for (const s of scenarios) {
    const candle = new StubCandleClient(s.script);
    const finding = await runProbe(s.probeId, "SKMD", s.tools, candle, { runId: `run_${s.probeId}` });
    const score = frictionScore(finding.friction_vector);
    results[s.label] = { finding, score };

    const errs = validateVector(finding.friction_vector);
    if (errs.length) failures++;

    console.log(`\n■ ${s.label}`);
    console.log(`  status        : ${finding.status}`);
    console.log(`  root_cause_tag: ${finding.root_cause_tag}`);
    console.log(`  friction_score: ${score.toFixed(2)}`);
    console.log(`  vector        : ${JSON.stringify(finding.friction_vector)}`);
    console.log(`  vector valid  : ${errs.length === 0 ? "yes" : "NO — " + errs.join(", ")}`);
  }

  // ── Assertions (the "sane" checks) ──────────────────────────────────────────
  const authComplete = results["auth-boundary (universal, expect completed)"].finding;
  const before = results["billing-regression BEFORE (synthesized, expect completed)"];
  const after = results["billing-regression AFTER (synthesized, expect stalled → stale-code)"];
  const noAuthor = results["billing-regression NO-SCRIPT (synthesized, expect failed_to_author)"].finding;

  const checks: [string, boolean][] = [
    ["auth-boundary completed", authComplete.status === "completed"],
    ["billing BEFORE completed", before.finding.status === "completed"],
    ["billing AFTER stalled", after.finding.status === "stalled"],
    ["billing AFTER tagged stale-code", after.finding.root_cause_tag === "stale-code"],
    ["billing AFTER guessed=true", after.finding.friction_vector.guessed === true],
    ["NO-SCRIPT failed_to_author", noAuthor.status === "failed_to_author"],
    ["stalled score > completed score (the delta direction)", after.score > before.score],
    ["delta is a large positive regression (>50)", after.score - before.score > 50],
  ];

  console.log("\n── assertions ──");
  for (const [name, passed] of checks) {
    console.log(`  ${passed ? "PASS" : "FAIL"}  ${name}`);
    if (!passed) failures++;
  }
  console.log(
    `\nbilling delta (money shot): frictionScore(after) − frictionScore(before) = ` +
      `${after.score.toFixed(2)} − ${before.score.toFixed(2)} = ${(after.score - before.score).toFixed(2)}`,
  );

  if (failures > 0) {
    console.error(`\nSMOKE FAILED with ${failures} problem(s).`);
    process.exit(1);
  }
  console.log("\nSMOKE PASSED — loop wired, gate fires, vectors valid, delta positive.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
