# Linnaeus — Hackathon Plan & Status

*Living tracker. What's locked, what's open, what's next. AITX Community × NVIDIA Claw Agent Hackathon, Antler VC (800 Brazos St Ste 340), July 17–19 2026. Solo builder.*

**Hard deadline: Sunday July 19, 11:00 AM — Code Freeze / Submissions Due.** (Judging 12–3, Hack Fair 2–4, Awards 4–5.)

Last updated: 2026-07-17.

---

## 0. One-liner

Linnaeus measures how operable an org/codebase is for an AI agent by dropping probe-agents that attempt real work; wherever they stall is a finding. The hero demo: **operability CI for the enterprise** — measure the operability *delta* of a real org change (this week's platform-to-prod) by **re-auditing across the change and catching the regression** (Run 1 before → the org changes on its own → Run 2 after = friction rose), on a pinned open-weight "standard candle." Recursion = re-audit of a changed org, not self-improvement; remediation is a typed recommendation the candle emits for a human to decide, never the source of the delta.

---

## 1. LOCKED decisions

| # | Decision | Notes |
|---|---|---|
| L1 | **Hero = the org, via a bounded change-delta** — not a whole-org audit | Verifiable because Cameron is ground truth; see `demo_org_change_delta.md` |
| L2 | **Codebase demoted to a ~20s calibration cameo** | Proves the instrument on a legible substrate, then turn it on the org |
| L3 | **Frame = cross-cutting bounties first; track home = Red Hat Live Data** (revised 2026-07-18, was Recursive Intelligence) | **Anchor to the bounties** (vLLM $500 / Nemotron $100-head / Antler Commercializable) — they don't need a track and are where the pivoted Linnaeus wins. **Track = Red Hat Live Data:** the always-on trigger (Gmail deploy-announcement → re-audit; cron drift-sweep) *is* "an agent powered by real-time streaming data, heartbeat earning its keep." **⚠️ Do NOT pitch Recursive Intelligence** — after the pivot our delta is a *caught regression* (friction rises) from a deliberately **memory-less** candle; that track rewards an agent that *gets smarter over time*, so it invites "your agent didn't learn anything." Keep "recursion" = drift re-detection, never self-improvement. See `talking_points.md` §Sponsor tech. |
| L4 | **Standard candle = fixed & memory-less** → the **only variable between runs is the org itself**, so the delta is attributable to the change | The honesty guardrail; Linnaeus didn't author the change → can't be teaching-to-the-test |
| L5 | **Single-candle architecture (revised 2026-07-18):** the pinned Nemotron candle does probing/measurement AND authors the typed remediation recommendation. **No separate frontier remediation author.** | Remediation is now *output a human decides on*, so it's a lightweight templating step off the tagged root-cause — doesn't want a frontier model. Airtight "Best Use of Nemotron": *all* intelligence is the candle. Heavyweight strategic remediation = "Linnaeus Pro" roadmap, not the build. (Supersedes old two-model split.) |
| L6 | **Candle served on Nemotron + vLLM** (OpenAI-compatible endpoint) | Satisfies vLLM + Nemotron bounties from one endpoint |
| L7 | **Candle = Nemotron-3-Nano-30B-A3B FP8, single H100** (resolved — this is what's live) | Landed on the Nano, and per the actual vLLM bounty text that's an **asset, not a compromise**: A3B = ~3B *active* params (MoE) → the bounty's named **"small-model punch"** (outsized utility from a small open model + agent scaffolding). Frame it as a win, not an apology. (Earlier "capability > adjective" caution is moot: the Nano runs the battery fine and the small-model story now *helps*.) |
| L8 | **Sequencing: stable first, alpha last** — get vLLM+Nemotron working standalone (the $500, zero alpha risk), *then* layer NemoClaw/OpenShell | NemoClaw/OpenShell are ~4-month-old alpha; people struggling with them |
| L9 | **OpenShell/NemoClaw = IN** (integrated path confirmed) | NemoClaw supports "Existing vLLM" provider → candle IS the routed endpoint; ~70% shared work |
| L10 | **Reuse Juniper's event-dispatch pattern, drop the NL gate** | Dev operator; lean trigger → probe-run → persist |
| L11 | **Probe engine is the depth** — one core reused at every stage | run-1 audit / re-audit / regression delta / recommendation-emit — the *drift-check* is the point; remediation is an emitted recommendation, not a pipeline stage that mutates the org |
| L12 | **Critical path order (protect the delta):** engine+instrumentation → run1 baseline audit → **run2 re-audit of the changed org = regression delta (non-negotiable)** → emit typed recommendation + event-driven trigger | Cut down from the trigger, never sacrifice the delta |
| L13 | **Antler "Most Commercializable" — pitch it** (low marginal effort) | Real consulting product; wedge = *measurement/diagnosis of org operability*, not "understands your code" |
| L14 | **Skip: HiddenLayer track, NIM path** | Orthogonal / would forfeit vLLM bounty's "you stood up vLLM" criteria |
| L15 | **Quo/Henry bug = pitch asset only**, not a build component | Use as a real production *pass* of the "client-report-to-fix" probe (evidence slide) |
| L16 | **App name = Linnaeus**; probe = "Legacy Legibility" / stage "Live vs. Legacy" | Naming settled earlier |
| L17 | **On Cameron's org the demo leans discoverability-friction + change-lag, NOT tribal-knowledge interview** | Cameron documents everything → little "unrecoverable/in-head" to elicit. Operability = can an agent *find & assemble* docs scattered across 7 surfaces, and how fast does a change erode that. Honest + generalizes to disciplined enterprises. Capture mode runs mostly stream-one (write-back), not stream-two (interview). |
| L18 | **Hero probe (O3) = the billing regression, run as before/after** | "Compute this month's client invoices." Run 1 (pre-change scope) completes; Run 2 (post-nxtyou scope, D2C clients) stalls/mis-prices because the billing script predates the D2C path. The **change is the only variable** → the delta is a caught regression. Verifiable (Cameron = ground truth), bounded. The `Fix` (update script) is emitted as a recommendation + **optionally narrated as executed after the two runs** — it is NOT the source of the delta. Pair with a discoverability probe as #2. |
| L19 | **Remediation authoring = the candle itself** (O7 resolved 2026-07-18; supersedes "Sonnet 5") | Remediation demoted to *typed output a human decides on*, so it's a lightweight step off the tagged root-cause — the pinned Nemotron candle authors the recommendation card. **No separate/frontier author.** Collapses the two-model split (L5). Strengthens the Nemotron bounty (all intelligence is the candle). Heavyweight strategic planning = "Linnaeus Pro" roadmap only. |
| L20 | **GPU baseline = single box, candle = Nemotron-3-Nano-30B-A3B; quant depends on GPU** (O6 resolved) | **NVFP4 (~21GB) is Blackwell-only** (B200 / RTX PRO 6000). On the more-likely Hopper/Ampere (H100/A100) use the **FP8** checkpoint (~32GB — fits H100 80GB). $100 Brev ≈ 50h on A100/H100 @ ~$2/hr **if you Stop when idle**. Ready-made "Deploying Nemotron-3-Nano with vLLM" Brev Launchable exists. |
| L21 | **Reasoning-parser = `nano_v3` (Nano) / `super_v3` (Super), NOT `deepseek_r1`** | `deepseek_r1` **breaks tool calling** (documented HF issue); `nemotron_v3` doesn't exist. Tool-call-parser = `qwen3_coder`. Tool use is required for our probe agent → this is load-bearing. |
| L22 | **UI = Next.js (App Router) + Tailwind + shadcn, deployed on Vercel; 3 views only; no real auth** | Views: (1) operability heatmap/negative-space map, (2) findings + remediation type, (3) run1→run2 delta. SKMD muscle memory. Optional fake login as Antler polish only. Stub from fixture JSON so UI never blocks the delta (L12). |
| L23 | **Styling: shadcn + custom theme (tweakcn) + polished blocks (Origin UI / Kibo UI) + distinctive font** | Avoid default-shadcn "AI-generated" look. Timebox hard — styling is the hour-six rabbit hole. Load `dataviz` skill for heatmap/graph. |
| L24 | **DB = Supabase.** Schema: `runs` / `probes` / `findings` / `artifacts` / `surfaces` | Powers the delta + longitudinal baseline (same probe across runs = the regression line, e.g. friction 22 → 61 after nxtyou shipped). `findings.friction_vector` JSON; `artifacts` = emitted typed recommendations + capture-mode data-gathering outputs. |
| L25 | **Remediation = 5-type taxonomy: Document / Connect / Grant / Fix / Delete** | Org fix is often Connect/Grant (integration/permission), not a doc — capture mode emits connection specs / permission requests / code stubs, not only markdown. Codebase = cheap Delete/Document (the 5-min toy); org = hard Connect/Grant/Fix → **why org is hero**. Connect/Grant ties to the responsibility-gradient/autonomy ladder. |
| L26 | **Hackathon remediation = emitted typed recommendations; only the pure-code `Fix` is optionally executed live (as *closure*, not the delta)** | The delta is the caught regression (run1→run2 across the change) — remediation does NOT produce it. Linnaeus emits `Fix`/`Document`/`Connect`/`Grant` recommendations for a human to decide. The billing `Fix` is pure code → can be run live *after* the two runs to show the regression closing (optional narration). `Connect`/`Grant` (MCP wiring, permission grants) shown as generated artifacts in UI+video only. (Supersedes "Document+Fix power the delta.") |
| L27 | **Probe battery (hackathon) = 3–4 fixed + 1 synthesized** (build-load reduction only) | Fixed: auth-boundary, onboard-a-client, can-a-designer-contribute, live-vs-legacy(PDF orphan). Synthesized: billing-regression vs SKMD. One synthesized proves authoring + testability gate. Product tilts toward MORE synthesized (per-org fidelity); fixed carry cross-org comparability. See `probe_lifecycle.md`. |
| L28 | **Trigger = 1 real fire + narrated taxonomy** (O5 resolved) | Wire ONE trigger live: **Gmail deploy-announcement → re-audit** (already have it from the nxtyou event). Narrate the rest. **Heartbeat = always-on classifier** over event surfaces (Gmail/GitHub/CRM/Slack) asking "operability-relevant change?" → dispatch re-audit — the honest Claw beat, closes critique #7. **Two trigger classes:** (1) *event-triggered* discrete change — new platform/client/vendor/deploy/process, and **onboarding/offboarding a person** (a departure = purest operability regression, thesis-lead: "humans were the completion layer"); (2) *scheduled cron drift sweep* — decay no event caused (stale runbook, rotted dep). One live fire >> a slide of five; narrated-only reads as stapled-on. See `demo_org_change_delta.md` §trigger. |

---

## 2. Prize / scoring map

**Judging (100 pts, verbatim rubric):** Technical Execution & Completeness (30 = 15 completes-without-crashing + 15 real-engineering-not-a-wrapper) · Use of Sponsor Tech (30 = 15 used-meaningfully + 15 **articulate the "why"**) · Value & Impact (20 = 10 non-obvious-insight + 10 usable-tomorrow) · "Frontier" Factor (20 = 10 creativity + 10 performance). Philosophy: *"judging real, working systems — not slide decks or simple API wrappers."* → **the candle must be LIVE during judging**, banked JSON is only insurance.

**Targeted bounties (cross-cutting — earned from one integrated stack; these are the win, not the track):**
- **Best Use of vLLM — $500 cash** ← *primary money target.* Bounty text maps almost verbatim: **"small-model punch"** (Nano-30B-**A3B** = ~3B active), **efficiency** (`--max-num-seqs 8`, 5-probe battery in 242s), **"real integration under a heartbeat where throughput matters"** (trigger fires repeated batteries). Qualify bar = *"functional vLLM endpoint doing real work, not a token mention"* → **live during judging.**
- **Best Use of Nemotron — $100 Brev/member** ← same endpoint. **Requires a short written submission** (what/why/how-maximized) → drafted at `nemotron_bounty_writeup.md`. Candle is central, not a wrapper.
- **Best Use of NemoClaw + OpenShell — $100 Brev/member** ← install agent via NemoClaw (routed to the vLLM candle) + a real adversarial-surviving `policy.yaml`. Stretch.
- **Most Commercializable (Antler) — dinner** ← the pitch. Bounty weights *Customer↔Problem fit · immediate value · superiority vs existing.* Wedge = measurement/diagnosis of org operability for enterprises adopting agents.

**Track home = Red Hat Live Data** (via the live trigger/heartbeat), NOT Recursive Intelligence (see L3). Solo note: per-member Brev bounties are worth less solo → the real money targets are the **$500 vLLM cash** + **Antler**.

---

## 3. Architecture (target)

```
ONE GPU BOX (Brev instance)
  vLLM → Nemotron  (OpenAI-compatible :8000/v1, on host-visible addr — NOT localhost)  ← STANDARD CANDLE
     ↑ host-side rewrite by OpenShell Privacy Router (proxy @ 10.200.0.1:3128)
     ↑ endpoint set via `openshell provider create --config OPENAI_BASE_URL=...`  (NOT in network_policies)
  Agent calls https://inference.local  →  router →  your vLLM
  NemoClaw CLI  (provider = vllm/custom)  installs/supervises
     ↓
  OpenClaw agent (heartbeat)  = Linnaeus probe-agents
     ↓ runs inside
  OpenShell sandbox  ← policy.yaml: version/filesystem_policy/landlock/process/network_policies
                       (read-only git = allow git-upload-pack, omit git-receive-pack; landlock hard_requirement)

Remediation authoring = the SAME pinned candle (typed recommendation card off the tagged root-cause; no separate/frontier model — revised 2026-07-18)
Trigger = Juniper event-dispatch pattern (NL gate removed), fires on the org-change event
```

Full component detail, quickstart commands, VRAM tiers, starter `policy.yaml`, and source URLs: `research_nvidia_stack.md`.

---

## 3b. Org substrate (SKMD — the demo target)

- **The change:** `nxtyou.io` went to prod — SKMD's **direct-to-consumer** health/weight-loss service (D2C version of docuspa). Patient + admin portals in `nxtyou_njs`; provider portal is a nxtyou-themed subportal of `docuspa_njs`.
- **Repo:** `SimbaBuilds/SKMD` monorepo (`main`). Five subprojects, shared `skmd_fastapi` backend + DB. Root docs are good (see `SKMD/CLAUDE.md`).
- **Shared surfaces nxtyou touches:** docuspa backend, NP provider pool, scheduling/availability endpoints, some telehealth-view components. Documented in monorepo root docs.
- **Admitted gaps (operability debt from the change):**
  - **Monthly billing script** (usage → invoice price per client) **not yet updated** for nxtyou's D2C path. ← hero probe target (L18)
  - Post-initial-consult **patient progress reports + follow-up calls**: tested, needs further testing; noted in **Notion**. ← secondary
- **Knowledge is scattered across 7 surfaces** (the discoverability finding): monorepo root docs, Notion (tasks), a Gmail thread (deploy announcement), Vercel/GoDaddy (domain), GitHub (commits → auto-deploy Render+Vercel), AWS RDS (db), Quo (business messages → Juniper).

## 4. OPEN — needs Cameron's input

| # | Question | Status |
|---|---|---|
| O1 | Which platform + workflow | ✅ **nxtyou.io** → D2C intake/billing/telehealth (see §3b) |
| O2 | The gap the probe stalls on | ✅ Reframed (L17): not in-head glue — **discoverability across 7 surfaces + the stale billing script** (change-lag) |
| O3 | Probe A/B/C | 🔶 Leaning **billing-regression probe** (L18) + a discoverability probe #2 — *Cameron to lock* |
| O4 | Surfaces the workflow spans | ✅ Gmail, Notion, SKMD monorepo, Vercel/GoDaddy, GitHub, AWS RDS, Quo/Juniper (§3b) |
| O5 | Automated trigger vs narrate | ✅ **Locked (L28):** wire ONE real trigger (Gmail deploy-announcement → re-audit) + narrate the taxonomy |
| O6 | GPU / candle tier | ✅ **Single box, Nemotron-3-Nano-30B-A3B NVFP4** (L20); serving agent confirming VRAM + Brev reality |
| O7 | Remediation model | ✅ **The candle itself** — single-model architecture (L19, revised 2026-07-18); no separate frontier author |

---

## 5. OPEN — needs research / validation (technical)

| # | Item | Owner | When |
|---|---|---|---|
| V1 | ✅ **Resolved (recipe found) — prior assumption was WRONG.** Endpoint config does NOT go in `network_policies`. OpenShell's **Privacy Router** (host-side egress proxy) intercepts the agent's calls to `https://inference.local` and rewrites them. Set the endpoint via `openshell provider create --config OPENAI_BASE_URL=http://<host>:8000/v1`. **Do NOT add the inference host to `network_policies`** (router egress is host-side, outside the sandbox netns). Full recipe in `research_alpha_stack_integration.md`. | done | — |
| V1b | **Remaining Day-1 hands-on risk: DNS (OpenShell bug #879).** Router ignores sandbox `/etc/hosts` → a LAN box can 403-by-hostname but 200-by-IP. If `host.openshell.internal` fails, put the **raw host IP** in `OPENAI_BASE_URL`. Serve vLLM on a host-visible addr (LAN IP / `host.openshell.internal`), **not** `localhost`. | Cameron | **Day 1 validate** |
| V2 | ✅ **Resolved** — `dev-sandbox-policy.yaml` doesn't exist; canonical = `openshell-community/sandboxes/<agent>/policy.yaml` (base/droid/gemini/ollama/pi). Real top-level keys: `version`, `filesystem_policy`, `landlock`, `process`, `network_policies`. **No `inference:` block exists.** Adapted starter policy in the report §5. | done | — |
| V3 | ✅ Installers confirmed (`curl …nvidia.com/nemoclaw.sh \| bash`, `uv tool install -U openshell`, `openshell sandbox create -- <agent>`, `openshell policy set <name> --policy <file> [--wait]`). Provider names: `vllm` / `install-vllm` / `custom` / `anthropicCompatible`. `NEMOCLAW_ENDPOINT`/`_MODEL` spelling [Med]. | done | — |
| V4 | Escalation / human-in-the-loop is **not** native OpenShell → build as app-layer logic (Juniper) if the demo wants that beat | Cameron | If demoing HITL |
| V5b | **Adversarial-policy trap:** `landlock: compatibility: best_effort` silently disables ALL filesystem restriction on pre-5.13 kernels → use **`hard_requirement`** for judged runs. Also avoid `tls: skip`, `access: full`, `enforcement: audit`, `/**` binary globs, writable `/etc`. Read-only git = allow `git-upload-pack`, omit `git-receive-pack` (blocks push). | Cameron | Policy authoring |
| V5 | ✅ **Resolved** — serving runbook complete (`research_vllm_serving_runbook.md`): exact serve cmd, parser flags (`qwen3_coder`/`nano_v3`), VRAM table, gotchas, smoke tests, efficiency-demo | done | — |
| V6 | Confirm actual Brev GPU class granted (Blackwell vs Hopper) → picks NVFP4 vs FP8 quant; verify B200/RTX-PRO-6000 hourly rates + any hackathon-specific credits (console isn't fetchable) | Cameron | Day 1 setup |

**Research in flight (2 agents, launched 2026-07-17):**
- `research_alpha_stack_integration.md` — concrete NemoClaw→vLLM routing recipe, real OpenShell policy schema + starter policy, install commands, adversarial hardening (addresses V1/V2/V3).
- `research_vllm_serving_runbook.md` — exact serve commands per tier, VRAM table, Brev reality, smoke tests, efficiency-demo for the bounty (addresses V5/O6).

---

## 6. Build checklist (critical path — L12)

- [ ] **Stable foundation:** `vllm serve nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B-{NVFP4|FP8}` (quant per GPU, L20) with `--tool-call-parser qwen3_coder --reasoning-parser nano_v3` (L21), verify `curl /v1/models` + a tool-calling smoke test — *banks the $500, no alpha dependency. Full command in `research_vllm_serving_runbook.md`.*
- [ ] **Probe engine + friction instrumentation** (the reused core) — probes attempt tasks, log stall/seconds/surfaces/guessing
- [ ] **Org surfaces wired** (Drive/Gmail/repo/platform per O4)
- [ ] **Run 1 (baseline)** — probe the workflow on the pre-change org state, capture the clean friction vector
- [ ] **Run 2 (THE DELTA — non-negotiable)** — same candle re-audits the *changed* org (nxtyou in prod); workflow now stalls/regresses; produce the delta chart showing friction *rose*
- [ ] **Recommendation emit** — the candle authors the typed recommendation card (`Fix`/`Document`/…) off the tagged root-cause; *(optional)* run the billing `Fix` live as closure
- [ ] **Calibration cameo** — codebase pre-scan heatmap lighting up where a probe stalls (~20s)
- [ ] *(stretch)* NemoClaw install routed to the candle
- [ ] *(stretch)* OpenShell sandbox + adversarial-surviving `policy.yaml`
- [x] **One real trigger (L28):** ✅ **BUILT** — `scripts/watch-trigger.ts`: polls Gmail (real surface + auto-refresh) → cheap always-on classifier (Haiku, GPU-independent triage) → on an operability-relevant change, dispatches a re-audit (live on Nemotron if up, else replays banked Δ+53.7). `--sample` fires on the deploy email; real poll shown discriminating (says NO to noise). Narrate the taxonomy (offboarding + cron-drift) around it.
- [x] **Report→PR probe (the "Henry" probe):** ✅ **BUILT** (read-only) — `report-to-pr` in `probes/registry.ts` + `probe_report_to_pr.md`; backed by real prod evidence `henry_quo_e2e.PNG`. Measures the dev maintenance loop; not in `BATTERY_IDS`. Measure on Nemotron in the AM.
- [ ] **Submission** — per the hackathon Submission Checklist (find + fill), Discord, "Submit Your Project"

---

## 7. Doc index

| Doc | Role |
|---|---|
| `PLAN.md` | **This file** — status & decisions tracker |
| `implementation_plan.md` | **Build execution** — contracts, workstreams, sequence, delegation blueprint, M1–M3 |
| `camerons_task.md` | **Human-only tasks** — creds/keys/OAuth, serving commands, ground-truth facts |
| `brainstorming_artifact.md` | Full thesis / system rationale |
| `talking_points.md` | Presentation spine, framing, one-liners (incl. §Sponsor tech — why vLLM/Nemotron) |
| `nemotron_bounty_writeup.md` | **Submission-ready** written explanation required by the Nemotron bounty |
| `hackathon_demo_plan.md` | **Operational demo plan** — arc, booth strategy, proof screens, Sunday AM runbook |
| `MORNING_CHECKLIST.md` | **Self-contained Sunday-morning runbook** (deadlines, critical path, commands) |
| `probe_report_to_pr.md` | The "Henry" report→PR probe deep-dive + real production evidence |
| `specs.md` | Terse probe/scoring outline |
| `probe_legacy_legibility.md` | Deep-dive on the Live-vs-Legacy probe |
| `demo_org_change_delta.md` | **The hero demo** — org change-delta, built on platform-to-prod |
| `demo_case_skmd_juniper_claude_code.md` | The Quo/Henry production case (pitch asset) |
| `hackathon_fit_thoughts.md` | Strategy: track/bounty fit + decisions + inline Q&A |
| `hackathon_fit_brainstorm.md` | Strategy working notes |
| `capture_mode.md` | Second mode: capture (write-back + interview) vs passive measure; phasing |
| `research_nvidia_stack.md` | NVIDIA stack research: components, integrated path, quickstart, risks |
| `research_alpha_stack_integration.md` | ✅ NemoClaw→vLLM wiring (Privacy Router), real OpenShell policy schema + starter, adversarial hardening |
| `research_vllm_serving_runbook.md` | ✅ Exact serve commands, VRAM table, Brev reality, smoke tests, efficiency-demo |
