# Best Use of Nemotron — Written Submission

*Project: **Linnaeus** — an Agent Operability Audit. AITX Community × NVIDIA Claw Agent Hackathon.*

*(The bounty requires "a short written explanation covering what Nemotron is doing in your agent, why it matters, and how you're maximizing its capabilities." This is that explanation.)*

> **Note:** Organization and product names in this document are anonymized — the audited system is referred to as the "Telehealth Monorepo," and its client lines as "medspa" and "D2C." Linnaeus was run against a real production system; the identifiers are de-identified for public submission. All measured numbers (friction scores, the +53.7 delta, timings) are from real Nemotron-measured runs.

---

## What Nemotron does in our agent

Linnaeus measures how well an AI agent could actually operate inside a real codebase or organization. It does this by dropping a **standard candle** — a fixed probe-agent — into the system and giving it real tasks to attempt, then instrumenting every place it stalls, guesses, dead-ends, or has to read four files to understand one contract. The friction log *is* the audit.

**Nemotron-3-Nano-30B-A3B (FP8) is that candle.** It is not a chatbot layer bolted onto the side — it is the measuring instrument itself. Every finding Linnaeus produces is a Nemotron tool-use trace: Nemotron reads the repo through our surface tools, tries to complete the probe (e.g. *"does a pricing code path exist for each client type currently in production?"*), and either reaches the checkpoint or stalls. We record the friction vector (completed?, seconds-to-first-correct-move, tool calls, retries, dead-ends, guessing, hedging) directly from that run. Remove Nemotron and there is no measurement — there is nothing left of the product.

We run the full instrument on a self-hosted **vLLM** OpenAI-compatible endpoint (H100, FP8), with `--enable-auto-tool-choice --tool-call-parser qwen3_coder --reasoning-parser nano_v3`. Tool calling is load-bearing: the probes are genuine agentic loops, not single completions.

## Why Nemotron is the right choice — not just *a* model

Linnaeus's core scientific claim is that **the only variable between run 1 and run 2 is the organization** — that's what makes the delta it reports (a *caught regression*) un-gameable. That claim requires an instrument that is **fixed and calibrated**: exact weights, exact quantization, `seed=42`, `temp=0`. A hosted frontier API is an *uncalibrated* instrument — it can be silently updated by the provider, and the moment it drifts, our delta stops meaning "the org changed" and starts meaning "maybe the model changed." So for us, an **open model we can pin and self-host is a correctness requirement, not a cost optimization** — and Nemotron is NVIDIA's open family built specifically for **agentic, tool-using** workloads, which is exactly the job.

There's also a "small-model punch" story we're proud of: Nemotron-3-Nano-30B-A3B is a mixture-of-experts with only **~3B active parameters**. A small, self-hosted open model — wrapped in the right agent scaffolding — produces a real, decision-grade operability signal on a production codebase. That's outsized utility per unit of compute, not brute force.

## How we maximize its capabilities

- **Reproducibility as a feature.** We pin quant + `seed` + `temp` so the candle is a genuine standard, and we route dev iteration through a cheaper stand-in while every **measured/scored** run goes to the pinned Nemotron endpoint. The headline number is Nemotron-measured, end to end.
- **A real evaluation loop around the output.** A two-layer design gates quality: (1) a *testability gate* — can Nemotron even author a valid probe here, or is the system so illegible the instrument can't load? — and (2) the probe itself. Friction is scored mechanically from the trace, so output quality is measured, not asserted.
- **Prompt + grounding discipline.** Probes use a fixed system prompt and force a single machine-checkable final line (e.g. `COVERAGE: COMPLETE` / `COVERAGE: GAP - <types>`), so Nemotron's answer is gradeable without a human in the loop and grounded in tool results (grep/read), not assumption.
- **Throughput under a heartbeat.** The trigger fires re-audits on a live event (a deploy announcement) and on a scheduled drift-sweep; vLLM's continuous batching (`--max-num-seqs 8`) runs the full 5-probe battery concurrently in ~242 s, so repeated inference is cheap enough to run on a cadence.

## The demonstrated result

Pointed at a real production system (the "Telehealth Monorepo"), Linnaeus caught a genuine operability regression: after the org shipped a new direct-to-consumer (D2C) billing path that the monthly-invoice code never covered, the same Nemotron candle went from **completing** the billing probe (friction 16.8) to **stalling** on it (friction 70.5) — a **+53.7** regression, measured entirely on the self-hosted Nemotron endpoint (`seed=42`, `temp=0`, reproducible). Four other universal probes ran on the same candle in the same battery; the honest board shows the system is legible on 4 of 5 axes, with the billing cell as the one place the org change drew blood. Linnaeus **caught** the regression; it did not author it — which is the whole point.
