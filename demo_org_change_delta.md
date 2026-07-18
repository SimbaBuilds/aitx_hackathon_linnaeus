# Demo: The Org-Change Delta — Linnaeus as Operability CI for the Enterprise

*The hero demo. A bounded, verifiable, recursive proof built on a real event: this week you put a new platform into production. The question Linnaeus answers — **did that change quietly make your org less operable, and where?***

Related: `hackathon_fit_thoughts.md` (strategy), `brainstorming_artifact.md` (thesis), `talking_points.md` (framing).

---

## The one-sentence pitch

> You don't let a code change merge if it breaks the tests. **Linnaeus is the gate that won't let an *org* change land if it silently breaks your operability** — it catches the tribal knowledge a change creates, the moment it's created, and makes you pay it down before it calcifies.

---

## Why a *change*, not an *audit*

Auditing a whole org is unbounded, hand-wavy, and impossible to verify on stage — a judge can't check "it found that knowledge lives in your head." So we don't audit the org. We measure the **operability delta of one concrete change**:

- **Bounded** — one event (platform → prod), not the whole company.
- **Verifiable** — *you are the ground truth.* The probe stalls at the exact undocumented spot the platform introduced, and you confirm live: "yes, only I knew that."
- **Recursive-delta-shaped** — stall → document → re-probe passes. The same before/after structure that reads cleanly on a codebase, now on the genuinely-hard org substrate.
- **Heartbeat-native, honestly** — triggered by the org-change event, not a human clicking run. This is the real event-driven story.
- **Not the 5-minute toy** — nightly legacy-cleanup is the trivial codebase agent. Detecting that a *human org* got less operable from a real change, and localizing the *new* negative space, is the hard, novel thing.

---

## The narrative arc (what a judge watches)

1. **Baseline.** Before this week, an agent could carry a representative org workflow end-to-end (e.g. onboard a client / resolve a client issue) — the org was operable for that task. *(Optionally anchored by the real Quo bug: a production pass of the "client-report-to-fix" probe — evidence the battery measures something real.)*
2. **A change lands.** You put a new platform into production. Real event, this week, you lived it.
3. **Linnaeus wakes on the change** (operability CI) and re-probes the affected workflow.
4. **The probe stalls** — at the exact spot where the new platform's knowledge (config, ownership, how-it-slots-into-the-flow) lives only in your head. *A speed bump for you is a wall for the agent.*
5. **The finding is the shaped gap.** Not "your platform is bad" — "nothing on record explains how this new piece participates in the workflow; the only source is you." Negative space, freshly created.
6. **Linnaeus remediates** — writes the runbook / ownership entry / config note into the org's own records.
7. **Re-probe passes.** Same candle, workflow now completes. **The delta is the score.**
8. **The gate framing** — this is what runs on *every* future org change. You've turned "operability" from a vibe into a regression test.

---

## Concrete instantiation (fill in with the real specifics)

### The change
- **What went to prod this week:** `<the platform — name/what it does>`
- **What workflow it now participates in:** `<e.g. client onboarding / message triage / billing / clearance approval>`
- **The glue that lives only in your head:** `<config values, the "you have to also do X in the new platform" step, who owns it, how it fails, how it connects to the existing systems>`

### The probe (bounded + checkable)
Pick ONE, authored against the real workflow so a wrong move is a scoreable stall:
- **Option A — "Reproduce this week's work from the records alone."** Task the agent to stand up / configure / integrate the new platform using only what's written down. It stalls where the knowledge isn't. *(Most direct answer to "keep my org as operable as it was.")*
- **Option B — "Run the workflow end-to-end, now that the platform is in the loop."** e.g. onboard a client / resolve a client issue that now touches the new platform. It completes the old steps, stalls at the new undocumented one.
- **Option C — "The new platform misbehaves — diagnose and route."** Agent must figure out what depends on the platform and who owns it. Stalls on the missing ownership/dependency map.

**Recommendation:** **Option B** — it's the most legible to a judge (a familiar business workflow), the stall is visually obvious (three steps work, the fourth wall), and it directly dramatizes "a change made my org less operable."

### The surfaces the probe touches (how an agent "operates" your org)
Your org's substrate = your real digital surfaces, most of which you already have MCP access to:
- **Google Drive** — runbooks, SOPs, onboarding docs, config notes
- **Gmail** — client threads, vendor setup, the actual context
- **The codebases** — where the platform integrates
- **The platform's own config / dashboard**
- **Juniper / Quo** — the automation + messaging layer

The probe-agent attempts the workflow *across* these surfaces and logs where it stalls — no doc, no owner, no discoverable config, only-source-is-you.

### The friction signals (what gets measured — no answer key needed)
- Completed / stalled / had-to-ask (T/F)
- Seconds to first correct move on the new-platform step
- Surfaces/files opened before confident (or before giving up)
- Did it have to guess (low-confidence language)
- **Run 1 vs Run 2 on all of the above = the delta**

### The remediation (what Linnaeus writes back)
- A **runbook / SOP** for the new platform's role in the workflow
- An **ownership + dependency** entry (who owns it, what depends on it)
- The **config / integration note** that was in your head
- Written into the org's *own* records (Drive doc / repo `CLAUDE.md` / runbook), **not** hoarded in Linnaeus's memory — so Run 2's candle legitimately finds it easier because the knowledge is now *externalized* (the Boris point, and what keeps the delta honest).

### The trigger (the heartbeat)
- **Event:** platform-to-prod (or any org change — new vendor, process change, deploy).
- **Mechanism:** the Juniper event-dispatch pattern (trigger → dispatch → probe-run → persist), minus the NL gate. For the demo this can be a manual "a change just landed, run the gate" if the automated trigger isn't wired by Sunday — *narrate* the heartbeat, show the delta.

---

## The honesty guardrails (say these out loud — they're strengths)

- **Candle stays fixed & memory-less** across Run 1 and Run 2 (same model/quant/seed/temp, no private context) — else you're measuring Linnaeus's memory, not the org. See `hackathon_fit_thoughts.md` §3.
- **Improvement is externalized, not cached** — the docs live in the org's records, portable to any agent. That's what makes the recursion real instead of metric-gaming.
- **Friction is scored, not correctness** — the stall is mechanically observable; you supply the correctness gate for free because you lived it.
- **Bounded claim** — "we measured the operability cost of *this change*," not "we audited your whole company." The bounded claim is the credible one.

---

## Where the codebase fits (demoted, not dropped)

The codebase becomes a **~20-second calibration cameo** *before* the org demo: "here's the instrument, measured on something you can all read — the cheap pre-scan heatmap lights up exactly where the probe-agent stalls." It proves the instrument works on a legible substrate, *then* you turn it on the hard org thing. Codebase = calibration; **org-change-delta = the hero.** (See the pre-scan → heatmap → probe-reveal in `talking_points.md`.)

---

## Open specifics to fill in (need from Cameron)

1. **Which platform** went to prod this week, and **what workflow** does it now touch?
2. **What's the actual in-your-head glue** it introduced (the thing the probe should stall on)?
3. Which **probe option (A/B/C)** best matches a workflow you can demo and vouch for?
4. Which **surfaces** does that workflow genuinely span (Drive? Gmail? which repo? the platform dashboard)?
5. Is the automated **trigger** worth wiring for the demo, or do we narrate the heartbeat and show the delta?
