# Linnaeus — Agent Operability Audit (Hackathon Build)

> **Name:** *Linnaeus*, after the father of taxonomy — the field scientist who studies a living system and classifies what he finds. The metaphor fits the thesis: an organization is a living system (Conway's Law, tribal knowledge as glue), and the tool is the naturalist that goes into the habitat, observes it operating, and classifies what's load-bearing, what's legacy, and where knowledge lives. The Live-vs-Legacy probe is the taxonomist's core act.

A probe-based system that measures how well an AI agent could operate inside a codebase or an organization. You run it, it tries to do real work, and every place it stalls becomes a finding. The friction log *is* the audit.

---

## The core move

Don't ask an agent to assess operability by introspection — "how discoverable do you think you'd be" is mush, and it's circular. Instead, hand the agent a battery of representative tasks and make it *try* to do them. Instrument the run. Every point where it stalled, guessed, had to read four files to understand one contract, or found no schema and no tool description — that's a finding.

The agent isn't judging discoverability. It's the probe, and the system is the thing being measured. This is how accessibility auditing already works: you don't ask a blind user to theorize about your site, you watch a screen reader hit the walls. Dogfooding, not circularity. Discoverability is the thing you learn by trying to discover and logging where you couldn't.

Any competent agent hits the same walls, which makes the agent a **standard candle** — a fixed reference you measure the system against.

---

## Two-layer scoring

The measurement happens twice, at two different altitudes:

- **Testability** — can the agent even author a valid probe for this category? To write a good specific probe it first has to find the core data model, figure out what "safely" means here, locate the auth boundary. If it can't author the probe — can't find the model, can't tell what safe would mean — that's already a maximal operability failure, logged before a single task runs. The system was so illegible the instrument couldn't load.
- **The test itself** — given a valid probe, can the task actually be completed?

Two failure classes, both real, both scored.

---

## Probe architecture: fixed category, synthesized instance

**The category is the fixed frame.** A score is only meaningful against a stable denominator. If the agent picks both what to test and how, every org gets graded on a different rubric and the number stops meaning anything — and an agent left to choose categories drifts toward probing what a system is *good* at, because competence surfaces legibly. Fixed categories are the instrument's calibration. The thing being measured doesn't get to recalibrate the instrument.

**The instance is synthesized at runtime.** A hardcoded specific like "add `effective_until` to the staffing model" is meaningless in an org without that model — you'd be measuring surface mismatch, not operability. The specific probe has to be authored against the actual system or it isn't testing that system.

So: *"Can an agent extend a core data model safely"* is the invariant. *What* the core model is, and what extending it safely requires here, is runtime discovery.

### The hardcoded / runtime split isn't a taste toggle

It's forced by whether the category has a **universal instantiation**.

- Some categories are universal enough to pin the instance, because every system instantiates them by definition: *"find where auth is enforced and describe the boundary," "trace one request end to end," "locate where secrets are configured."* Every codebase has an auth story, an entry point, a secrets story — the task is fixed and universal even though the answer differs everywhere. Org-side equivalents: *"who owns the customer relationship," "how does a new client get onboarded."*
- Others are too org-shaped to pin and must be synthesized: *"extend the core data model"* depends entirely on what the core model *is*.

The rule: a probe is hardcodable exactly when its category is universal enough that the specific ports without modification. That's a sharper rule than "a few of each" — it tells you which bucket each probe goes in instead of leaving it to feel.

### Two axes, two mechanisms

These come from two different properties and are not symmetric:

- **Cross-org comparability** comes from the fixed domain-neutral probes — everyone runs the identical task, so scores compare across organizations. This requires universality *by construction*.
- **Longitudinal baseline** comes from caching the runtime-synthesized probes per org — the same org re-runs its own pinned probes over time, so a score movement means the *org* changed, not the instrument. This requires *stability*, which you get from caching, not from universality.

The fixed set carries comparison; the cached set carries continuity. Neither can do the other's job — the runtime probes are bespoke by design and can't be made cross-org comparable, and that was the whole point of synthesizing them.

### Validity across runs (product concern, not weekend concern)

Runtime-authored probes make scores noisy across runs — the agent might synthesize an easier probe today than yesterday for the same category, and the number wobbles for reasons unrelated to the org changing. For the demo this doesn't matter. For the product it's the core validity problem: pin the specific probes on first run, version them per org, and only re-synthesize deliberately. That's the line between a cute demo and a measurement you'd stake a consulting recommendation on.

**This is exactly what the hero demo turns into a feature.** Pin the probe, hold the candle fixed, and re-run across a *real org change* — then any friction movement is attributable to the org, not the instrument. That's **drift/regression detection**: Run 1 (before the change) → the org changes on its own (nxtyou → prod) → Run 2 (after) shows the operability regression the change introduced. The audit doesn't improve the org across runs; it *catches* what a real change did to operability, and emits a typed recommendation the human decides on. Recursion here = re-auditing a changed target, which is the honest form of the "delta between runs" story. See `demo_org_change_delta.md`.

---

## Multi-agent shape

Each probe is an isolated run — probe three's context shouldn't bleed into probe five's, and they're embarrassingly parallel. Independent agents per probe is a real architectural call, not a bolt-on to satisfy the format's appetite for "agentic."

---

## The demo

Run it over your own production system — the live codebase (NxtYou/DocuSpa) **and** Hightower as an org. Real ground truth you can verify, because you're the person who knows every answer it should produce. That solves the hollow-demo problem structurally: the value was never the enterprise data, it was whether the call was *correct*, and here you can vouch for correctness because you lived it.

The solo-consultancy angle is the sharpest case, not a watered-down one. In a solo org essentially all operational knowledge lives in exactly one head — yours — so a probe battery lights up on the tribal-knowledge finding, and you can confirm every hit. *"I pointed this at my own company and it correctly found that most of my operational knowledge exists nowhere but my brain — here's the map of where I'm the single point of failure."*

**Choose 3–4 probes that make the instrument discriminate.** Not dozens — dozens is the product roadmap. The demo's job is proving the score *means something*:

- one probe that succeeds cleanly (that corner is well-wired)
- one that dies on a missing tool
- one that dies on a missing doc
- one that dies in the **negative space** — no artifact anywhere, the only possible source is something in your head

The spread is the whole point. If every probe fails, it looks rigged; if every probe succeeds, there's nothing to sell. Real discrimination is also what protects a talk-heavy pitch from reading as hand-waving to builder-judges.

**Scope boundary, decided now while it's abstract:** the deliverable is the *pass* — the probe, the instrumented run, the friction report. The fixes are Monday's problem and they're the payoff you keep. The temptation at hour six will be to refactor auth because the agent stumbled there; that's the codebase pulling you off the thing you came to build.

---

## The thesis (the heavier half — talk content)

Every organization runs on an enormous amount of undocumented glue that humans supply for free: knowing who to ask, remembering why a thing is wired the way it is, inferring intent from years of context, routing around whatever isn't written down. That glue was always load-bearing — it just never showed up on a balance sheet, because humans pay the debt invisibly, every day, through improvisation. **The documentation was never complete. Humans were the completion layer.**

An agent can't pay the debt that way. It can't read the room, can't draw on tribal context it was never given, can't and shouldn't improvise past a gap by cornering someone in Slack. So a gap a human absorbs without noticing becomes a hard stop for an agent — **a speed bump for a person is a wall for a machine.**

The compounding isn't that gaps grow. It's that the moment you put agents to work across the org, every gap the humans were silently covering becomes a visible, blocking failure — all at once, scaling with exactly how much you automate. You didn't create new debt. You removed the layer that was hiding it, everywhere, simultaneously.

So operability, measured honestly, is one number: **how much your organization was secretly depending on human glue.**

### Negative-space detection

You can't find tribal knowledge directly — by definition it's not written anywhere. You detect its *shadow*. When the probe hits a dead end that isn't a code problem — no owner, no doc, no contract, no discoverable reason things are wired this way — that hole is the signal. The absence is the finding. "This part works and nothing on record explains why" means the why is in someone's head. You've located the knowledge not by finding it but by finding the exact shaped gap where it should have been.

The whole reason you want operability is to take the human out of the loop — and you can't do that until you know where he's standing.

---

## Codebase as simulated org — and where the metaphor leaks

The structural isomorphism is real, and it's not just poetic. Both are systems of specialized components holding responsibilities, passing messages across interfaces, depending on each other through contracts, coordinating with no single actor holding the whole picture. **Conway's Law** is the load-bearing evidence: a codebase's structure mirrors the communication structure of the org that built it — one is a literal imprint of the other. A service no other service knows how to call, and a person whose function nobody knows how to invoke, are the same failure across the isomorphism. The method ports because the topology matches.

The leak: **a codebase is the part of the org that already got externalized.** Writing code *is* the act of forcing the implicit into a form a machine can run. So a codebase has almost no negative space by construction — if it did, it wouldn't run. That's why it's the low-hanging fruit. The enterprise is hard for the mirror-image reason: it's mostly still glue, still resident in heads.

So the codebase isn't a simulation of the enterprise — it's the enterprise with its single hardest property already removed. The **probe engine ports perfectly**; the **headline finding (negative-space detection) doesn't port** to the codebase, because there's barely any negative space there to find.

Which sharpens the demo into a deliberate progression:

- **Codebase proves the instrument works** — clean, verifiable, fast, legible to a builder-judge.
- **Org proves the instrument matters** — the same engine, in a real messy org, finding the load-bearing person nobody documented.

The "codebase as simulated org" framing walks the judge across the isomorphism, and then — at the right moment — shows them the one place it breaks. That break is the entire value proposition.

---

## Why this one is worth doing at all

The floor is genuinely useful independent of the outcome: even if the event is a wash, you walk out with a real operability audit of your own production system and a first cut of a tool you'll reuse on client engagements. The weekend's output *is* the business's input, which none of the earlier ideas could claim. It's tangential to the consulting practice by design, it's a low-stakes way to be in a room with other builders after a long stretch solo, and the deliverable was never the artifact — the artifact is the reason to be in the room.