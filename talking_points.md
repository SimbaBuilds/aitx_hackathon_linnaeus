# Linnaeus — Talking Points & Framing

*The presentation spine. `brainstorming_artifact.md` is where ideas get worked out; this is the ordered set of things to actually say, with the framing that makes each land. Pitch content, not design notes.*

---

## The one-liner

**Linnaeus measures how well an AI agent could operate inside your codebase or your organization — by dropping probe-agents that try to do real work and logging every place they stall. The friction log *is* the audit.**

If you have 15 seconds, that's the whole thing.

---

## The opening move (why this isn't circular)

Don't ask an agent to *assess* its own operability — "how discoverable do you think you'd be" is mush, and it's circular. Hand it a battery of real tasks and make it **try**. Instrument the run. Every stall, every guess, every "read four files to understand one contract," every missing schema — that's a finding.

The agent isn't the judge. It's the **probe**, and the system is the thing being measured.

> This is exactly how accessibility auditing already works. You don't ask a blind user to theorize about your site — you watch a screen reader hit the walls. Dogfooding, not circularity.

Because any competent agent hits the same walls, the agent is a **standard candle**: a fixed instrument you measure the system against. Same model, same harness, same battery, every time.

---

## The thesis (the heavy half — this is the talk)

Every organization runs on an enormous amount of undocumented glue that humans supply for free: knowing who to ask, remembering why a thing is wired the way it is, inferring intent from years of context, routing around whatever isn't written down.

**The documentation was never complete. Humans were the completion layer.**

An agent can't pay that debt. It can't read the room, can't draw on tribal context it was never given, can't corner someone in Slack. So a gap a human absorbs without noticing becomes a hard stop for a machine.

> **A speed bump for a person is a wall for a machine.**

The compounding isn't that gaps grow. It's that the moment you put agents to work across the org, **every gap the humans were silently covering becomes a visible, blocking failure — all at once, scaling with exactly how much you automate.** You didn't create new debt. You removed the layer that was hiding it, everywhere, simultaneously.

So operability, measured honestly, is one number: **how much your organization was secretly depending on human glue.**

---

## Shared conviction — Boris's "encode domain knowledge as infrastructure" post

Use this to show Linnaeus sits inside a live, credible movement. Boris (Anthropic) is arguing, independently, that the highest-leverage engineering work now is converting head-knowledge into agent-legible infrastructure. Same underlying conviction as Linnaeus — the friction that stops agents is knowledge that lives in heads instead of in the system.

His load-bearing claim:

> *"What gets in the way is domain knowledge that lives in peoples' heads rather than in automation… the domain knowledge that can be encoded as infrastructure is no longer limited to what is expressible in lint rules and types and tests; it can now capture nearly all domain knowledge, encoded as code comments and skills and CLAUDE.md rules and memories."*

And his target state is the same place the Linnaeus scale points to:

> *"Every team should be writing the CLAUDE.md's, REVIEW.md's, skills, and docs that enable agents to productively work in their codebase with zero additional context from the prompter."*

**The framing to say out loud — they compose, they don't compete.** Boris is describing the *remediation practice*, centered on software-engineering teams working in the Anthropic ecosystem — write the CLAUDE.md's, the skills, the review docs. Linnaeus is the *diagnostic* that pairs with it: it finds where that work is most needed, and it generalizes past the codebase to the broader org and enterprise, where the same undocumented-glue problem is larger and harder to see. The system diagnoses itself — you don't have to already know where the gaps are to start closing them.

His artifact taxonomy — **CLAUDE.md, REVIEW.md, skills, docs, memories** — is a natural fit for the remediation side of a Linnaeus finding: each friction hit points at a specific artifact worth creating. The diagnosis hands straight off to the practice he's advocating.

---

## Quality — as attribution, not as an axis

Quality is unavoidable (SWE principles for code, basic organization for enterprises) but Linnaeus never grades it in the abstract — that's the "how organized are you" app we're avoiding. The one rule:

> **Quality only enters as the explanation for observed friction — a root-cause attribution, never a score. Quality that causes no agent friction is invisible by design.**

You don't score spaghetti for being ugly; you score the *stall it caused* — four files read to change three lines. This is also why refactors stay the company's call: **Linnaeus prices the friction, it doesn't mandate the cleanup.** A diagnostic, not a linter with opinions.

**Quality is the codebase-side counterpart to negative-space detection.** The codebase has almost no negative space (framing #4), so legibility/quality friction carries the signal there instead — symmetric domains, not two products. (The legacy-legibility probe already works this way: a quality question reframed as friction.) Org-side quality is the same attribution move with an org taxonomy, always tied to a stall — bus factor, no runbook, ownership ambiguity, handoff opacity — mostly negative-space findings wearing a quality label.

### The pre-scan → heatmap → probe reveal (demo centerpiece — show, don't say)

Cheap static metrics first (DRY, LOC, cyclomatic complexity, coupling) → render as a **heatmap** → then drop the probes → **the heatmap lights up exactly where the agent face-plants.** Cheap prediction meets expensive observation. It validates the instrument, ships as a standalone day-one pre-screen, and makes the naturalist brand literal (field readings confirmed by direct observation). Metrics stay **predictors** — never summed into the headline.

*"The complexity map predicted where the agent would stall. The probe confirmed it."*

**The line to say out loud:** *"Linnaeus doesn't tell you if your codebase is clean or your company is well-run. It tells you where an agent will stall, and what about your setup made it stall. Quality only shows up when it costs you operability."*

---

## The four framings that carry the pitch

### 1. Two-layer scoring — the instrument can fail to load
- **Testability:** can the agent even *author* a valid probe here? To write "extend the core model safely" it first has to find the model, figure out what "safely" means, locate the auth boundary. If it can't author the probe, that's a **maximal operability failure**, logged before a single task runs — the system was so illegible the instrument couldn't load.
- **The test itself:** given a valid probe, can the task be completed?

### 2. Fixed category, synthesized instance
- The **category** is the fixed frame — a score is only meaningful against a stable denominator. An agent left to choose categories drifts toward probing what a system is *good* at.
- The **instance** is synthesized at runtime against the actual system, because a hardcoded specific measures surface mismatch, not operability.
- Rule: a probe is hardcodable exactly when its category has a **universal instantiation** — every system has an auth story, an entry point, a secrets story. "Extend the core data model" is too org-shaped to pin.
- Comparability comes from the fixed probes; longitudinal baseline comes from caching the synthesized ones. Neither can do the other's job.

### 3. Negative-space detection — the headline finding
You can't find tribal knowledge directly; by definition it isn't written down. You detect its **shadow**. When a probe dead-ends with no code fault, no owner, no doc, no discoverable reason — **that shaped hole is the finding.** "This works and nothing on record explains why" means the *why* is in someone's head. You located the knowledge not by finding it but by finding the exact gap where it should have been.

> The whole reason you want operability is to take the human out of the loop — and you can't do that until you know where he's standing.

### 4. Codebase as simulated org — and where the metaphor leaks
The isomorphism is real (Conway's Law: a codebase is a literal imprint of the org's communication structure). But: **a codebase is the part of the org that already got externalized** — writing code *is* forcing the implicit into machine-runnable form. So a codebase has almost no negative space by construction; if it did, it wouldn't run.

- The **probe engine ports perfectly.**
- The **headline finding (negative-space detection) does not port** to the codebase — there's barely any to find there.

That break is the entire value proposition, and it structures the demo.

---

## The demo, as a progression (say it in this order)

Run it on **your own production system** — real ground truth, because you're the one who knows every answer it should produce. That structurally solves the hollow-demo problem: the value was never the data, it was whether the call was *correct*, and you can vouch for correctness because you lived it.

- **Codebase proves the instrument works** — clean, verifiable, fast, legible to a builder-judge.
- **Org proves the instrument matters** — same engine, real messy solo org, finding the load-bearing person nobody documented.

The solo-consultancy angle is the *sharpest* case, not the watered-down one: in a solo org essentially all operational knowledge lives in one head, so the probe battery lights up on tribal knowledge and you can confirm every hit. *"I pointed this at my own company and it correctly found that most of my operational knowledge exists nowhere but my brain — here's the map of where I'm the single point of failure."*

**Pick 3–4 probes that make the score discriminate:**
- one that succeeds cleanly (that corner is well-wired)
- one that dies on a missing tool
- one that dies on a missing doc
- one that dies in the **negative space** — no artifact anywhere, the only source is your head

If every probe fails it looks rigged; if every probe succeeds there's nothing to sell. The spread is the point — and real discrimination is what protects a talk-heavy pitch from reading as hand-waving to builder-judges.

**Scope boundary, decided now:** the deliverable is the *pass* — the probe, the instrumented run, the friction report. The fixes are Monday's problem and they're the payoff you keep. The hour-six temptation to refactor auth because the agent stumbled there is the codebase pulling you off the thing you came to build.

---

## Two modes — measure, then capture (see `capture_mode.md`)

Linnaeus runs in two modes that compose as phases, not a toggle.

- **Passive mode (measure):** the silent probe finds the shaped hole and scores the friction. Clean, uncontaminated baseline. This is everything above — **and it's the mode that produces the hero delta**, by re-running across a real org change and catching the regression.
- **Capture mode:** each finding becomes a specific, answerable question — *"I couldn't tell whether `effective_until` was safe to add; nothing on record says why. Why?"* The human answers, and the candle authors the **typed recommendation** (`Document`/`Connect`/`Grant`/`Fix`/`Delete`) — which the human then decides whether to act on. Capture is the audit's **data-gathering + recommendation-authoring** layer; it is *not* what generates the delta.

Why it matters for the pitch:
- **The stall authors the question.** Generic "document your knowledge" dies on the blank page; a probe stall is specific enough to answer in a sentence. The audit produces its own interview.
- **Order is load-bearing.** Measure first (or you contaminate the standard candle by feeding it answers), *then* capture. *(The delta itself comes from re-auditing a changed org — not from re-measuring after you filled a gap.)*
- **It's the inverse value curve across the split:** passive mode carries the codebase (little negative space to interview about); capture mode carries the enterprise (mostly glue in heads, so the interview *is* the data-gathering).
- **It moves the payoff into the room.** The silent score is the pitch; the populated docs, the typed recommendations, and the org knowledge-map you walk out with are the deliverable — the human still owns the decision to act, but leaves holding it, not a blank page.

Framed to the thesis: capture mode *instruments the completion layer* — it catches what the human was supplying for free, at the exact moment the system fails without it.

---

## Scoring — how to talk about the number without overclaiming

- **Score friction, not correctness.** Friction is mechanically observable from the run (completed/stalled/had-to-ask, seconds to first correct move, files opened before confident, retries, dead-ends, backtracks, hedging language). No answer key required. Correctness needs ground truth and doesn't port to orgs you don't know.
- **Correctness as a gate, not the score.** Friction-only misses the *confident-wrong* run — low friction, wrong answer, the worst case. The own-system demo supplies that gate for free.
- **The single number is a lossy rollup — say so.** The real deliverable is a per-probe friction *vector*; "Operability: 61/100" is deliberately lossy marketing on top. Value is relative and longitudinal — *"friction 22 → 61 after nxtyou shipped"* (a caught regression), *"61 vs median 48"* — not the absolute.
- **Normalize the instrument, not the org.** Same model + harness + battery = the standard candle; normalize per-probe against the candle's baseline on a known-legible reference, not against headcount.

---

## Why this is worth building at all (the closer)

The floor is genuinely useful independent of the outcome: even if the event is a wash, you walk out with a real operability audit of your own production system and a first cut of a tool you'll reuse on client engagements. **The weekend's output is the business's input** — none of the alternatives could claim that. The deliverable was never the artifact; the artifact is the reason to be in the room.

---

## Sponsor tech — the "why vLLM / why Nemotron" (30 rubric pts + two bounties)

*30 of the 100 judging points are "Use of Sponsor Technology" — 15 for using it meaningfully, 15 for articulating **why** it was the right choice. This is also where the $500 vLLM cash and $100/head Nemotron bounties live. Say these out loud; don't make the judges infer them.*

**The load-bearing "why," in one sentence:**
> **Linnaeus is a measurement instrument, and an instrument has to be calibrated and stable. A hosted frontier API is an *uncalibrated* instrument — it drifts silently when the provider updates the model. Self-hosting the candle on vLLM *pins* it: exact weights, exact quant (FP8), `seed=42`, `temp=0`. That reproducibility is what makes "the only thing that changed between run 1 and run 2 is the org" a true statement instead of a hope.**

That's the strongest "why this sponsor tech" story available — for us vLLM isn't a cost optimization, it's a **correctness requirement** for the standard-candle thesis (the whole delta collapses if the instrument can drift).

**The vLLM bounty rewards three things by name — we hit all three:**
- **"The small-model punch"** — *"outsized utility from a small open model + agent scaffolding rather than brute-forcing with the biggest thing that fits."* Nemotron-3-Nano-**30B-A3B** is a mixture-of-experts with **~3B active parameters** — a genuinely small model. Our probe engine + friction instrumentation is the scaffolding that pulls a real regression signal out of it. *"A 3B-active open model, self-hosted, doing genuine agentic tool-use to measure org operability — small-model punch, not brute force."*
- **"Efficiency"** — continuous/in-flight batching, PagedAttention, concurrent requests. Receipt: `--max-num-seqs 8`, the full 5-probe battery batched concurrently in **242 s** on one H100.
- **"Real integration under a heartbeat, where concurrent/repeated inference makes throughput matter"** — their exact words. The trigger fires re-audits on a heartbeat → repeated batteries → throughput is load-bearing, not incidental.

**Why Nemotron specifically** (bounty requires a short written explanation — see `nemotron_bounty_writeup.md`):
- **Central, not a wrapper.** The candle *is* the instrument; every finding is a Nemotron tool-use trace. Remove Nemotron and there is no measurement.
- **Agentic tool-use is the whole job**, and Nemotron is built for it — `--tool-call-parser qwen3_coder --reasoning-parser nano_v3`, verified end-to-end. A plain completion model couldn't run the probes.
- **Output quality via evaluation, not vibes** — the two-layer testability gate + friction instrumentation *is* an evaluation/feedback loop around the model's output. The banked delta (16.8→70.5) is Nemotron-measured and reproducible.

**Track fit — say this cleanly (it's changed):**
- **We anchor to the cross-cutting bounties** (vLLM $500, Nemotron $100/head, Most Commercializable / Antler), which don't require a track and are where the pivoted Linnaeus genuinely wins.
- **Track home = Red Hat Live Data.** The always-on trigger (Gmail deploy-announcement → fire a re-audit; cron drift-sweep) *is* "an agent powered by real-time streaming data where the heartbeat earns its keep." Live source doing real work in the loop.
- **Do NOT pitch this as Recursive Intelligence.** That track rewards an agent that *gets smarter over time*; our delta is a *caught regression* (friction rises) produced by a deliberately **memory-less, fixed** candle — the opposite of self-improvement, and on purpose (it's what makes the delta un-gameable). Framing it there invites the judge to say "your agent didn't learn anything." Keep "recursion" = **drift re-detection**, never self-improvement.

---

## Lines to have loaded

- "The friction log *is* the audit."
- "The documentation was never complete. Humans were the completion layer."
- "A speed bump for a person is a wall for a machine."
- "You didn't create new debt. You removed the layer that was hiding it."
- "Operability is one number: how much you were secretly depending on human glue."
- "The absence is the finding."
- "You can't take the human out of the loop until you know where he's standing."
- "Boris is describing the remediation. Linnaeus is the diagnosis that pairs with it — and it diagnoses itself."
- "The friction that stops an agent is knowledge that lives in a head instead of in the system."
- "Quality only shows up here when it costs you operability."
- "Linnaeus prices the friction; it doesn't mandate the cleanup — you decide the fix."
- "The complexity map predicted where the agent would stall. The probe confirmed it."
- "The stall authors the interview question — the audit produces its own recommendation, and hands you the decision."
- "You don't let a code change merge if it breaks the tests. Linnaeus catches the org change that breaks your operability."
- "The delta isn't Linnaeus getting smarter — it's your org getting less operable, and Linnaeus being the only thing that noticed."
- "vLLM isn't a cost optimization here — it's how we keep the instrument calibrated. A hosted API that drifts under you can't be a standard candle."
- "Three billion active parameters, self-hosted, measuring a real regression. Small-model punch, not brute force."
- "Remove Nemotron and there's no measurement — every finding is a Nemotron tool-use trace."
