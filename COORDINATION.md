# Session Coordination — infra ↔ build

*Two Claude sessions are working this repo on `main` in parallel. This doc is the async channel between them. Written by the **infra/candle** session for the **build** session (the one that landed "Money shot lands: billing coverage delta 16.8→70.5").*

Last updated: 2026-07-18 (Sat).

---

## Who's doing what (agreed with Cameron)

- **Infra session (this one):** stood up the standard candle, owns serving/GPU lifecycle, Supabase, creds. Does NOT touch the engine.
- **Build session (you):** engine + probes + UI + trigger. Owns the codebase.

Please don't both drive the engine. If you need something from infra, leave a note in this file.

---

## ✅ What infra has ready for you

1. **The standard candle is LIVE** — Nemotron-3-Nano-30B-A3B **FP8** on vLLM (H100):
   - `CANDLE_BASE_URL=https://8000-6b6iq7v4d.brevlab.com/v1` (public, OpenAI-compatible), model id `nemotron`, 65k ctx.
   - Already in `.env.local` as `CANDLE_BASE_URL` / `CANDLE_MODEL`.
   - **Tool calling verified** with `--tool-call-parser qwen3_coder --reasoning-parser nano_v3` (NOT deepseek_r1).
   - Serving recipe committed at `scripts/serving/run_vllm.sh` (+ README) so it can be redeployed.

2. **Supabase** — project `Linnaeus` (ref `jdiidxgtxxbngatepcfl`, personal org, free plan). URL + anon + service_role + db password in `.env.local`.

---

## 🔴 TWO asks for the build session

### Ask 1 — the headline delta MUST be re-run on the Nemotron candle
The "16.8 → 70.5" delta was (almost certainly) measured with the **Opus dev stand-in**. For both honesty (L4/L5 standard candle) and the **"Best Use of Nemotron"** bounty, the number shown in the demo/pitch must be produced by the **real Nemotron candle**.
- **Point the measured run at `CANDLE_BASE_URL`** (the swap is the `CandleClient` config seam — one line) and re-run the hero billing delta.
- A Sonnet/Opus-measured delta is dev-only; it cannot be the money-shot.

### Ask 2 — dev stand-in changed: Opus 4.8 → **Sonnet 5** (M1 revised)
Opus dev iteration burned ~$28. The dev stand-in doesn't need Opus-level intelligence — switch it to **`claude-sonnet-5`** (~2.5× cheaper, near-Opus tool-use; intro $2/$10 per MTok). Drop to `claude-haiku-4-5` for high-volume mechanical iteration if needed. This only affects DEV runs — measured runs still go to Nemotron (Ask 1). See `implementation_plan.md` M1.

---

## ⚠️ GPU lifecycle — coordinate before deleting the box

This Brev instance **cannot be stopped/started, only deleted** — and it bills ~$3.28/hr while running. Plan agreed with Cameron:

1. **Bank one clean measured run on the Nemotron candle FIRST** (Ask 1) — that artifact must exist.
2. **Then the box gets deleted** to stop the burn.
3. **Redeploy tomorrow AM** for the live demo/judging (~15 min via `scripts/serving/run_vllm.sh`; FP8 fits H100 / L40S 48GB / A100 80GB / RTX PRO 6000, so H100 scarcity isn't fatal).

**➡️ If you're mid-way through wiring the Nemotron measured run, say so here (or tell Cameron) BEFORE the box is deleted.** Infra will not delete it until the Nemotron delta is banked. If you've already got the Nemotron delta saved (fixture/DB), note that here and infra will tear the box down.

---

## Scratch / notes between sessions

*(append below — newest first)*

- 2026-07-18 (infra): candle live + validated; M1 → Sonnet 5; awaiting confirmation that the hero delta has been (or will be) re-run on `CANDLE_BASE_URL` before box teardown.
