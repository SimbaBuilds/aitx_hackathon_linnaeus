# Linnaeus × AITX/NVIDIA Claw Hackathon — Fit Brainstorm

*Working notes. Reasoning, tensions, dead ends. Final recommendation lives in `hackathon_fit_thoughts.md`.*

> **⚠️ PIVOT (2026-07-18).** The "self-improving monitor / gets-smarter-each-run / friction drops run over run" framing in these notes is **superseded**. Linnaeus stays the **audit layer**; recursion = **re-auditing an org that changed on its own**, and the delta is a **caught regression** (friction *rises* when a real change erodes operability), not an improvement Linnaeus authored. Remediation is a typed recommendation the candle emits for a human to decide — no self-closing loop, no separate frontier author. The "gets-smarter vs standard-candle tension" section below is now **moot** (the pivot dissolves it) and is retained only as record. Current framing: `hackathon_fit_thoughts.md` (top banner) + `demo_org_change_delta.md`.

---

## The reframe the event forces

The whole event is built on **Claw Agents = heartbeat-driven, persistent, proactively autonomous loops.** Their exact definition: wakes on an interval, checks a task list, acts or waits; maintains its own workspace/memory/files across runs; initiates work without a human prompt.

Linnaeus as currently written is a **one-shot audit** — drop probes, emit a friction report, done. That is *not* a Claw Agent. If pitched as-is it reads as "a batch analysis job," and the judges explicitly reward the loop.

So the event forces the exact pivot Cameron's instinct reached for — but the honest form is **not** "self-improving monitor." It's **operability CI**: a heartbeat agent that **fires on a real org-change event and re-audits**, catching the operability *regression* the change introduced. Linnaeus doesn't write docs back to make its own score rise; it measures the drift a real change caused and emits a typed recommendation. Not a change of thesis — a change of *cadence*, plus an honest source for the delta (the org changed, not the instrument).

---

## Track-by-track fit

### 1. Recursive Intelligence Track — STRONG. This is home. (via *drift detection*)
Their ask, verbatim: *"an agent that measurably gets smarter the more it runs… captures what it learns, compounds it into a persistent knowledge base or knowledge graph, and demonstrably improves at its task over successive runs."* Judged on **performance delta between first and last run**; bonus for a clear learning mechanism (knowledge graph, RAG-from-self-context).

We satisfy the **delta-between-runs** criterion honestly — but the delta is a **caught regression across a real org change**, not the instrument getting smarter. The demo's spine:

- **Run 1:** the candle audits the org *before* the change; probes complete; Linnaeus builds an org knowledge base (ownership map, live-vs-legacy map, where-things-live graph) and records baseline friction.
- **The org changes on its own:** nxtyou → prod (real event); nobody updates the billing logic to match.
- **Run 2:** same fixed candle re-audits; friction is measurably **higher** on the affected workflow — the org moved into a state its records no longer describe.
- **The delta — the caught regression — IS the score.** Linnaeus then *emits* a typed recommendation (`Fix`/`Document`/…); a human decides. The recommendation is output, not the delta's cause.

The persistent org map across runs = the "clear learning mechanism / knowledge base" bonus (Linnaeus's *private* map may accumulate; the measuring candle stays memory-less). Honest fit — we're not claiming self-improvement we don't have.

### 2. Red Hat Live Data Track — MEDIUM. Available via Juniper, not core.
Ask: an agent powered by real-time streaming data, freshness doing real work in the loop. Cameron already has a live feed — **Juniper monitoring the business phone (Quo messages) → dispatching Claude Code.** That's a genuine live source triggering real work. And a codebase's **commit stream** is itself a live feed the operability monitor could react to (re-probe the strata that just changed).
- Fit is real but secondary. Don't rebuild around it; mention it as the heartbeat trigger if it helps. Combining >1 live feed is called out as a "creative combination" win, but chasing it dilutes the Recursive Intelligence story.

### 3. HiddenLayer Runtime Security Track — WEAK / orthogonal.
Ask: route every model I/O through HiddenLayer's API, detect prompt-injection/exfiltration in real time. Not core to operability measurement. Only worth it if a cheap wrapper grabs the track; would pull focus. **Skip** unless time-rich.

---

## Bounties (all "any track," they stack)

- **Best Use of vLLM — $500 CASH (biggest single prize).** Self-host inference on vLLM, serve an open model, route the agent through it. Thesis: *"prove you can run a capable long-running agent on self-hosted open infra instead of a hosted frontier API."* This is *literally* Cameron's stated plan to stand up a self-hosted Claude Code runner. Wins weight **efficiency**, the **small-model punch**, and **real integration under a heartbeat where concurrent/repeated inference makes throughput matter** — a continuous probe monitor is exactly a repeated-inference-under-heartbeat workload. Strong, targeted, and the cash prize.
- **Best Use of Nemotron — $100 Brev/member.** Nemotron as the model powering the agent, centrally not as a wrapper. **Stacks trivially with vLLM** (serve Nemotron *on* vLLM). Grabs the 30 sponsor-tech points at the same time.
- **Best Use of NemoClaw + OpenShell — $100 Brev/member.** Give an agent real access, then contain it with a YAML policy that survives an adversary; wins reward **allow-with-escalation / human-in-the-loop / conditional permissions** over blunt blocks. Interesting thematic tie to Linnaeus's **responsibility-gradient / autonomy-ladder** material and the Juniper demo beat (agent correctly *stopped short* of committing the auth fix). But it's a different build focus (sandbox policy engineering), not operability measurement. Secondary — pursue only if the probe-runner naturally runs inside OpenShell anyway.
- **Most Commercializable — Antler dinner.** Weighs customer-problem fit, immediate value, superiority vs existing. Linnaeus is a genuine consulting product Cameron will reuse on client engagements — the "weekend's output is the business's input" line is tailor-made. Low marginal effort (it's a pitch, not a build). **Worth claiming.**

---

## The 30-point sponsor lever

Sponsor tech = 30 of 100 judging points, and current specs say **GLM 5.2 + Vercel AI SDK** — *zero* sponsor tech. One decision fixes it: **serve Nemotron on vLLM as the probe model.** That single choice captures:
- 30 sponsor-tech points (the stack + the "why"),
- the $500 vLLM bounty,
- the $100/member Nemotron bounty.

The "why" answer writes itself and it's *principled*, not retrofitted: an operability audit needs a **fixed, self-hosted standard candle** — you can't measure longitudinally against a hosted frontier model that silently changes under you (this is the *exact* lesson from the Juniper Sonnet-5-pin saga). Self-hosting the candle on vLLM is the standard-candle requirement made real. Sponsor tech and core thesis coincide.

---

## The tension that has to be handled carefully (and resolves beautifully)

> **⚠️ MOOT after the 2026-07-18 pivot.** This entire section reconciles "gets smarter each run" with the standard candle. The pivot removes the premise: Linnaeus no longer improves the org across runs, so there's nothing to reconcile — the candle re-audits a *changed org* and the delta is a regression. Retained only as record of why the standard-candle purity matters (it still does: the candle stays memory-less so the delta is attributable to the org, not the instrument).

"Gets smarter each run" collides head-on with **standard candle** (fixed instrument) if handled naively. If Linnaeus caches org knowledge privately and feeds it to the probe, the probe gets easier over time **because Linnaeus is spoon-feeding it — not because the org improved.** That corrupts the measurement: you'd be measuring Linnaeus's memory, not the org's operability.

Resolution, and it's a *sharpening* not a patch:
- The **measurement probe stays candle-pure** — no accumulated private context. Same model, same harness, no memory of prior runs. That's what keeps the number honest.
- What improves is **externalized into the org's own artifacts** — the CLAUDE.md, docstrings, runbooks Linnaeus writes live *in the repo*, available to any agent, not hoarded in Linnaeus's head.
- So Run 2's lower friction is legitimate: a fresh candle finds it easier because the knowledge is now *in the codebase*.

This is the recursive loop done *principled*: **improvement is real and portable precisely because it's written out, not cached.** And it lands exactly on Boris — the knowledge base becomes infrastructure the org keeps. The distinction (what may improve = the org + Linnaeus's private map; what must stay fixed = the measuring candle) is worth saying out loud to judges; it's the difference between a real recursive-intelligence system and one that games its own metric.

Nuance: Linnaeus's *private* org map (the knowledge graph) is allowed to grow — it makes Linnaeus a better *author of remediations and next probes*. It just must never leak into the measurement candle. Two separated memories: private (improves authoring) vs. externalized (improves the org, and is the only thing the candle sees).

---

## What this does to the existing demo plan

- The "run it on your own system (NxtYou/DocuSpa)" plan still holds — it just needs a **second run across a real change** (nxtyou → prod) to show the regression delta. Fully doable in a weekend on Cameron's own org.
- The "pick 3–4 probes that discriminate" spread still holds; now the hero probe also has a **before/after across the change**.
- The pre-scan → heatmap → probe reveal stays — and gains a **third frame: the heatmap heating UP on run 2** where the change eroded operability. That's a killer visual for "operability CI caught a regression."
- Scope risk goes UP: heartbeat + two runs + emitting recommendations is more than a one-shot audit. Must timebox hard. Minimum viable demo = 2 runs (before/after the change) + a friction-delta chart showing the regression + one emitted typed recommendation. Everything else is gravy.

---

## Open questions for Cameron

1. Standard candle on **Nemotron-via-vLLM** — comfortable making the probe model an open self-hosted model instead of GLM/frontier? (Grabs 30 pts + $500 + $100/member, and it's thesis-consistent.)
2. Is a **2-run before/after on your own repo** realistic to stage by Sunday 11am freeze, or does the recursive story get *narrated* (architecture + one real delta) rather than fully live?
3. Worth a cheap **OpenShell** wrapper to run the probe-agent sandboxed (grabs the containment bounty + reinforces the responsibility-gradient theme), or does that pull focus?
4. Team or solo? (Brev-credit bounties are per-member; affects whether the $100 ones matter.)
