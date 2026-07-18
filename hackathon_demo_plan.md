# Demo Plan — Notes

*Working notes for the Sunday demo/judging (freeze 11:00 AM → Judging 12–3 PM → Hack Fair + public voting 2–4 PM). Not the pitch spine (that's `talking_points.md`) — this is the *operational* plan: what to show, in what order, what to have live, and the contingencies. Keep it terse and actionable.*

Last updated: 2026-07-18 (Sat).

---

## The arc (headline stays the headline)

1. **Instrument** — the standard candle: a fixed, memory-less Nemotron probe-agent. "The friction log *is* the audit."
2. **Caught regression (THE money shot)** — run 1 completes the billing probe (friction 16.8) → org ships D2C → run 2 stalls (70.5). **Δ +53.7**, Nemotron-measured, reproducible. Linnaeus *caught* it; it didn't author it.
3. **Typed recommendation** — the candle emits a `Fix` card; a human decides.
4. **The board** — 4 of 5 axes legible; billing is the one place the change drew blood (honest, not "everything's on fire").

Everything below is **supporting** — do not let it upstage the delta.

---

## ⭐ The live-run opportunity (vLLM A/B) — the upside play

The event judges *"real, working systems — not slide decks."* We have a measured vLLM efficiency A/B (**200s sequential → 113s concurrent = 1.77×**, same H100/model/battery). The strongest possible use is to **run it LIVE** during the sponsor-tech / vLLM beat rather than show a static chart.

**The move:** kick off the concurrent battery (`LINNAEUS_BATTERY_CONCURRENT=1`) in front of the judge and narrate — *"five probes in flight, vLLM's continuous batching packing them onto one H100"* — and let it complete in ~113s. A live completion is worth more than any bar chart here.

**Requirements / contingencies:**
- **Box must be up.** Redeploy ~15 min before the 12 PM judging window via `scripts/serving/run_vllm.sh` (≈15 min). This is the *second* reason to bring the box back (first = the candle must be live to qualify for the vLLM bounty at all).
- **Safe fallback:** the banked number. If the box, wifi, or timing misbehaves, cut to `results/vllm_batching_ab.json` + the backup slide. Never let a live run that hangs eat demo time — set a mental 2-min cap, then fall back.
- **Pre-warm:** do one throwaway concurrent run after redeploy so weights/KV are warm and the judge-facing run is clean (~113s, not a cold-start outlier).
- **Command to have ready:**
  ```bash
  LINNAEUS_BATTERY_CONCURRENT=1 npx tsx scripts/run-audit.ts
  ```
  (Sequential default = `npx tsx scripts/run-audit.ts` — have both, so you can show the contrast if asked.)

---

## Where the A/B lives (decided)

- **Submission form** — efficiency blurb (below) in the vLLM bounty narrative + the Frontier-Factor / Performance box. ← primary, earns points.
- **One appendix/backup slide** — two-bar chart, pulled up in Q&A or the sponsor beat. NOT a main-arc slide.
- **Talking points** — one crisp verbal line (already in `talking_points.md` §Sponsor tech).
- **Main product UI** — NO. It's plumbing, not the audit insight. At most a subtle candle-telemetry footer; low priority.

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

- [ ] Redeploy the candle before judging (bounty qualification + live-run) — `scripts/serving/run_vllm.sh`, pre-warm with one throwaway concurrent run.
- [ ] Build the single backup slide (spec above).
- [ ] Paste the efficiency blurb into the submission form (vLLM + Frontier/Performance).
- [ ] Decide: attempt the live A/B run, or banked-number-only? (Upside vs timing risk — box-up is the gate either way.)
