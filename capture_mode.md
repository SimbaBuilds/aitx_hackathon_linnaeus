# Linnaeus — Capture Mode

*A second mode for Linnaeus. Passive mode measures — it finds the shaped hole and scores the friction. Capture mode captures — it uses each finding to get what's in the human's head out into the system. This doc covers why the two compose, how they're phased, and the design decisions the phasing forces.*

> **Name:** *Capture mode* — the naturalist collecting specimens rather than just surveying the habitat. Same instrument, different act. Passive mode measures; capture mode captures.

> **⚠️ SCOPE CORRECTION (2026-07-18 pivot).** Capture mode is **the audit's data-gathering + typed-recommendation-authoring layer — NOT the source of the hero delta.** The delta comes from the **org changing on its own** (a real regression the re-audit catches), never from "measure → fill → re-measure → score rose." So wherever this doc says the re-run/re-measure *produces* the delta (e.g. "step 3 produces 40 → 65 after documenting X"), read that as **superseded**: capture enriches findings and authors the recommendations a human decides on; it does not close a self-improvement loop and does not generate the headline number. The "acceptance-test re-run" survives only as an *optional closure check on an executed pure-code `Fix`*, decoupled from the delta. Everything else in this doc (the stall-authors-the-question property, the two streams, batching, write targets, provenance) stands.

---

## The gap it fills

The passive probe dodges the "how would it know what it doesn't know" problem elegantly: it never enumerates the unknowns. It *tries* a real task and hits a wall, and the wall is objective. Negative-space detection finds the shaped hole without needing to know its contents.

But that's exactly the limit. **Hitting the wall tells you where the gap is, not what fills it.** The passive probe can locate the single-point-of-failure in someone's head; it cannot get what's in that head *out*. Capture mode is the mechanism that does.

So the two modes aren't interchangeable versions of the same thing. Capture mode takes the passive audit's *output* and uses it as the *input to capture*.

---

## The killer property: the stall generates the interview question

"Just document your domain knowledge" always fails on the blank page — generic prompts get generic non-answers. A probe stall is the opposite of generic. It's specific enough to answer in one sentence:

> *"I tried to extend the staffing model and couldn't determine whether `effective_until` was safe to add — nothing on record explains why the current field is shaped this way. Why?"*

That question is answerable because the probe already did the work of locating exactly what it couldn't resolve. Every friction finding is a pre-formed, high-signal interview prompt — a far better elicitation engine than any "let's write some docs" exercise. **The probe doesn't just find the gap; it authors the precise question that unlocks it.**

---

## Two capture streams

Capture mode has two triggers, feeding the same artifacts:

- **Recoverable knowledge — journal / write-back (no human needed).** What the agent *did* figure out by exploration ("`X` connects to `Y` through this contract; the auth boundary is enforced here"). Write it back automatically. Cheap, immediate value: the next agent doesn't re-derive it. This is the "documenting as it goes" behavior.
- **Unrecoverable knowledge — interview (turns to the human).** What the agent *couldn't* figure out, no matter how much it read. That's the finding that turns to you. Capture your answer verbatim plus the agent's synthesis.

Stream one is a journal; stream two is an interview. Same mode, two triggers, one output surface.

---

## The trap: don't contaminate the measurement

The moment the agent can ask a human, the **standard-candle property breaks** — you can't score operability cleanly while feeding the instrument the answers. So passive and capture are not a toggle you flip mid-run. They're **ordered phases:**

1. **Silent probe** → clean friction score. The baseline, uncontaminated by any human help. *(This is what the hero delta compares across a real org change — Run 1 vs Run 2.)*
2. **Capture pass** over the findings → gather recoverable knowledge (write-back) + the answers to any unrecoverable gaps, and **author the typed recommendation** (`Document`/`Connect`/`Grant`/`Fix`/`Delete`) the human will decide on.

> **⚠️ The old step 3 — "re-run the same probes → the delta" — is superseded.** Capture does **not** produce the delta. The delta is the regression the re-audit catches when the *org itself* changes (see `demo_org_change_delta.md`). Keeping capture strictly *after* the silent measurement still matters — for the standard-candle purity of any given run — but re-measuring-after-you-filled-the-gap is no longer the pitch's number.

---

## Optional closure check (not the delta)

Because the same instrument that found the gap can re-attempt the task, an **executed pure-code `Fix`** can be verified for free: **does applying the Fix make the probe pass again?** This is an *optional closure demonstration* on top of the regression delta — "here's the caught regression, and here's the one-line Fix closing it" — not the mechanism that generates the headline number. For non-code remediations (`Document`/`Connect`/`Grant`), closure is a human decision, so there's no automatic re-run to claim.

---

## Why this maps onto the thesis

The core thesis is that humans were the completion layer — paying the documentation debt invisibly, every day, through improvisation. Capture mode **instruments the completion layer**: it catches what the human supplies for free, in the exact moment the system fails without it, so that contribution stops being free and invisible and becomes a durable artifact. It's the mechanism that actually takes the human out of the loop — after passive mode showed you where he was standing.

---

## Where it pays off most

Capture mode's value is the **inverse** of passive mode's across the codebase/org split:

- **Codebase** has little negative space by construction (writing code already externalized the implicit). So there's little to interview about — passive mode does most of the work here, and capture mode mostly runs stream one (write-back).
- **Enterprise / org** is mostly glue still resident in heads. There's little to *read*, so the interview *is* the primary data-gathering. Capture mode is how Linnaeus earns its keep on the org side.

Passive mode proves the instrument on code; capture mode is what makes it matter in the enterprise.

---

## Design decisions the phasing forces

- **Batch, don't interrupt.** Constant mid-run questions are hostile. Run the battery, collect the stalls, then present a *prioritized* interview — ranked by friction severity and blast radius — so the human answers the highest-leverage gaps first. (Hybrid option: capture cheap recoverable items inline, batch the deep unrecoverable ones.)
- **Write targets are a real decision.** Capture mode stops being read-only and starts mutating the system — CLAUDE.md, docstrings, a knowledge base, REVIEW.md. In an enterprise that write access needs care, review, and a clear home for each artifact type. Map each finding to a target the way Boris's taxonomy suggests (comment / skill / CLAUDE.md / doc / memory).
- **Output is NOT only documents.** Boris's taxonomy is doc-centric because it's about codebases. At the *org* level the fix is frequently that the agent can't *reach* or isn't *allowed* to do something — so capture mode must emit **connection specs, permission requests, and code stubs**, not only markdown. The full remediation taxonomy is five types — **Document / Connect / Grant / Fix / Delete** (see PLAN L25). "Get it out of their head" often means producing a *wired integration* or a *granted permission*, not a transcript — that's what actually removes the human from the loop. The re-probe (acceptance test) checks whether the gap closed *regardless of remediation type*, which keeps the delta honest across all five. (Hackathon scope: Document + Fix are executed for real; Connect + Grant are generated artifacts shown in the UI/video — see PLAN L26.)
- **Capture provenance.** Store the human's answer verbatim alongside the agent's synthesis, so a later reader can tell what was said from what was inferred.
- **Attribution to the re-run.** Tie each captured artifact to the probe it was meant to unblock, so the acceptance test is unambiguous and the delta is attributable to specific captures.

---

## The commercial shape

The silent score is the **pitch** — "here's where you're secretly depending on human glue, and here's the regression your last change introduced." The populated CLAUDE.md's, the typed recommendations, and the org knowledge-map you walk out with are the **deliverable people pay for.** Immediate ROI in a consulting engagement: sit with the client, run the battery, and every stall becomes a captured artifact + a typed recommendation before you leave the room.

This is the answer to "the passive audit's value is deferred to Monday": capture mode moves the *authoring of what-to-do-about-it* into the session — the **human still decides** whether to act (especially on org-level `Connect`/`Grant` calls), but they leave holding the recommendation, not a blank page.

*(Note: capture mode is not the source of the hero delta — that's the re-audit catching a real change's regression. Capture is how the session turns findings into decidable recommendations.)*
