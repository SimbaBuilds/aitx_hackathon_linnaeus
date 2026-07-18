# Demo: The Org-Change Delta — Linnaeus as Operability CI for the Enterprise

*The hero demo. A bounded, verifiable proof built on a real event: this week you put a new platform into production. The question Linnaeus answers — **did that change quietly make your org less operable, and where?***

Related: `hackathon_fit_thoughts.md` (strategy), `brainstorming_artifact.md` (thesis), `talking_points.md` (framing).

> **Framing note (the pivot):** the delta is a **regression Linnaeus *catches*, not an improvement Linnaeus *authors***. Run 1 audits the org before the change; the org then changes *on its own* (nxtyou → prod, a real event); Run 2 re-audits and operability has **regressed**. Linnaeus is the researcher that measures the drift — it does not close the loop. Remediation is a **typed recommendation it emits** for a human to decide on, never the thing that produces the number. This is what makes the delta un-gameable: *you didn't cause the change, so you can't teach to the test.*

---

## The one-sentence pitch

> You don't let a code change merge if it breaks the tests. **Linnaeus is the gate that catches when an *org* change silently breaks your operability** — it surfaces the regression the moment the change lands, and hands you a typed recommendation to pay it down before it calcifies. You decide the fix.

---

## Why a *change*, not an *audit*

Auditing a whole org is unbounded, hand-wavy, and impossible to verify on stage — a judge can't check "it found that knowledge lives in your head." So we don't audit the org. We measure the **operability delta of one concrete change**:

- **Bounded** — one event (platform → prod), not the whole company.
- **Verifiable** — *you are the ground truth.* The re-audit stalls at the exact spot the platform's change eroded, and you confirm live: "yes, that broke when nxtyou shipped."
- **Regression-shaped, honestly** — Run 1 (before) → the org changes for real → Run 2 (after) = operability dropped. The delta is a *caught regression*, not a score Linnaeus lifted by writing its own docs. Un-gameable because Linnaeus didn't author the change.
- **Heartbeat-native, honestly** — triggered by the org-change event, not a human clicking run. This is the real event-driven story: an operability CI gate that fires on the deploy.
- **Not the 5-minute toy** — nightly legacy-cleanup is the trivial codebase agent. Detecting that a *human org* got less operable from a real change, and localizing the *new* negative space, is the hard, novel thing.

---

## The narrative arc (what a judge watches)

1. **Baseline (Run 1).** Before this week's change, the candle carries a representative org workflow end-to-end (compute this month's client invoices) — the org was operable for that task. *(Optionally anchored by the real Quo bug: a production pass of the "client-report-to-fix" probe — evidence the battery measures something real.)*
2. **A change lands.** You put nxtyou into production. Real event, this week, you lived it. Nobody edited the billing logic to match.
3. **Linnaeus wakes on the change** (operability CI) and re-runs the *same* probe.
4. **Run 2 regresses** — the candle stalls / produces a wrong invoice, because the billing path predates nxtyou's D2C flow and nothing on record tells it how the new path prices. *A speed bump for you is a wall for the agent.*
5. **The finding is the shaped gap the change created.** Not "your platform is bad" — "the change moved the org into a state its own records no longer describe; operability regressed *here*." Negative space (and a stale code path), freshly created by the change.
6. **The delta is the regression.** Run 1 clean, Run 2 stalls, on the identical candle. That drop **is the score** — Linnaeus caught the drift the change introduced. *(This is the money shot; guard it — L12.)*
7. **Linnaeus emits a typed recommendation** — `Fix: update the billing script for nxtyou's D2C path` / `Document: where nxtyou billing lives`. It hands the human a decision; it does not silently mutate the org. *(Optional narration: "and here's the one-line Fix I'd apply" — shown, not required to produce the delta.)*
8. **The gate framing** — this is what runs on *every* future org change. You've turned "operability" from a vibe into a regression test.

---

## Concrete instantiation (fill in with the real specifics)

### The change
- **What went to prod this week:** `<the platform — name/what it does>`
- **What workflow it now participates in:** `<e.g. client onboarding / message triage / billing / clearance approval>`
- **The glue that lives only in your head:** `<config values, the "you have to also do X in the new platform" step, who owns it, how it fails, how it connects to the existing systems>`

### The probe (bounded + checkable)
The probe is a **single fixed task run twice** — before-state vs after-state — so the *change itself* is what moves the number. Authored against the real workflow so a wrong move is a scoreable stall:
- **Hero — "Compute this month's client invoices."** Run 1 against the pre-change scope (docuspa clients only) → completes. Run 2 against the post-change scope (now including nxtyou's D2C clients) → stalls / mis-prices, because the billing path predates the D2C flow. Same probe, same candle; the *org change* is the only variable. The regression is the delta.
- *(Alternates if the billing instance is thin: run the same before/after shape on "onboard a client end-to-end" or "the new platform misbehaves — diagnose and route." Same principle — identical probe, two org states, the change is what regresses it.)*

**Recommendation:** **the billing probe** — it's the most legible to a judge (a familiar business workflow), the regression is visually obvious (Run 1 clean, Run 2 walls at the D2C path), the fix is *pure code* (so the optional post-run narration needs no human-policy decision), and Cameron is exact ground truth.

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
- Seconds to first correct move on the D2C-billing step
- Surfaces/files opened before confident (or before giving up)
- Did it have to guess (low-confidence language)
- **Run 1 (before the change) vs Run 2 (after the change) on all of the above = the delta — a regression, not an improvement**

### The remediation (what Linnaeus *emits*, for a human to decide)
Remediation is **output, not a loop.** Linnaeus doesn't fix the org to manufacture the delta — the delta already came from the real change. Instead it emits a **typed recommendation** the candle authors directly (single model; no separate frontier author), and *you* decide whether to act:
- **`Fix`** — update the billing script for nxtyou's D2C path (pure code; the one type shown executed live because it needs no human-policy call).
- **`Document`** — where nxtyou billing lives / how the D2C path prices, written into the org's own records (Drive doc / repo `CLAUDE.md`).
- **`Connect` / `Grant`** — if the gap were reach/permission (e.g. the deploy step that lived only in a Gmail thread → an event hook) — *shown as a generated artifact in the UI/video, not wired live* (L26).

The recommendation is a **decision handed to the operator**, especially at the org level where what-to-grant / what-guardrail / when-a-human-is-in-the-loop is genuinely the human's call. Linnaeus prices the friction; it doesn't mandate the cleanup. *(Heavyweight strategic remediation-planning is the commercial roadmap — "Linnaeus Pro" — not the hackathon build.)*

### The trigger (the heartbeat)
- **Event:** platform-to-prod (or any org change — new vendor, process change, deploy).
- **Mechanism:** the Juniper event-dispatch pattern (trigger → dispatch → probe-run → persist), minus the NL gate. For the demo this can be a manual "a change just landed, run the gate" if the automated trigger isn't wired by Sunday — *narrate* the heartbeat, show the delta.

---

## The honesty guardrails (say these out loud — they're strengths)

- **Candle stays fixed & memory-less** across Run 1 and Run 2 (same model/quant/seed/temp, no private context) — so the *only* thing that changed between runs is the org itself. That's what makes the delta attributable to the change, not to Linnaeus learning. See `hackathon_fit_thoughts.md` §3.
- **Linnaeus didn't cause the regression — so it can't be gaming it.** The delta comes from a real org change you made independently; Linnaeus only measured the drift. There's no "I wrote the doc that tells the agent the answer, then the agent found the answer" circularity, because Linnaeus isn't the author of the change *or* (for the delta) the author of any fix.
- **Recursion = re-auditing an org that changed, not self-improvement.** The instrument is re-run against an evolved target; it doesn't get smarter, the org got less operable. That's the honest form of the loop.
- **Friction is scored, not correctness** — the stall is mechanically observable; you supply the correctness gate for free because you lived it.
- **Bounded claim** — "we measured the operability cost of *this change*," not "we audited your whole company." The bounded claim is the credible one.

---

## Where the codebase fits (demoted, not dropped)

The codebase becomes a **~20-second calibration cameo** *before* the org demo: "here's the instrument, measured on something you can all read — the cheap pre-scan heatmap lights up exactly where the probe-agent stalls." It proves the instrument works on a legible substrate, *then* you turn it on the hard org thing. Codebase = calibration; **org-change-delta = the hero.** (See the pre-scan → heatmap → probe-reveal in `talking_points.md`.)

---

## Open specifics to fill in (need from Cameron)

1. ✅ **Platform + workflow:** nxtyou.io → D2C intake/billing (see PLAN §3b).
2. ✅ **The gap:** the stale billing script (change-lag) + discoverability across 7 surfaces (L17) — not in-head glue.
3. ✅ **Probe:** the billing regression, run as before/after (L18). *Two runs; the code fix is optional post-run narration.*
4. ✅ **Surfaces:** SKMD monorepo, Notion, Gmail thread, GitHub, AWS RDS, Vercel/GoDaddy, Quo/Juniper (PLAN §3b).
5. 🔶 **Trigger (O5):** automate the Gmail-deploy-announcement → operability-CI fire, or narrate the heartbeat and show the delta. *Lock later.*
