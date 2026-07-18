# Demo Case: Juniper — Client Report to Production

*A Linnaeus demo asset (the operability-audit app; see `brainstorming_artifact.md`).*

**Probe:** *Can carry a simple bug fix from client report to production (T/F)?* (CTO / software company)
**Result:** **Split, and the split is the point.** *Judgment:* the agent correctly triaged **two separate issues** against a one-line natural-language policy ("if it's a small bug fix, just commit it") — it **committed** the small peptide-clearance fix, and **stopped short** on a separate, deeper auth error, correctly flagging it as too complex to patch. Both calls right. *Payload:* the code it did commit was low quality and was later redone by hand — a dev-tooling failure, orthogonal to the judgment.
**Role in the demo:** the **pipeline-success** case in the spread — the org/routing layer is well-wired. Verifiable because it's the author's own system, and it happened in real time (Sat Jul 11). Keep the code-quality failure in its own lane (a dev-tooling issue, below); it is orthogonal to the operability point.

**Artifact:** `henry_quo_e2e.PNG`

---

> ⚠️ **DEMO OPTICS — don't cluster the bugs on a same-day timeline.**
> The real concern isn't the auth example itself; it's signaling "multiple bugs in one day," which reads as a buggy product. Fix is presentational, not a full cut:
> - **Keep** the auth stop-short beat (it's the strongest operability signal), but present it **decoupled** from the peptide bug — a representative "complex change it correctly escalated," not "also, the same afternoon, a second bug."
> - **Don't lean on** the "4 messages in one day" framing on stage. The ground-truth records below (message table, timestamps) stay as internal source-of-truth; just don't put the same-day cluster on a slide.
> Tags below marked `[optics]` are the spots that emphasize same-day/back-to-back — soften those for the demo; the underlying facts stay.

---

## Why this is the anchor artifact

This screenshot shows the **org/routing layer working** — an agent operating across the org, from a client message on a phone all the way to a triaged, dispatched, correctly-gated work item, with no human routing it. That layer is what the operability point rests on. It is *not* a claim that a good fix shipped — it didn't (see the dev-tooling note); the value here is that the report reached the right place with the right judgment.

Demo arc:

1. **"Here's an agent doing real client-report-to-prod work on my system, today."** — this artifact; proof the end state is reachable.
2. **"Here's the instrument that measures how close any org is to that."** — the probe battery.
3. **"Here's it pointed at my own system, finding exactly where I'm still the single point of failure."** — the negative-space finding.

The artifact earns the audit the right to be taken seriously: not a hypothetical, but the map to a place already stood in.

---

## The chain (end to end)

```
client report (Henry, via Quo)  →  lands on business phone
   →  Juniper automation fires (NL-authored monitor)
      →  dispatches Claude Code
         →  triages each issue against the policy "small bug → just commit"
            ├─ peptide-clearance approval (small)  → fix committed to claude/practical-johnson-480669
            │                                         (committed code poor → later redone by hand)
            └─ auth error (separate, complex)       → correctly stopped short: no commit, flagged for scoping   [optics: don't present as same-day]
```

**Nice demo detail:** the run reported in two stages — the *investigation / root cause* separately from the *fix* — so you can show it reasoned before it patched rather than blindly editing.

- Notification 1: *"SKMD investigation done: found root cause of Henry's misleading clearance-approval error message."*
- Notification 2: *"Fixed Henry's peptide-clearance bug report from Quo — pushed to claude/practical-johnson-480669."*

---

## Ground-truth record (answer key)

All times UTC (Chicago local = UTC − 5h). Sender is Henry (`+13059266025`) for all messages. Both commits authored by `Claude <noreply@anthropic.com>`, on branch **`claude/practical-johnson-480669`**.

The real story is a **4-message thread**, not a single report. `[optics: this table is internal source-of-truth — don't put the "4 messages in one day" cluster on a slide.]` The fix attempt came off the peptide-clearance sub-thread (messages #2 + #3, which landed in the same routine session):

| # | Quo message (Henry) | Sent (UTC) | Trigger fired | Result |
| --- | --- | --- | --- | --- |
| 1 | *"Good morning. I just got done seeing the first patient, Robert [Scihlik]…"* — can't submit peptide clearances | 13:12:20 | 13:14:04 | First report of the peptide-clearance blocker; resolved in the #2/#3 session |
| 2 | *"Same thing for patient Jill Bowman. It's the peptide clearances that are not allowing me to submit them"* | 14:33:04 | 14:35:10 | → small-fix session (committed) |
| 3 | *"Nevermind figured it out. Under clinical notes section I was typing in 'approved' but that section [rejects] less than 10 characters. So I just typed in more stuff. Weird"* | 14:37:53 | 14:39:04 | → same session; confirms the fix target |
| 4 | *"Also of note, several times today the platform showed a spinning circle saying 'redirecting' and then it logged me out. It happened like 4 times today"* | 17:48:07 | 17:50:05 | **The auth issue** → agent correctly stopped short, no commit |

**The anchor chain (peptide-clearance fix):**

- **Report (actionable repro):** message #2, sent **14:33:04Z**
- **Investigation / root cause pushed:** commit `abbdf4a` **14:43:57Z** — *"Show inline reason when peptide clearance Approve button is disabled"*
- **Fix pushed:** commit `5d39a2c` **14:45:22Z** — *"Fix peptide clearance approval blockers reported by Henry"*
- **Elapsed report → pushed branch:** **~12 min** (14:33:04 → 14:45:22)
- **Root cause:** the Approve button for peptide clearance was disabled with **no visible reason** — the state read as a misleading clearance-approval error.
- **The fix:** surface the inline reason when the button is disabled, plus fix the underlying approval blockers.
- **Outcome (peptide-clearance = the small fix):** correctly **committed** per the standing policy *"if it's a small bug fix, just commit it"* (`abbdf4a`, `5d39a2c`). No PR — PRs open only conditionally. The committed **code quality was poor** (see dev-tooling lane) and was later redone by hand, but the *triage decision to commit was correct*.

**The separate auth issue (correctly stopped short):** `[optics: keep the beat, but present decoupled from the peptide bug — not as a same-day second bug]`

- **Message #4** (sent 17:48:07Z, trigger 17:50:05Z): *"…the platform showed a spinning circle saying 'redirecting' and then it logged me out. It happened like 4 times today."* A session/authentication failure — distinct from the peptide-clearance UI bug.
- The agent **correctly declined to commit or open a PR** — the right call for this situation given the directions it was given (escalate the complex/risky change rather than patch it).
- It *did* produce a **scope** for the issue, but the scoping was **poor quality (Sonnet 5 again)**, so it wasn't usable — the actual work became a large manual dev session. Same lane as the peptide code: judgment right, payload poor.
- (This dispatched after the screenshot was taken, which is why the screenshot shows only the peptide-fix notifications.)

**Timing precision:** commit time ≈ when the agent *finished* (a few minutes after dispatch). Exact dispatch/start times live in the routines run history (`https://claude.ai/code/routines/trig_014AngzVwkG5SnFLCwr1MKgN`), and the Juniper trigger-fired times above are precise to the millisecond.

**Why the code was poor (dev-tooling lane — keep separate from the operability point):** the Claude Code routine was silently pinned to Sonnet 5 (research preview, undisclosed at the time) with no model selection, no way to transfer the routine chat into a local/cloud dev session, and an auto-fold window that duplicates Juniper's own debounce. This is a *cloud-development* tooling problem and the motivation to self-host a runner — it says nothing about the operability audit, whose instrument is chosen and controlled separately.

---

## The beats that make this artifact strong

1. **Two issues, two correct authority calls.** `[optics: don't present both as same-day; frame the auth stop-short as a representative complex change, not "also that afternoon."]` A small UI bug (peptide-clearance submit) was committed; a deeper auth change (session "redirecting" → logout) was correctly stopped short — dynamic authority triage against a one-line policy, not a static gate. Full treatment in "Follow-up: the responsibility gradient."
2. **The agent correctly *diagnosed* the legibility gap** (even though the committed implementation was later redone). Message #3 shows Henry *self-resolved* ("figured it out — the clinical-notes field silently rejected his input"). Yet the agent's fix targeted *"show inline reason when the Approve button is disabled"* — it named the exact reason he couldn't see the problem in the first place. The diagnosis is the thesis in miniature: the failure was an **absence of a visible reason**. (The code that implemented it was poor and redone by hand — a payload problem, not a diagnosis problem.)

---

## Follow-up: the responsibility gradient

> `[optics]` This section's concrete example is the auth stop-short. Keep it, but present it **decoupled** from the peptide bug — "the agent calibrates authority per task, escalating complex changes" — rather than narrating two bugs on the same afternoon.

The sharpest operability signal here isn't that the agent *acted* — it's that it **placed each task on the responsibility ladder itself.** Given a one-line policy ("small bug → just commit"), it did the per-task autonomy triage: peptide-clearance → act, auth error → escalate. You delegated the *policy*; it calibrated the *authority level per problem.* That's the thing people assume still needs a human.

**Two axes that feel like one — pry them apart:**

- **Operability** — *could* the agent figure out the right thing and do it correctly? (capability / legibility)
- **Authority** — are you *willing* to let it act without a human gate? (risk appetite)

They're orthogonal. A system can be maximally operable and you still keep a human on the merge button — not because the agent couldn't, but because you've decided the blast radius isn't worth delegating yet. **Operability sets the ceiling of how far up you *can* safely go; risk appetite sets where you actually *stand* under it.**

**The ladder** (operability and risk appetite gate different rungs):

1. Read / investigate only
2. Push a branch
3. Commit ← *where the small fix landed*
4. Open a PR (request human review)
5. Merge to staging / gated env
6. Merge to prod behind a flag
7. Merge to prod, live

The demo shows you don't have to pick one rung globally. Give a policy, and the agent applies the right rung *contextually* — **provided the risk surface is legible enough for it to tell "trivial" from "auth."** That's the loop back to the auth probe: the whole thing worked *because* the agent could read the auth boundary as the "stop" signal. Illegible auth surface → it can't triage → you can't safely delegate the policy. **Legibility is the precondition for delegated judgment.**

**Where the ceiling moves next:** the agent's *judgment* was already good enough to climb higher — the only thing pinning it to lower rungs was payload quality (Sonnet 5 scoping/code). Once the self-hosted runner controls the instrument, issues like the auth bug become reachable at **scope → implement → open PR** — not auto-merge, but a reviewable PR. The autonomy dial moves up because the *code quality* improved, while the *judgment to stop-short and escalate* stays exactly as demonstrated. That's the gradient in motion: a better-controlled instrument raises the ceiling; the policy still decides where under it the agent acts.

**The value-prop line:** you can't set the autonomy dial rationally until you've measured operability. The audit turns "how much responsibility should I give it" from a vibe into a measured decision — here's the ceiling, now *you* choose where under it to stand.

---

## Honest framing for judges

- This is a **pipeline-success** case, not a clean end-to-end win — and the honesty is the strength. It demonstrates the org/routing layer works (report → triage → dispatch → correct triage-gating), which is the operability point. It does *not* claim a good fix shipped; the payload failed for a dev-tooling reason.
- **Keep three things in separate lanes on stage:** (a) *operability* — the report reached the right place with the right judgment (success); (b) *code quality* — the fix was poor and redone by hand (a model/tooling failure, orthogonal); (c) *the routines critique* — pinned model, no chat transfer, redundant debounce (product feedback, a separate story). Blurring them is what makes the pitch look like hand-waving.
- It's the *capability the audit presupposes*, not the audit itself. Juniper dispatching Claude Code is the routing that works; the audit would be pointed *at* a codebase to measure how legible it is. The audit's model/harness is chosen and controlled separately — nothing about the routine's silent model pin bears on it.
