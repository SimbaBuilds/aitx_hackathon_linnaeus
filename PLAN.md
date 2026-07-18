# Linnaeus — Hackathon Plan & Status

*Living tracker. What's locked, what's open, what's next. AITX Community × NVIDIA Claw Agent Hackathon, Antler VC (800 Brazos St Ste 340), July 17–19 2026. Solo builder.*

**Hard deadline: Sunday July 19, 11:00 AM — Code Freeze / Submissions Due.** (Judging 12–3, Hack Fair 2–4, Awards 4–5.)

Last updated: 2026-07-17.

---

## 0. One-liner

Linnaeus measures how operable an org/codebase is for an AI agent by dropping probe-agents that attempt real work; wherever they stall is a finding. The hero demo: **operability CI for the enterprise** — measure the operability *delta* of a real org change (this week's platform-to-prod), recursively (probe → document → re-probe), on a pinned open-weight "standard candle."

---

## 1. LOCKED decisions

| # | Decision | Notes |
|---|---|---|
| L1 | **Hero = the org, via a bounded change-delta** — not a whole-org audit | Verifiable because Cameron is ground truth; see `demo_org_change_delta.md` |
| L2 | **Codebase demoted to a ~20s calibration cameo** | Proves the instrument on a legible substrate, then turn it on the org |
| L3 | **Frame = Recursive Intelligence track** (improvement delta across runs) | Track judges the run1→run2 delta; doesn't require always-on |
| L4 | **Standard candle = fixed & memory-less**; improvement externalized into the org's own docs, not cached | The honesty guardrail; also the Boris "encode as infra" point |
| L5 | **Two-model split:** pinned Nemotron candle for *probing/measurement*; stronger/frontier model for *remediation authoring* | Only the measurement needs pinning; remediation quality wants to be high |
| L6 | **Candle served on Nemotron + vLLM** (OpenAI-compatible endpoint) | Satisfies vLLM + Nemotron bounties from one endpoint |
| L7 | **Candle tier = as large as the Brev GPU allows**: Super-120B if 4×H100, else Nano-30B-A3B (NVFP4) single-GPU | Don't downsize to chase "small-model punch"; capability > bounty adjective |
| L8 | **Sequencing: stable first, alpha last** — get vLLM+Nemotron working standalone (the $500, zero alpha risk), *then* layer NemoClaw/OpenShell | NemoClaw/OpenShell are ~4-month-old alpha; people struggling with them |
| L9 | **OpenShell/NemoClaw = IN** (integrated path confirmed) | NemoClaw supports "Existing vLLM" provider → candle IS the routed endpoint; ~70% shared work |
| L10 | **Reuse Juniper's event-dispatch pattern, drop the NL gate** | Dev operator; lean trigger → probe-run → persist |
| L11 | **Probe engine is the depth** — one core reused at every stage | audit / remediation / re-probe / drift-check |
| L12 | **Critical path order (protect the delta):** engine+instrumentation → run1 audit+remediation → **run2 delta (non-negotiable)** → event-driven trigger | Cut down from the trigger, never sacrifice the delta |
| L13 | **Antler "Most Commercializable" — pitch it** (low marginal effort) | Real consulting product; wedge = *measurement/diagnosis of org operability*, not "understands your code" |
| L14 | **Skip: HiddenLayer track, NIM path** | Orthogonal / would forfeit vLLM bounty's "you stood up vLLM" criteria |
| L15 | **Quo/Henry bug = pitch asset only**, not a build component | Use as a real production *pass* of the "client-report-to-fix" probe (evidence slide) |
| L16 | **App name = Linnaeus**; probe = "Legacy Legibility" / stage "Live vs. Legacy" | Naming settled earlier |
| L17 | **On Cameron's org the demo leans discoverability-friction + change-lag, NOT tribal-knowledge interview** | Cameron documents everything → little "unrecoverable/in-head" to elicit. Operability = can an agent *find & assemble* docs scattered across 7 surfaces, and how fast does a change erode that. Honest + generalizes to disciplined enterprises. Capture mode runs mostly stream-one (write-back), not stream-two (interview). |
| L18 | **Hero probe (tentative, O3) = the billing regression** | "Compute this month's client invoices, now that nxtyou is in prod" → stalls because the billing script predates nxtyou's D2C path. Verifiable (Cameron = ground truth), bounded, recursive. Remediation here is *code* (update script) — reinforces "operability CI catches a regression." Pair with a discoverability probe as #2. |
| L19 | **Remediation authoring model = Sonnet 5** (O7 resolved) | Not the candle → needn't be open/self-hosted; quality drives delta size; frontier author + ~0 setup. Nemotron stays the pinned candle. |
| L20 | **GPU baseline = single box, candle = Nemotron-3-Nano-30B-A3B; quant depends on GPU** (O6 resolved) | **NVFP4 (~21GB) is Blackwell-only** (B200 / RTX PRO 6000). On the more-likely Hopper/Ampere (H100/A100) use the **FP8** checkpoint (~32GB — fits H100 80GB). $100 Brev ≈ 50h on A100/H100 @ ~$2/hr **if you Stop when idle**. Ready-made "Deploying Nemotron-3-Nano with vLLM" Brev Launchable exists. |
| L21 | **Reasoning-parser = `nano_v3` (Nano) / `super_v3` (Super), NOT `deepseek_r1`** | `deepseek_r1` **breaks tool calling** (documented HF issue); `nemotron_v3` doesn't exist. Tool-call-parser = `qwen3_coder`. Tool use is required for our probe agent → this is load-bearing. |
| L22 | **UI = Next.js (App Router) + Tailwind + shadcn, deployed on Vercel; 3 views only; no real auth** | Views: (1) operability heatmap/negative-space map, (2) findings + remediation type, (3) run1→run2 delta. SKMD muscle memory. Optional fake login as Antler polish only. Stub from fixture JSON so UI never blocks the delta (L12). |
| L23 | **Styling: shadcn + custom theme (tweakcn) + polished blocks (Origin UI / Kibo UI) + distinctive font** | Avoid default-shadcn "AI-generated" look. Timebox hard — styling is the hour-six rabbit hole. Load `dataviz` skill for heatmap/graph. |
| L24 | **DB = Supabase.** Schema: `runs` / `probes` / `findings` / `artifacts` / `surfaces` | Powers the delta + longitudinal baseline (same probe across runs = 40→65). `findings.friction_vector` JSON; `artifacts` = capture-mode outputs. |
| L25 | **Remediation = 5-type taxonomy: Document / Connect / Grant / Fix / Delete** | Org fix is often Connect/Grant (integration/permission), not a doc — capture mode emits connection specs / permission requests / code stubs, not only markdown. Codebase = cheap Delete/Document (the 5-min toy); org = hard Connect/Grant/Fix → **why org is hero**. Connect/Grant ties to the responsibility-gradient/autonomy ladder. |
| L26 | **Hackathon remediation execution: Document + Fix executed for real (power the delta); Connect + Grant = demonstrated artifacts only** | The hero probe's remediation (billing Fix / discoverability Document) is genuinely applied on a branch so run2's delta is real. Real MCP wiring / live permission grants are out of scope — shown as generated artifacts in UI+video. |
| L27 | **Probe battery (hackathon) = 3–4 fixed + 1 synthesized** (build-load reduction only) | Fixed: auth-boundary, onboard-a-client, can-a-designer-contribute, live-vs-legacy(PDF orphan). Synthesized: billing-regression vs SKMD. One synthesized proves authoring + testability gate. Product tilts toward MORE synthesized (per-org fidelity); fixed carry cross-org comparability. See `probe_lifecycle.md`. |

---

## 2. Prize / scoring map

**Judging (100 pts):** Technical Execution & Completeness (30) · Use of Sponsor Tech (30) · Value & Impact (20) · "Frontier" Factor (20). Philosophy: *real working systems, not slide decks or API wrappers.*

**Targeted bounties (one integrated stack earns all three, ~70% shared work):**
- **Best Use of vLLM — $500 cash** ← the Nemotron-on-vLLM candle endpoint, genuinely hammered under the probe/heartbeat workload
- **Best Use of Nemotron — $100 Brev/member** ← same endpoint, ~0 extra work
- **Best Use of NemoClaw + OpenShell — $100 Brev/member** ← install agent via NemoClaw (routed to the vLLM candle) + a real adversarial-surviving `policy.yaml`
- **Most Commercializable (Antler) — dinner** ← the pitch

Solo note: per-member Brev bounties are worth less solo → the real money targets are the **$500 vLLM cash** + **Antler**.

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

Remediation authoring = separate stronger/frontier model (Sonnet 5, NOT the candle, not pinned)
Trigger = Juniper event-dispatch pattern (NL gate removed)
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
| O5 | Automated trigger vs narrate | 🔶 *Lock later* — the deploy announcement was in a Gmail thread → an event-driven/always-on agent could have caught it (natural trigger story) |
| O6 | GPU / candle tier | ✅ **Single box, Nemotron-3-Nano-30B-A3B NVFP4** (L20); serving agent confirming VRAM + Brev reality |
| O7 | Remediation model | ✅ **Sonnet 5** (L19) |

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
- [ ] **Run 1** — probe the post-change workflow, capture the stall + friction vector
- [ ] **Remediation writer** — stronger model writes runbook/ownership/config into the org's own records
- [ ] **Run 2 (THE DELTA — non-negotiable)** — same candle, workflow completes, friction drops; produce the delta chart
- [ ] **Calibration cameo** — codebase pre-scan heatmap lighting up where a probe stalls (~20s)
- [ ] *(stretch)* NemoClaw install routed to the candle
- [ ] *(stretch)* OpenShell sandbox + adversarial-surviving `policy.yaml`
- [ ] *(stretch)* Automated event trigger (Juniper pattern); else narrate
- [ ] **Submission** — per the hackathon Submission Checklist (find + fill), Discord, "Submit Your Project"

---

## 7. Doc index

| Doc | Role |
|---|---|
| `PLAN.md` | **This file** — status & decisions tracker |
| `brainstorming_artifact.md` | Full thesis / system rationale |
| `talking_points.md` | Presentation spine, framing, one-liners |
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
