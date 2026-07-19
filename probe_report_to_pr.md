# Probe deep-dive — "Report → PR" (the Henry probe)

*Category: `report-to-pr`. The codebase-side analog of the billing regression: it measures the operability of the **dev workflow** — can an agent take a real, non-technical user bug report all the way to a fix? Read-only in the hackathon build (stops at the proposed diff; never opens a PR — L15/scope).*

---

## The question

> **Can an agent bring a simple bug fix all the way from a user report to a PR?**

This is the operability of the *maintenance loop* — the single most common real-world agent-in-an-org task. Friction here is: can the agent get from a vague, non-technical report → the exact code that produces the behavior → the root cause → a concrete, reviewable fix, without a human bridging each gap.

## The instance (real)

A client, **Henry**, reported via the Quo business-messaging inbox that approving a **peptide clearance** produced a **misleading error** — the UI said the approval *failed*, but it had actually gone through. The probe hands the candle that report and instruments its path to a fix. It stalls wherever the org is illegible: no mapping from the user-facing error string → the code that emits it, undocumented clearance-approval flow, status/outcome mismatch buried in tribal knowledge.

Structured verdict (like `billing-coverage`): the run ends with exactly one line —
`FIX-READY: <file>:<symbol> — <one-line change>` (completed) or `BLOCKED: <what stopped you>` (stalled).

## Why this probe is un-hand-wavy: it already ran in production

This is not hypothetical. The **exact flow closed end-to-end in SKMD's production pipeline** (Quo report → Juniper → Claude Code), captured in `henry_quo_e2e.PNG`:

> ⚡ *"SKMD investigation done: found root cause of Henry's misleading clearance-approval error message."*
> ⚡ *"Fixed Henry's peptide-clearance bug report from Quo — pushed to `claude/practical-johnson-480669`."*

So the pairing is:
- **The screenshot proves the org *can* close the loop** (a frontier agent, full write access, real PR pushed).
- **The Linnaeus probe measures the friction that stood in the way** — read-only, standard candle, a comparable score. It's the *measurement* of what the production run *did*.

That's the honest division: we don't claim Linnaeus opened the PR; we claim Linnaeus **measures how operable the report→PR path is**, and we have live proof the path exists.

## Scope (decided — L15)

- **Hackathon build = read-only.** The probe locates the code, diagnoses root cause, and proposes a fix. It does **not** modify files or open PRs — no sandbox, no write creds, no live-PR risk at the booth.
- **Full report→PR execution** (reproduce → patch → open PR) is the production pipeline's job (the screenshot), and a **"Linnaeus Pro" roadmap** item — not the hackathon build.

## How to run

```bash
# read-only; not in the default battery (keeps the banked 5-probe board intact)
npx tsx scripts/run-audit.ts report-to-pr        # measured on Nemotron when CANDLE_BASE_URL is up
```

- **Measure it on Nemotron in the morning** for a real, comparable friction number (the standard candle). A dev-Haiku run stalls partly on *model* capability, not just org legibility — so the scored number must be the pinned candle, same as every other measured probe.
- Registered in `probes/registry.ts` as `report-to-pr`; deliberately **excluded from `BATTERY_IDS`** so it doesn't disturb `fixtures/demo.json`.

## The pitch line

> *"Here's the most common agent-in-an-org task: a customer reports a bug, and something has to carry it to a fix. This probe measures whether your org is legible enough for an agent to do that — and here's a screenshot of it actually happening in my production system last week."*
