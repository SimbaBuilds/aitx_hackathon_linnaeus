# Probe: Legacy Legibility — a Linnaeus probe

*Stage name: **"Live vs. Legacy."*** ("Legacy Legibility" is the formal name — it ties to the project's legible/illegible vocabulary; use "Live vs. Legacy" when presenting.)

**Category (fixed):** Can the agent correctly distinguish *live* code from *legacy* code, and recover *why* the legacy is still there?

**Bucket:** Universal category, runtime-synthesized instance (same class as "extend the core data model"). Cached per-org for the longitudinal baseline. **Not** a cross-org static probe.

**Role in the demo:** This is the *negative-space* probe on the codebase side. It's the one place a codebase carries real tribal knowledge — legacy-with-no-documented-reason is the "why" living in someone's head — so it bridges the negative-space thesis onto the legible, verifiable codebase before it ports to the org.

---

## The reframe

The naive version — *"does this codebase practice good backwards compatibility?"* — is a **code-quality judgment**: subjective, org-dependent, and wrong altitude. It measures how *good* the system is, which the instrument is explicitly not for.

The operability version:

> Hand the agent a real task that requires it to classify the code, then instrument whether it can tell live from legacy and recover the retention rationale. Every misclassification, every "I can't tell," every rationale it can't find is a finding.

We are not asking whether backwards compat *exists*. We are asking whether the codebase is **legible about its own legacy**.

> This probe is the template for how *all* code-quality concerns enter Linnaeus: a quality question (backwards-compat hygiene) reframed as a friction/legibility measurement, never graded in the abstract. Quality only counts when it costs the agent operability. See `talking_points.md` → "Quality — as attribution, not as an axis." The static dead-code detector in the signals list below is the cheap **pre-scan** for this probe — where it disagrees with the agent's live/legacy call is exactly where the heatmap should light up.

---

## Why legacy is the codebase's negative space

The core thesis holds that a codebase has almost no negative space "by construction — if it did, it wouldn't run." Legacy-but-still-wired code is the exception that proves it: a deprecated path that nothing on record explains is literally undocumented glue resident in a human's head. The absence of a documented reason *is* the finding — the same shape as the org-side headline, found on the side you can verify.

**Canonical calibration instance (SKMD): the prescription-PDF orphan.** In Cameron's codebase, prescription PDFs are generated/exist but **not wired up** — orphaned legacy (why-nowhere: nobody decided to keep it, it just wasn't pruned). A candle asked to work near that path can't tell if it's live or dead. This is the concrete instance for the demo's ~20-second **codebase calibration cameo**: the probe stalls classifying it, root-cause = *"no deprecation marker, no removal condition, no coexisting live caller,"* remediation = **Delete** (or Document, if there turns out to be a real future-use reason). Cameron is ground truth, so correctness is free.

## Why LLM-generated codebases make this the critical probe

The mechanism that generates the legacy is the same limit the probe measures.

**It's an information limit, not fear.** An LLM edits from local context and can't verify the global safety of a *deletion*. Adding a path is locally safe — it can prove the new code works in front of it. Removing a path requires knowing nothing else depends on it, which needs the whole-system view it doesn't have. So the locally-rational move is always additive. The generator can't tell what's safe to delete; the auditor can't tell what's live vs legacy — **same blindness, one creating the mess and one detecting it.** Illegible legacy isn't a side effect of LLM codebases; it's the native output of how they're built.

**Two kinds of legacy — LLM bases produce the wrong one:**

- **Deliberate legacy** — kept for deploy-skew or revert, a decision was made, ideally documented with a removal condition. The "solid CI/CD habits" version. Legible, or at least legible-*able*.
- **Orphaned legacy** — a new path was added, the old one was never pruned, nobody decided anything. LLM speed + fast pivots + no pruning agent produces this in bulk.

Orphaned legacy breaks the tidy negative-space story. "Legacy-without-rationale = tribal knowledge, the why is in someone's head" assumes a decision was made. Orphaned LLM legacy is **worse than tribal knowledge: the why isn't in anyone's head, because there is no why.** Nobody chose to keep it; it just wasn't deleted. So the probe detects two different absences that remediate *oppositely*:

- **Why-in-a-head** → tribal knowledge → **document it.**
- **Why-nowhere** → decision-debt / entropy → **delete it.**

Only the first is negative space in the original sense. A good version of this probe tries to tell them apart, because "there's a reason you can't find" and "there is no reason" are opposite findings.

**The self-reinforcing loop is the pitch.** LLM adds a path and orphans the old one → the next agent can't tell live from legacy → it extends or reasons over the *wrong* stratum → more orphaned legacy. **Operability degradation is self-accelerating in agent-built systems.** Human codebases have a pruning force (someone deletes dead code in review); vibe-coded ones — especially from non-technical users — have no pruning agent and no completion layer, no senior eng carrying the "that's dead, ignore it." The negative space isn't just large, it's *growing on its own*, and this probe measures the rate. That's the forward-looking version of the headline thesis: a failure mode that compounds precisely as you hand more of the building to agents.

Flag: "human codebases have a pruning force" is not a given - falls into the overused illusion of human run codebases being somehow more optimized or responsibly managed

Three reasons why LLMs retain legacy code: context limitations, deploy skew, and preservation for rollback

## Best-practice frame (what "good" means here)

Legacy code is **not** debt. Legacy code without a documented **expiry condition and rationale** is.

The two legitimate reasons to keep a legacy path are both time-boxed by definition:

1. **Deploy skew** — front end and back end do not ship atomically; the old contract must survive the window where one is deployed and the other isn't, or live users hit errors / downtime.
2. **Revertability** — the ability to roll back to the prior implementation if the new one fails in production.

Because both are inherently time-boxed, every legitimate piece of backwards-compat has a natural answer to *"when does this die?"* So the gold standard is not "no legacy" — it's that **every legacy path carries why it exists and the condition under which it's removed.** A codebase that documents that is maximally operable precisely because it externalizes the deploy-skew glue instead of leaving it in the senior engineer's head.

Rubric line: legacy-with-removal-condition = legible; legacy-without = negative space.

---

## Instance synthesis (runtime)

The category is fixed; the specific instance is authored against the actual system at runtime and then cached. To synthesize a valid instance the agent must:

1. Locate a genuine legacy / deprecated / superseded path in *this* codebase (e.g. a versioned endpoint, a shim, a dual-write, a compatibility branch, a flagged old code path).
2. Identify the live path that replaced or coexists with it.
3. Author a concrete task that forces classification — e.g. *"extend behavior X"* where X exists in both the live and legacy path, so choosing the wrong one is a scoreable error.

**Testability gate:** if the agent cannot even find a legacy/live pair to author against — no discoverable deprecation surface anywhere — log the testability outcome (either the system is genuinely legacy-free, or its legacy is so illegible the instrument couldn't load) before any task runs.

---

## Scoring — three asymmetric failure modes

| Mode | What happens | Severity |
|---|---|---|
| **False positive** — thinks live code is dead | Agent ignores or deletes a load-bearing path it misread as legacy | **High** |
| **False negative** — thinks dead code is live | Agent wastes effort on, or *extends*, a deprecated path | Medium |
| **Rationale gap** — classifies correctly, can't recover the "why" | Code is identifiably legacy but nothing states why it's retained or when it's removed | **The negative-space finding** |

The first two measure whether the agent can *classify*. The third measures whether the codebase carries its own *reason* — and its failure is the shadow that locates tribal knowledge.

**Split the rationale gap by where the "why" lives**, because the two remediate oppositely (see "Why LLM-generated codebases make this the critical probe"):

- **Why-in-a-head** — the retention was a real decision, just undocumented. Tribal knowledge → *document it.* This is negative space in the original sense.
- **Why-nowhere** — orphaned legacy, no decision was ever made. Decision-debt / entropy → *delete it.*

The probe can't always tell these apart from the code alone, but it should try (does anything — a commit, a flag, a coexisting live path — suggest a deliberate decision, or does the path look purely abandoned?). Labeling the gap as document-it vs delete-it is the difference between a finding the org acts on and a number it just reads.

---

## Signals the probe instruments against

**Presence / quality of legibility markers:**
- Deprecation markers (`@deprecated`, `DeprecationWarning`, annotations)
- Docstrings stating a **retention reason + removal condition** (e.g. "kept until mobile client ≤3.1 is sunset, ~Q3")
- Versioned endpoints / explicit API versioning
- Feature flags gating old vs new paths
- ADR / CHANGELOG / commit references explaining the transition
- Agreement or disagreement with a static dead-code detector

**Friction-log metrics (per the notes):**
- Found the rationale? (T/F)
- Seconds to classify a given path as live vs legacy
- Number of files the agent had to read to be confident
- Whether it misclassified (which of the three modes above)

---

## Scoring model

**Separate correctness from friction — score the one that's free.**

- **Correctness** (did the agent classify live-vs-legacy right, did it recover the true rationale?) needs ground truth and is subjective. It does not port to an org you don't personally know.
- **Friction** (how hard did the agent have to work to get there?) is mechanically observable from the run — no answer key required.

Per the core thesis, the friction log *is* the audit. So the score is built from friction, and this probe is more scoreable than it first looks: "how many files did it read, and did it have to guess which path was live" is pure friction — you can score the *struggle* even on a run where you'd struggle to score the *answer*.

**Objective friction signals (no ground truth needed):**
- Completed / stalled / had-to-ask (T/F)
- Seconds to classify a path as live vs legacy
- Files opened before it was confident
- Tool-calls, retries, dead-ends, backtracks
- Whether it had to guess (low-confidence language, "assuming…")

**Correctness as a gate, not the score.** Friction-only rewards the *confident-wrong* run — agent breezes through, low friction, wrong classification. So keep a coarse correctness check to catch confidence-without-correctness. On the demo (NxtYou/DocuSpa) you supply that gate for free because you lived it; in the product, approximate it with proxies (does it compile, does the trace connect, do parallel agents converge). Map the gate result onto the three failure modes above — a low-friction run that trips the false-positive mode is the highest-severity outcome precisely *because* it was confident.

**Rollup.** The per-probe output is a friction vector; any single legacy-legibility number is a deliberately lossy rollup. Its value is relative/longitudinal — the *change* across runs — e.g. "a refactor left a new legacy path unmarked and the classification friction rose" (a caught regression), or the reverse if the org documented it. The instrument reports the drift either direction; it doesn't author the improvement. Not an absolute grade.

## Caveat for demo selection

This probe is **interpretation-heavy to grade** — "did the agent classify correctly" requires ground truth about what is actually legacy in the target system. That is fine here because the target is your own production system (NxtYou / DocuSpa), where you can vouch for correctness. But it is more subjective on stage than "died on a missing tool." Slot it as the **negative-space probe** in the spread, not the clean-success one.
