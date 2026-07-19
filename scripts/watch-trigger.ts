// ─────────────────────────────────────────────────────────────────────────────
// THE EVENT-DRIVEN TRIGGER (L28 · Red Hat Live Data track hook).
//
// Linnaeus as a Claw agent: it doesn't wait to be prompted. An always-on
// classifier watches the org's event surfaces (here: Gmail) and, when an
// operability-relevant change lands, WAKES and re-audits the org — catching the
// regression the change introduced. This is the honest "heartbeat" beat.
//
//   poll Gmail  →  classify (candle: "operability-relevant change?")  →  on YES,
//   dispatch a re-audit  →  catch the billing regression (Δ +53.7).
//
// GPU-independent by design: the CLASSIFIER runs on whatever candle is configured
// (Haiku dev stand-in when the Nemotron box is down — classification is not a
// scored run). The DISPATCH runs the real before/after live when CANDLE_BASE_URL
// (Nemotron) is up; otherwise it REPLAYS the banked measured delta so the trigger
// still demos with the box down.
//
//   npx tsx scripts/watch-trigger.ts                 # one poll → classify → dispatch
//   npx tsx scripts/watch-trigger.ts --watch --interval 20   # heartbeat loop
//   npx tsx scripts/watch-trigger.ts --sample        # use the bundled deploy email
//   npx tsx scripts/watch-trigger.ts --replay        # force banked replay (box down)
//   npx tsx scripts/watch-trigger.ts --query "subject:deploy newer_than:60d"
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { createCandle } from "@/lib/candle";
import { allSurfaceTools } from "@/surfaces";
import { gmailSearchTools } from "@/surfaces";
import { ensureGoogleToken } from "@/surfaces/google-auth";
import { runProbe } from "@/engine";
import { frictionScore } from "@/lib/instrumentation";
import type { Finding } from "@/lib/contracts";

// ── Minimal .env.local loader (matches the other scripts) ────────────────────
function loadEnvLocal(): void {
  const path = join(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
  for (const raw of readFileSync(path, "utf8").split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    const quoted =
      (val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"));
    if (quoted) val = val.slice(1, -1);
    else if (val.startsWith("#")) val = "";
    else {
      const h = val.indexOf(" #");
      if (h >= 0) val = val.slice(0, h).trim();
    }
    if (val && process.env[key] === undefined) process.env[key] = val;
  }
}

// ── The org change the trigger is meant to catch (the nxtyou deploy) ─────────
// Default Gmail query; override with --query. Broad enough to find the real
// announcement thread, scoped to recent mail.
const DEFAULT_QUERY = 'subject:(deploy OR launch OR live OR nxtyou OR production) newer_than:90d';

// Bundled sample used when Gmail is unavailable or --sample is passed, so the
// trigger always demos. Mirrors the real nxtyou deploy announcement (§3b).
const SAMPLE_EMAIL = {
  id: "sample",
  from: "Cameron Hightower <cameron.hightower@simbabuilds.com>",
  subject: "nxtyou.io is live in production 🚀",
  date: new Date().toUTCString(),
  snippet:
    "Heads up team — nxtyou.io, our direct-to-consumer (D2C) telehealth line, just " +
    "went live in prod. Patient + admin portals are up; the provider portal is the " +
    "nxtyou-themed subportal inside docuspa. Shares the docuspa backend + DB. Note: " +
    "the monthly billing script has NOT been updated for the D2C path yet.",
};

interface MailEvent {
  id: string;
  from: string;
  subject: string;
  date: string;
  snippet: string;
}

// ── Poll Gmail for a candidate event (real surface + auto-refresh) ───────────
async function pollGmail(query: string): Promise<MailEvent | null> {
  try {
    await ensureGoogleToken({ verbose: false });
  } catch {
    return null; // no Google creds → caller falls back to the sample
  }
  const search = gmailSearchTools.find((t) => t.name === "gmail_search");
  if (!search) return null;
  const res = await search.invoke({ query, max_results: 5 });
  if (!res.ok || !res.data) return null;
  const messages = (res.data as { messages?: MailEvent[] }).messages ?? [];
  return messages[0] ?? null;
}

// Build the cheap DEV candle (Haiku) regardless of CANDLE_BASE_URL. The
// always-on classifier is deliberately GPU-independent: you triage on a cheap
// model and only spend the pinned Nemotron candle on the re-audit it dispatches.
function makeDevCandle() {
  const saved = process.env.CANDLE_BASE_URL;
  delete process.env.CANDLE_BASE_URL;
  const c = createCandle();
  if (saved !== undefined) process.env.CANDLE_BASE_URL = saved;
  return c;
}

// ── The always-on classifier (always the cheap dev candle — triage, not scoring) ─
async function classify(evt: MailEvent): Promise<{ relevant: boolean; reason: string; model: string }> {
  const candle = makeDevCandle();
  const system =
    "You are Linnaeus's always-on operability-change classifier. You watch an " +
    "organization's event surfaces (email, commits, tickets). Given ONE event, " +
    "decide whether it signals an operability-relevant change — something that " +
    "could alter how legibly an AI agent can operate inside the org: a new " +
    "platform / client / vendor / deploy, a process change, or a person " +
    "onboarding/offboarding. Ignore pure noise (newsletters, receipts, chatter). " +
    "Reply with EXACTLY one final line: " +
    "'OPERABILITY_RELEVANT: YES - <short reason>' or " +
    "'OPERABILITY_RELEVANT: NO - <short reason>'.";
  const user =
    `From: ${evt.from}\nSubject: ${evt.subject}\nDate: ${evt.date}\n\n${evt.snippet}`;

  const out = await candle.chat([
    { role: "system", content: system },
    { role: "user", content: user },
  ]);
  const text = out.text ?? "";
  const relevant = /OPERABILITY_RELEVANT:\s*YES/i.test(text);
  const reason =
    text.match(/OPERABILITY_RELEVANT:\s*(?:YES|NO)\s*-\s*(.+)/i)?.[1]?.trim() ??
    text.trim().slice(0, 160);
  return { relevant, reason, model: candle.spec.model };
}

// The two scoped instances of the billing probe — the org change is the ONLY
// variable between them (same as scripts/run-billing-delta.ts).
const BEFORE_SPEC =
  "Scope = one client type: medspa / docuspa clinic clients (the clinics billed " +
  "by the monthly-invoice pipeline). Does a pricing code path exist for this " +
  "client type?";
const AFTER_SPEC =
  "Scope = two client types: (1) medspa / docuspa clinic clients AND (2) nxtyou " +
  "direct-to-consumer (D2C) patients now in production. Does a pricing code path " +
  "exist for EACH of these client types?";

// Replay the banked, Nemotron-measured delta so the trigger still demos with the box down.
function replayBanked(reason: string): number | null {
  const p = join(process.cwd(), "results", "nemotron_billing_delta.json");
  if (!existsSync(p)) {
    console.log("  ⚠️  no banked delta to replay (results/nemotron_billing_delta.json missing).");
    return null;
  }
  const banked = JSON.parse(readFileSync(p, "utf8")) as { before: Finding; after: Finding };
  const b = frictionScore(banked.before.friction_vector);
  const a = frictionScore(banked.after.friction_vector);
  console.log(`  ↩️  REPLAY (Nemotron-measured, banked — ${reason})`);
  console.log(`     before: ${banked.before.status.padEnd(9)} friction ${b.toFixed(1)}`);
  console.log(`     after:  ${banked.after.status.padEnd(9)} friction ${a.toFixed(1)}   ${banked.after.root_cause_tag}`);
  console.log(`     Δ friction = +${(a - b).toFixed(1)}  ← regression caught`);
  return a - b;
}

// ── Dispatch: re-audit live on Nemotron, or replay the banked measured delta ──
async function dispatchReaudit(forceReplay: boolean): Promise<{ delta: number | null; live: boolean }> {
  const candle = createCandle();
  const live = candle.isProd && !forceReplay; // prod = Nemotron box is up

  if (!live) {
    return { delta: replayBanked(forceReplay ? "replay forced" : "box is down"), live: false };
  }

  // Live re-audit on the pinned Nemotron candle — fall back to replay if the
  // endpoint is unreachable (e.g. a stale CANDLE_BASE_URL after the box died).
  process.env.REPO_PATH =
    process.env.REPO_PATH ?? "/Users/cameronhightower/Software_Projects/SKMD";
  const tools = allSurfaceTools();
  const stamp = Date.now();
  console.log(`  ▶️  LIVE re-audit on the Nemotron candle (${candle.spec.model})…`);
  try {
    const before = await runProbe("billing-coverage", "SKMD", tools, candle, {
      runId: `trigger_before_${stamp}`,
      instanceSpec: BEFORE_SPEC,
    });
    const after = await runProbe("billing-coverage", "SKMD", tools, candle, {
      runId: `trigger_after_${stamp}`,
      instanceSpec: AFTER_SPEC,
    });
    const b = frictionScore(before.friction_vector);
    const a = frictionScore(after.friction_vector);
    console.log(`     before: ${before.status.padEnd(9)} friction ${b.toFixed(1)}`);
    console.log(`     after:  ${after.status.padEnd(9)} friction ${a.toFixed(1)}   ${after.root_cause_tag}`);
    console.log(`     Δ friction = +${(a - b).toFixed(1)}  ← regression caught LIVE`);
    return { delta: a - b, live: true };
  } catch (e) {
    console.log(`     ⚠️  live candle unreachable (${(e as Error).message.slice(0, 60)}…) — falling back.`);
    return { delta: replayBanked("live endpoint unreachable"), live: false };
  }
}

// ── Append this event to the Field Log fixture (what the UI Triggers tab reads) ──
function logActivity(rec: {
  evt: MailEvent;
  relevant: boolean;
  reason: string;
  model: string;
  dispatched: boolean;
  delta: number | null;
}): void {
  const p = join(process.cwd(), "fixtures", "trigger_activity.json");
  let doc: { target?: string; _note?: string; events: unknown[] } = { target: "SKMD", events: [] };
  if (existsSync(p)) {
    try {
      doc = JSON.parse(readFileSync(p, "utf8"));
    } catch {
      /* keep default */
    }
  }
  const event: Record<string, unknown> = {
    ts: new Date().toISOString(),
    source: rec.evt.id === "sample" ? "gmail" : "gmail",
    subject: rec.evt.subject,
    from: rec.evt.from,
    classifier_model: rec.model,
    relevant: rec.relevant,
    reason: rec.reason,
    dispatched: rec.dispatched,
  };
  if (rec.dispatched) event.dispatch_kind = "re-audit";
  if (rec.delta !== null) {
    event.delta = Number(rec.delta.toFixed(1));
    event.delta_probe = "billing-regression";
  }
  // newest first, cap the log so repeated runs don't grow unbounded
  doc.events = [event, ...(doc.events ?? [])].slice(0, 12);
  try {
    writeFileSync(p, JSON.stringify(doc, null, 2) + "\n");
    console.log(`  📝 logged to fixtures/trigger_activity.json → the UI Field Log`);
  } catch {
    /* read-only fs is non-fatal */
  }
}

// ── One heartbeat: poll → classify → (maybe) dispatch ────────────────────────
async function tick(opts: { query: string; sample: boolean; replay: boolean; noLog: boolean }): Promise<void> {
  const ts = new Date().toISOString();
  console.log(`\n[${ts}] 🫀 heartbeat — scanning event surfaces (gmail)…`);

  let evt = opts.sample ? SAMPLE_EMAIL : await pollGmail(opts.query);
  let usedSample = opts.sample;
  if (!evt) {
    console.log(`  gmail: no match / unavailable → using bundled sample event.`);
    evt = SAMPLE_EMAIL;
    usedSample = true;
  }

  console.log(`  event${usedSample ? " [sample]" : ""}: "${evt.subject}"  — ${evt.from}`);

  const c = await classify(evt);
  console.log(`  classifier (${c.model}): operability-relevant = ${c.relevant ? "YES" : "NO"} — ${c.reason}`);

  if (!c.relevant) {
    console.log(`  → no dispatch (event is not operability-relevant).`);
    if (!opts.noLog) logActivity({ evt, relevant: false, reason: c.reason, model: c.model, dispatched: false, delta: null });
    return;
  }
  console.log(`  → WAKE: dispatching an operability re-audit of the changed org…`);
  const d = await dispatchReaudit(opts.replay);
  if (!opts.noLog) logActivity({ evt, relevant: true, reason: c.reason, model: c.model, dispatched: true, delta: d.delta });
}

async function main(): Promise<void> {
  loadEnvLocal();
  const argv = process.argv.slice(2);
  const opts = {
    query: (argv.includes("--query") ? argv[argv.indexOf("--query") + 1] : "") || DEFAULT_QUERY,
    sample: argv.includes("--sample"),
    replay: argv.includes("--replay"),
    noLog: argv.includes("--no-log"),
    watch: argv.includes("--watch"),
    interval: (argv.includes("--interval") ? Number(argv[argv.indexOf("--interval") + 1]) : 20) || 20,
  };

  const dispatchLive = createCandle().isProd && !opts.replay;
  console.log("── Linnaeus trigger — event-driven operability re-audit (L28) ──");
  console.log(`   classifier: cheap dev candle (${makeDevCandle().spec.model}) — always-on triage`);
  console.log(`   dispatch:   ${dispatchLive ? "LIVE re-audit on Nemotron (box up)" : "replay banked delta (box down)"}`);
  console.log(`   query:      ${opts.query}`);

  if (!opts.watch) {
    await tick(opts);
    return;
  }

  console.log(`   heartbeat every ${opts.interval}s (Ctrl-C to stop)…`);
  // eslint-disable-next-line no-constant-condition
  while (true) {
    await tick(opts);
    await new Promise((r) => setTimeout(r, opts.interval * 1000));
  }
}

main().catch((err) => {
  console.error("trigger failed:", err);
  process.exit(1);
});
