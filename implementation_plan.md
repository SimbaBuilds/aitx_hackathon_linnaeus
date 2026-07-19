# Linnaeus — Implementation Plan & Delegation Blueprint

*How we build, sequence, and parallelize. Companion to `PLAN.md` (which holds the *decisions*); this holds the *execution*. Optimized to (a) protect the delta (L12), (b) keep the orchestrator's context lean by delegating subsystems to background agents against frozen contracts.*

Last updated: 2026-07-18 (Sat). **Freeze: Sun 19, 11:00 AM.**

---

## 0. Five guiding principles

1. **Contracts before code.** Freeze three interfaces (below) *first*. Once frozen, every subsystem builds against them in parallel without touching each other.
2. **The candle is a swappable seam.** The engine develops against a **dev stand-in** (a frontier model via the same OpenAI-compatible interface) and swaps to **vLLM-Nemotron** only for the *measured* runs. → the GPU track (WS-A) **never blocks** the engine (WS-B).
3. **Protect the delta (L12).** The run1→run2 regression on the billing probe is the one thing that cannot slip. Everything else is *cut-down-from*, never *cut-into*.
4. **Orchestrator stays lean.** Claude-the-orchestrator holds only the **contracts + integration**. Subsystems go to **background agents** that return *summaries + file lists + how-verified* — never code dumps. Orchestrator never reads large generated files.
5. **Directory-disjoint ownership + worktree isolation** for the concurrent agents → clean merges. `package.json` / shared config is the *only* seam the orchestrator hand-merges.

---

## 1. The three frozen contracts (Phase 0 — BLOCKING, nothing parallel starts until these are committed)

These are the entire coordination surface. Get them right and the rest is embarrassingly parallel.

### Contract A — the Finding/Run data shape (engine → UI/DB)
The producer/consumer interface. Engine emits it; UI renders it; DB persists it. Frozen as TS types + a `fixtures/*.json` sample the UI builds against.

```ts
Run     { id, target, candle:{model,quant,seed,temp}, org_state:'before'|'after', mode:'passive'|'capture', started_at }
Probe   { id, category, kind:'universal'|'synthesized', instance_spec }
Finding { run_id, probe_id,
          status:'completed'|'stalled'|'failed_to_author',   // failed_to_author = testability-gate hit (layer-1)
          friction_vector:{ completed:bool, seconds_to_first_correct_move:number,
                            surfaces_opened:number, tool_calls:number, retries:number,
                            dead_ends:number, guessed:bool, hedging_count:number },
          root_cause_tag,                                     // coupling|dead-code|missing-doc|no-owner|no-runbook|stale-code|missing-access
          remediation:{ type:'Document'|'Connect'|'Grant'|'Fix'|'Delete', content, target, provenance } }
Surface { id, kind, access_status }
```
The **delta** = two `Finding`s for the same `probe_id` across `org_state: before` vs `after`. That diff is the money shot.

### Contract B — `CandleClient` (engine ↔ model endpoint)
The swap seam. One interface, OpenAI-compatible; config decides dev vs prod.

```ts
interface CandleClient { chat(messages, tools): { text, toolCalls, usage } }
// config: { baseURL, model, seed, temperature }
// dev  = frontier model (real reasoning so the engine actually works while WS-A stands up)
// prod = http://<brev-host>:8000/v1  (vLLM-Nemotron, pinned tag+quant+seed+temp = the standard candle)
```
Nothing else in the codebase knows which model is behind it. WS-A produces the prod `baseURL`; the swap is a one-line config change at integration.

### Contract C — `SurfaceTool` (engine ↔ org surfaces)
How a probe "touches" the org. Each surface is a Vercel-AI-SDK tool; the engine's friction logger *wraps* every invocation to count `surfaces_opened`, timestamps, dead-ends.

```ts
interface SurfaceTool { name, description, schema, invoke(args): result }
// friction instrumentation is a wrapper the ENGINE owns — surfaces just implement invoke()
// surfaces: repo-read (SKMD local), gmail-search, drive-read, notion-read, rds-read
```
→ surface adapters (WS-E) and the engine (WS-B) develop fully independently.

---

## 2. Dependency graph

```
        ┌─────────────────────────────────────────────┐
        │  WS-0  Scaffold + FREEZE Contracts A/B/C      │  ← orchestrator + 1 agent, BLOCKING
        └───────────────┬─────────────────────────────┘
                        │ (contracts committed)
   ┌──────────┬─────────┼──────────┬───────────────┐
   ▼          ▼         ▼          ▼               ▼
 WS-A       WS-B      WS-C       WS-D            WS-E
 Serving   Engine     UI         DB              Surfaces
 (Cameron) (agent★)  (agent)    (agent)         (agent + Cameron auth)
 vLLM/     probe+     3 views    supabase        repo/gmail/drive/
 Nemotron  friction   vs         migrations+     notion/rds tools
 endpoint  instrum.   fixtures   typed client
   │          │         │          │               │
   └──────────┴────┬────┴──────────┴───────────────┘
                   ▼
        ┌────────────────────────────────┐
        │  INTEGRATION (orchestrator)     │  swap dev-candle→vLLM; wire persistence; UI→real data
        └───────────────┬────────────────┘
                        ▼
        ┌────────────────────────────────┐
        │  THE DELTA (non-negotiable)     │  billing probe run1(before)→run2(after)=regression
        │  + recommendation emit          │  + calibration cameo (pre-scan heatmap)
        └───────────────┬────────────────┘
                        ▼
        ┌────────────────────────────────┐
        │  STRETCH (sequential, post-stable)  live Gmail trigger → NemoClaw route → OpenShell policy
        └───────────────┬────────────────┘
                        ▼
                   SUBMISSION
```
★ WS-B is the crown jewel (the "depth" — L11). Orchestrator writes its *friction-measurement spec* precisely and reviews closely; delegates the plumbing.

---

## 3. Workstreams

| WS | What | Owner | Depends on | Owns (dirs) | Done = verified when |
|----|------|-------|-----------|-------------|----------------------|
| **WS-0** | Next.js+Tailwind+shadcn scaffold, Supabase project, `lib/contracts` (A), `lib/candle` (B), `lib/surfaces` (C interface), `fixtures/*.json`, committed skeleton | **Orchestrator** (contracts) + 1 agent (scaffold) | — | `/lib`, root config | `npm run dev` boots; fixtures typecheck against contracts; committed |
| **WS-A** | Brev launchable → `vllm serve` Nemotron → `curl /v1/models` → **tool-calling smoke test** | **Cameron** at GPU + 1 agent writes scripts/smoke harness | — (independent) | `/scripts/serving` | a real `chat()` w/ a tool call returns from the endpoint. **Banks $500.** |
| **WS-B** | Probe engine: registry, instantiation + **testability gate**, execution loop (tool-calling agent over `CandleClient`), **friction logger** emitting Contract A | **Agent★** (tight spec from orchestrator) | WS-0 | `/engine`, `/probes` | `runProbe(id, target)` → real `Finding[]` against the local SKMD checkout, using the **dev candle** |
| **WS-C** | 3 views vs fixtures: (1) operability heatmap, (2) findings+remediation-type, (3) run1→run2 delta. shadcn + tweakcn theme, `dataviz` skill | Agent | WS-0 | `/app`, `/components` | 3 views render fixtures; deploys to Vercel |
| **WS-D** | Supabase migrations (`runs/probes/findings/artifacts/surfaces`) + typed read/write client matching Contract A | Agent | WS-0 | `/db`, `/supabase` | write a fixture Finding, read it back, shapes match |
| **WS-E** | `SurfaceTool` adapters: repo-read (SKMD local), gmail-search, drive-read, notion-read, rds-read | Agent (build) + **Cameron** (OAuth/creds) | WS-0 (Contract C) | `/surfaces` | each tool returns real data from the real surface |
| **WS-F** | Calibration cameo: static pre-scan (DRY/LOC/cyclomatic/coupling) over SKMD → heatmap-data JSON feeding WS-C's heatmap | Agent (small) | WS-0 (Contract A heatmap shape) | `/prescan` | heatmap JSON renders; a probe stall lights the predicted hot cell |

---

## 4. Sequence (Sat 18 → Sun 19, 11:00 freeze)

**Ruthless about the critical path. Times are guides, not gates.**

- **Sat, block 1 — WS-0 (blocking).** Orchestrator freezes Contracts A/B/C + writes fixtures; 1 agent scaffolds Next.js/Tailwind/shadcn/Supabase. Commit the skeleton. **In parallel: Cameron starts WS-A** (Brev box up, serve command running — it has zero dependency on anything else and banks the $500).
- **Sat, block 2 — fan out the trio + surfaces.** Launch **WS-B (engine), WS-C (UI), WS-D (DB)** as background agents in worktrees off the committed scaffold. **WS-E** starts as soon as Cameron has auth for at least the repo + Gmail surfaces. Orchestrator's job here: answer agent questions, keep them on-contract, merge as branches land.
- **Sat, block 3 — integration.** Orchestrator merges the trio; swaps dev-candle → **real vLLM endpoint** (WS-A output); runs the **first real probe** end-to-end against SKMD; wires persistence + points UI at real data. WS-F (cameo) lands here.
- **Sat night / Sun early — THE DELTA (guard it).** Billing probe **run 1 (pre-change scope)** → **run 2 (post-nxtyou scope)** = the regression. Recommendation emit (candle authors the card). Produce the delta chart. **This is the demo; if nothing else past here ships, we still have a demo.**
- **Sun AM — stretch, in strict priority order:** (1) **live Gmail-trigger fire** (L28 — the Claw-agent credential), (2) NemoClaw route the candle, (3) OpenShell policy. Each is narrate-if-not-wired (L12/L28).
- **Sun, by 11:00 — submission.** Fill the hackathon Submission Checklist, Discord, "Submit Your Project." **Freeze code ~10:15** to leave runway for the writeup + a clean demo recording.

---

## 5. Fallback ladder (if time collapses — cut from the bottom up)

**Non-negotiable core (the demo exists at this line):**
1. WS-0 contracts + scaffold
2. WS-B engine producing real friction vectors
3. one real candle (dev stand-in acceptable if vLLM slips — but vLLM banks the $500, so protect WS-A)
4. billing probe **run1→run2 delta** + WS-C delta view

**Add in this order if time allows:**
5. Findings view + persistence (WS-D)
6. Recommendation emit (candle authors the typed card)
7. Calibration cameo / pre-scan heatmap (WS-F)
8. Live Gmail trigger (L28)
9. NemoClaw route
10. OpenShell policy

Everything 5–10 is *narrate-if-unbuilt*. Nothing 5–10 may consume time budgeted for 1–4.

---

## 6. Delegation mechanics (how the orchestrator stays lean)

- **Spawn** each subsystem as a **background agent with `isolation: worktree`**, off the committed WS-0 scaffold. Each gets: (a) its slice of this doc, (b) the frozen contracts verbatim, (c) its dir-ownership boundary, (d) explicit return items — *"return a summary, the file list, and how you verified — do NOT paste code back."*
- **Merge** as branches land. Code is directory-disjoint → conflicts only in `package.json`/config, which the orchestrator hand-resolves. Keep the primary checkout clean; integrate on a branch.
- **Poll** by `tail`-ing agent output, not grepping for a done-string (SKMD lesson).
- **Interrogate** agent claims — the Explore/impl agents over-claim; verify "done" by driving the real thing (the `verify` skill), never by trusting the summary.
- **What the orchestrator does NOT delegate:** the three contracts, the friction-measurement *semantics* (what counts as a stall, how seconds-to-first-correct-move is defined), the integration/candle-swap, and the delta run itself. These are context-cheap to hold and credibility-critical.

---

## 7. Human-only tasks (Cameron — queue these; agents can't do them)

- **Brev/GPU:** stand up the box, run `vllm serve`, confirm the endpoint (WS-A). *(Agent pre-writes every command; you run them.)*
- **Auth/creds:** OAuth for Gmail/Drive/Notion, RDS read creds, SKMD repo access (WS-E). Agents build the adapters; only you can authorize.
- **Vercel/Supabase projects:** create + link (agent scaffolds against them once they exist).
- **Ground truth:** confirm run-2's billing stall is real ("yes, the script doesn't price the D2C path") — you *are* the correctness gate.
- **V1b / V6** (Day-1 validations): DNS-by-IP if hostname 403s; confirm Brev GPU class → NVFP4 vs FP8.

---

## 8. Mechanics decisions — LOCKED (2026-07-18)

- **M1 — Dev-candle stand-in = Claude Haiku 4.5** (`claude-haiku-4-5`; revised 2026-07-18, was Sonnet 5 → Opus 4.8), accessed *through* the `CandleClient` seam (Contract B) so it swaps to vLLM-Nemotron with a one-line config change. Dev-only, for cheap pipeline iteration ($1/$5 per MTok — cheapest tool-capable Claude). Overridable via `DEV_CANDLE_MODEL` (e.g. `claude-sonnet-5`) if a probe needs more reasoning during dev. **Never used for a measured/scored run** — those are the pinned Nemotron candle only; and **never demo a live Haiku run** (its tool-use is weaker — a watched live run should be the Nemotron box, not the Anthropic fallback). Needs `ANTHROPIC_API_KEY` (see `camerons_task.md`).
  - **⚠️ Guardrail — the headline delta MUST be produced by the Nemotron candle, not the dev stand-in.** Any measured run whose number appears in the demo/pitch (the run1→run2 regression delta) must route through `CANDLE_BASE_URL` (the real Nemotron endpoint). A delta measured with Sonnet/Opus is dev-only and cannot be the money-shot — it breaks L4/L5 (standard candle) and the "Best Use of Nemotron" bounty. Re-run the hero delta on Nemotron before it's demoed.
- **M2 — Worktree isolation for the concurrent trio (WS-B/C/D).** Each background agent works in its own git worktree off the committed WS-0 scaffold; orchestrator merges directory-disjoint branches (`package.json` the only hand-merge). WS-E/F run in-place after the trio merges.
- **M3 — Engine delegation depth:** orchestrator writes the **friction-measurement spec** + the **`CandleClient` and tool-wrapper core** by hand; delegates the registry / probe-authoring / execution-loop plumbing to the WS-B agent against that spec. Crown jewel controlled without hoarding all of it.
