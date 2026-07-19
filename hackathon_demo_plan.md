# Demo Plan — Notes

*Working notes for the Sunday demo/judging (freeze 11:00 AM → Judging 12–3 PM → Hack Fair + public voting 2–4 PM). Not the pitch spine (that's `talking_points.md`) — this is the *operational* plan: what to show, in what order, what to have live, and the contingencies. Keep it terse and actionable.*

Last updated: 2026-07-18 (Sat).

---

## The arc (headline stays the headline)

1. **Instrument** — the standard candle: a fixed, memory-less Nemotron probe-agent. "The friction log *is* the audit."
2. **Caught regression (THE money shot)** — run 1 completes the billing probe (friction 16.8) → org ships D2C → run 2 stalls (70.5). **Δ +53.7**, Nemotron-measured, reproducible. Linnaeus *caught* it; it didn't author it. *[codebase — proves the instrument WORKS]*
3. **Typed recommendation** — the candle emits a `Fix` card; a human decides.
4. **The codebase board** — 4 of 5 axes legible; billing is the one place the change drew blood (honest, not "everything's on fire").
5. **Frontier-Factor (synthesis)** — *"you don't have to know your gaps."* A frontier model explored my real org — repo + Gmail + Drive — and **invented 8 grounded probes**, each citing the exact artifact that made it suspicious (a status pipeline unreadable from the schema, a provider flag wired to nothing, an owner who exists only in email). Proves framing #2 (synthesized instance) — *demonstrated, not asserted*.
6. **The org negative-space board (NEW watchable beat)** — the same fixed Nemotron candle ran three of those probes. Expand the trace: it searches the repo, finds no `CODEOWNERS`, **reaches into Gmail, actually finds the approver's name in a thread — and still scores `no-owner`.** A name in an email isn't an ownership record; it's the *shadow* of one. **The absence is the finding.** *[org — proves the instrument MATTERS; the half the codebase can't show, by construction]*

Beats 2–4 are the **codebase** (instrument works). Beats 5–6 are the **org** (instrument matters) — the codebase→org progression the thesis promises, now backed by real runs instead of assertion. Everything after is **supporting** — do not let it upstage the delta.

**`no-owner` in one line (for the board + Q&A):** *"It's not a tidiness score — it's the map of every decision that still needs a specific human whose authority you never wrote down."* For a solo operator / consultancy, `no-owner` **is** key-person / bus-factor detection: the org-level equivalent of the SPOF map.

**Provenance guardrail (say if asked):** the friction *numbers* are Nemotron-measured; the frontier model only *designs* the probes (synthesis ≠ measurement). The trace view is name-safe (curated anonymizer); the raw cross-surface run is proof-on-demand, not the public board.

---

## Booth format — 3-hour science fair (prerecorded-first)

**Reality:** Judging + Hack Fair is ~3 hours of science-fair / walk-up traffic (Judging 12–3, Hack Fair + public voting 2–4). We are **NOT** running live probes on the NVIDIA box on a loop for 3 hours — the box bills per hour, cold starts are slow, wifi is unreliable, and a hung run at a booth is worse than no run. So the default booth experience is **prerecorded**, with the live box as an occasional *marquee moment*, not the baseline.

**The booth loop (default, always-on, no box required):**
- A screen looping the **product UI** walkthrough (heatmap → findings → the +53.7 delta) — the money-shot views, driven from the banked `fixtures/demo.json`. Runs off the deployed web app or a local `next dev`; needs **no GPU**.
- A short (~60–90s) **screen recording** of the real Nemotron run producing the delta (terminal + UI), so the "it really ran on self-hosted Nemotron" claim is visible without the box being up.
- The backup slide (`slides/vllm_batching_ab.html`) in the loop or on a second tab.

**Why this is still honest / still scores:** the recording is of a *real* measured run; the banked numbers are real; the web UI is a real working system. "Real working system, not a slide deck" is satisfied by the deployed app + the recording — the live box is upside, not the floor.

### ⭐ The live box — a marquee moment, NOT a 3-hour loop

Bring the box up for a **window**, not the whole fair — e.g. spin it up shortly before the 12 PM judging block and for any judge who explicitly wants to see it live, then let it idle-delete or tear it down. When a serious judge is at the booth and it's worth it:

**The move:** kick off the concurrent battery (`LINNAEUS_BATTERY_CONCURRENT=1`) in front of them and narrate — *"five probes in flight, vLLM's continuous batching packing them onto one H100"* — completing in ~113s. A live completion beats any chart. Also satisfies the vLLM bounty's "functional endpoint doing real work" bar in person.

**Requirements / contingencies:**
- **Redeploy** via `scripts/serving/run_vllm.sh` (~15 min) when you want the live window; confirm `curl <url>/v1/models` lists `nemotron` and swap the new URL into `.env.local`.
- **Pre-warm:** one throwaway concurrent run so the judge-facing run is warm (~113s, not a cold-start outlier).
- **Safe fallback = the prerecorded content above.** If the box/wifi/timing misbehaves, cut to the recording + `results/vllm_batching_ab.json` + the slide. Mental 2-min cap on any live attempt, then fall back — never let a hung run eat booth time.
- **Commands ready:**
  ```bash
  LINNAEUS_BATTERY_CONCURRENT=1 npx tsx scripts/run-audit.ts   # concurrent (marquee)
  npx tsx scripts/run-audit.ts                                 # sequential (contrast)
  ```
- **Cost control:** the box can't stop/start (delete-only) and auto-deleted overnight when credits ran out — so treat each spin-up as a paid, time-boxed window; don't leave it running idle between judges.

---

## Proving it's really Nemotron-on-vLLM (the screens to have ready)

The credibility problem: judges see lots of "powered by X" that's a hosted API underneath. You don't *claim* it — you show the serving layer's own telemetry, which a wrapper can't fake. **Have these open and arranged before judging so any of them is one click away:**

| # | Screen | Command / source | What it proves |
|---|---|---|---|
| 1 | **vLLM server log, live** | on the box: `tail -f /home/shadeform/vllm.log` (that's where `run_vllm.sh` writes it) | The strongest artifact. vLLM prints `Running: 5 reqs, Waiting: 0, GPU KV cache usage: 34%, gen throughput: … tok/s`. **`Running: 5` = continuous batching happening live.** A hosted API can't produce this. |
| 2 | **Model identity** | `curl <url>/v1/models` | Returns `nemotron`, `root: nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B-FP8`, `max_model_len: 65536`. The server stating its own identity. |
| 3 | **GPU proof** | on the box: `watch -n1 nvidia-smi` | The H100, the vLLM process holding ~32 GB VRAM, util spiking to ~90% when the battery fires. Hardware-level. |
| 4 | **The runtime panel** (build item) | the app, wired to vLLM `/metrics` + `/v1/models` | The polished version of 1–3 — see below. |

**How to split-screen it on your laptop:** open a terminal and SSH into the box, tail the log, and arrange it next to the browser —
```bash
ssh <brev-box>  'tail -f /home/shadeform/vllm.log'    # or `brev shell <name>` then tail -f
watch -n1 nvidia-smi                                   # third small window, optional
```
Layout: browser (app + runtime panel) on one half, `tail -f` terminal on the other, `nvidia-smi` in a corner. The Brev/Jupyter **web terminal** works as a fallback if SSH is fussy (it's just a browser tab). **Practice this arrangement once in the morning** so it's muscle memory at the booth.

### Candle card + runtime panel (build items — wire to REAL telemetry, not app counters)

The whole point is that a judge trusts the numbers *because they come from vLLM, not from our app*. So every widget reads from the server:

- **Candle card** (small, persistent, always-on): `nemotron · NVIDIA-Nemotron-3-Nano-30B-A3B · FP8 · vLLM · H100 · 65k ctx · seed 42 · temp 0`, with a live/offline dot from `/v1/models`. On-brand as an instrument "calibration readout." When the box is down it shows the pinned config from banked run metadata, labelled "as-measured." **Cheap — build first.**
- **Runtime panel** (bigger, marquee): live **probes-in-flight** gauge from vLLM `/metrics` `num_requests_running` (when it reads 5, *the server said 5*), **KV-cache usage %** (`gpu_cache_usage_perc` — literally PagedAttention filling), tokens/s, and a scrolling **agent-action stream** (each probe's `repo_read`/grep tool calls). This makes the batching bounty story *visual* — judges watch `num_requests_running` jump 1→5 instead of hearing about it. Also scores rubric "technical depth."
- **Replay mode** (so the panel isn't dead when the box is down): play back a telemetry trace recorded during the morning run. Record the panel live in the AM → own the footage all afternoon.

---

## Sunday morning runbook (before judging)

The plan, start to finish. Do this once in the morning while the box is up, then you're covered for the whole fair:

1. **Bring the NVIDIA box up** → run `scripts/serving/run_vllm.sh` (~15 min). Confirm `curl <url>/v1/models` lists `nemotron`; **swap the new URL into `.env.local`** (and note it in `COORDINATION.md` for the build session).
2. **Pre-warm:** one throwaway `LINNAEUS_BATTERY_CONCURRENT=1 npx tsx scripts/run-audit.ts` so later runs aren't cold-start outliers.
3. **RECORD the full run** (this is the ambient/fallback content you keep all day):
   - The **runtime UI** (candle card + panel) during a concurrent battery — `num_requests_running` → 5, KV cache filling.
   - The **vLLM log** (`tail -f`) scrolling with `Running: 5 reqs` during the same run.
   - The **money-shot delta** in the product UI (16.8 → 70.5).
   - Keep it tight (~60–90s each, or one continuous ~2-min capture).
4. **Arrange the proof screens** (log tail / nvidia-smi / `/v1/models` / app) and practice the split-screen layout once.
5. **Leave the box up through the core judging window (12–3)** for the NVIDIA/vLLM bounty judges — have the vLLM log ready to open live when they come by. Outside that window, lean on the recording; kill the box if idle to control cost.

---

## Where the A/B lives (decided)

- **Submission form** — efficiency blurb (below) in the vLLM bounty narrative + the Frontier-Factor / Performance box. ← primary, earns points.
- **One appendix/backup slide** — two-bar chart, pulled up in Q&A or the sponsor beat. NOT a main-arc slide.
- **Talking points** — one crisp verbal line (already in `talking_points.md` §Sponsor tech).
- **Main product UI** — the A/B *chart* stays out (it's plumbing, not the audit insight). BUT the **candle card + runtime panel** (above) DO belong in the app — they're proof-of-stack, not the benchmark, and they carry the "it's really Nemotron/vLLM" credibility live.

### Submission efficiency blurb (paste-ready, ~2 lines)

> **Efficiency:** Linnaeus self-hosts its standard-candle model (Nemotron-3-Nano-30B-A3B, FP8) on vLLM and runs its probe battery concurrently. On one H100 — same model, same 5-probe battery, same target — continuous batching + PagedAttention cut the run from **200s (sequential, 1 probe in flight) to 113s (5 in flight): a 1.77× throughput gain with equivalent outputs.** vLLM isn't a cost optimization here — self-hosting is what keeps the measuring instrument *calibrated and reproducible* (pinned weights, `seed=42`, `temp=0`), which is a correctness requirement for our run-to-run delta. Numbers banked at `results/vllm_batching_ab.json`.

### Backup slide spec (single slide)

- **Title:** "vLLM: the candle runs concurrently — 1.77× on one H100"
- **Visual:** two horizontal bars, same scale — `Sequential (1 in flight) ▓▓▓▓▓▓▓▓▓▓ 200s` vs `Batched (5 in flight) ▓▓▓▓▓ 113s`. Annotate the gap "−43% wall-clock."
- **Sub-caption:** "Same H100 · Nemotron-3-Nano-30B-A3B FP8 · same 5-probe battery · equivalent outputs. PagedAttention fits the concurrent KV; continuous batching keeps the GPU saturated."
- **One honesty footnote (small):** "Throughput/concurrency win, not single-probe latency. Part of each probe's wall-clock is local tool execution, which also parallelizes."
- **Rule:** appendix only. Surfaces during the vLLM beat or Q&A, never in the main flow.

---

## Anonymization (demo-facing)

All demo surfaces + the Nemotron writeup are de-identified: **SKMD → "Telehealth Monorepo"**, `skmd_fastapi → telehealth_api`, `docuspa → medspa_web`, `nxtyou → d2c_web`, client lines → **medspa / D2C**. Planning docs + `results/*.json` keep live identifiers (not demo-facing). Keep any new demo/submission artifact consistent with this.

---

## Open demo TODOs

**Build (before Sunday):**
- [ ] **Candle card** — persistent instrument readout wired to `/v1/models` (build first, cheap).
- [ ] **Runtime panel** — probes-in-flight + KV-cache % + agent-action stream, wired to vLLM `/metrics` (marquee; after the money-shot views are solid).
- [ ] **Replay mode** for the panel (play back a recorded telemetry trace when the box is down).
- [x] ~~Build the single backup slide~~ → `slides/vllm_batching_ab.html`.

**Sunday morning (box up):**
- [ ] Redeploy candle (`scripts/serving/run_vllm.sh`), swap new URL into `.env.local` + note in `COORDINATION.md`, pre-warm.
- [ ] **Record** the runtime UI + vLLM log + money-shot delta during a live run (ambient/fallback content for the whole fair).
- [ ] Arrange + practice the split-screen proof layout (app / `tail -f vllm.log` / `nvidia-smi`).

**Submission:**
- [ ] Paste the efficiency blurb into the submission form (vLLM + Frontier/Performance).
- [ ] Anonymize any new demo/submission artifact (Telehealth Monorepo map above).
