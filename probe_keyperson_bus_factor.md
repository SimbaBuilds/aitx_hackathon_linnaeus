# Probe: Key-Person Bus-Factor — a Linnaeus probe

*Stage name: **"Key-Person Risk"** (or "Bus-Factor Map").* **Never** present as "simulate offboarding / laying someone off" — see the framing rules below. Formal name is bus-factor because it ties to the org-legibility vocabulary; use "Key-Person Risk" when presenting.

**Category (fixed):** When a single knowledge-holder is removed from the org's surfaces, what happens to operability — and *why*?

**Bucket:** Universal category. The "instance" is a **masked surface set** (one person's Notion/Gmail/Drive/ownership access pulled from the candle's toolset), re-run against the standard battery. Cached per-org for the longitudinal baseline.

**Role in the demo:** **Narration-only for this hackathon.** This is the capstone slide *behind* the offboarding trigger already named in `PLAN.md` L28 / `demo_org_change_delta.md` — the "here's where this goes" readout, not a live run. Person-offboarding is described in those docs as *"the purest operability regression"*; **this doc is what that sentence means.**

---

## The reframe

The naive version — *"simulate removing an employee and see if the score drops"* — is both **creepy** and **useless**. Creepy because it reads as "which humans are disposable." Useless because a scalar operability delta is ambiguous: a drop could mean the person is *indispensable* (irreducible tacit knowledge) **or** that they were doing *automatable work, badly automated* (closable debt). Those demand **opposite** responses, and the scalar can't tell them apart.

The operability version:

> Never remove a *human*. **Mask a surface** — pull one knowledge-holder's information layer out of the candle's toolset — and re-run the standard battery. The instrument measures the org's *dependence on a single knowledge-holder*, and the **shape** of the friction change (plus the **type** of remediation the candle can author) disambiguates *why* the dependence exists.

We are not asking "is this person replaceable." We are asking whether the org is **legible without any single surface**, and when it isn't, **what kind of gap** the surface was filling.

> This is the "purest" operability regression because a person leaving is the cleanest possible org change: the candle is fixed, the codebase is fixed, the battery is fixed — the *only* variable is one masked surface. Same standard-candle discipline as the billing money-shot (`demo_org_change_delta.md`), applied to a knowledge-holder instead of a code path.

---

## The mechanic: mask a surface, don't delete a person

Non-destructive by construction. Linnaeus already models the org as a set of **surfaces** (repo / Gmail / Drive / Notion / RDS, each with an access status). "Masking" a person = **not registering the SurfaceTools tied to their information layer** for a re-run. Nothing is deleted; the real surface is untouched. This is the **dry-run-a-migration** instinct done right: you test "what breaks if this dependency goes away" without touching the dependency — exactly like a DB-migration dry run rehearses a change without mutating prod.

Because friction is a **vector** — `dead_ends`, `retries`, `tool_calls`, `hedging_count`, `seconds_to_first_correct_move`, `surfaces_opened`, `completed` (see `lib/instrumentation.ts` / Contract A) — masking a surface can move the score in **either direction**, and *which components* move is the signal, not just the scalar.

---

## The disambiguator you already built: remediation type

The key claim of this probe: **you do not need new machinery to disambiguate.** The remediation typology the single candle already emits — **Document / Connect / Grant / Fix / Delete / (none)** — *is* the classifier. What the candle can author from the surviving surfaces tells you what the masked surface was holding:

- Candle authors a concrete **`Document` / `Fix`** → the knowledge was *in the surfaces the whole time, just badly organized* → **closable**. The person was load-bearing because of documentation/automation debt.
- Candle stalls and can only emit **`Grant` / `Connect to <person>`**, or can author nothing concrete → the knowledge *isn't in any surface — it's in their head* → **irreducible** (genuine tacit knowledge).
- Candle authors a **`Delete` / `Fix`** that *removes* something → the masked layer was **cruft** (stale/conflicting docs) whose absence *helps* → see the "lowers friction" row.

The *type* of recommendation is the answer. The candle producing a working artifact is itself the proof the gap was closable.

---

## The 3×2

Two independent axes:

- **Rows — what masking the surface does to friction:** RAISES / BARELY MOVES / LOWERS.
- **Columns — can the candle act:** CLOSABLE (it authors a concrete fix) / IRREDUCIBLE (it can only `Grant`, or can't act at all).

```
                    CLOSABLE (candle authors a fix)          IRREDUCIBLE (candle can only Grant / can't act)
 removing them   ┌────────────────────────────────────────┬────────────────────────────────────────┐
 RAISES friction │ AUTOMATION / DOC DEBT → act (highest    │ KEY-PERSON RISK → derisk, don't automate │
                 │ ROI). remediation: Document / Fix       │ remediation: Grant / Connect             │
                 ├────────────────────────────────────────┼────────────────────────────────────────┤
 BARELY moves    │ redundant / already fine                │ low load-bearing / well-distributed      │
                 │ remediation: none                       │ remediation: none                        │
                 ├────────────────────────────────────────┼────────────────────────────────────────┤
 LOWERS friction │ PATHOLOGICAL friction → clean up the    │ PROTECTIVE friction → leave it; it's a   │
                 │ cruft. remediation: Delete / Fix        │ safeguard. remediation: none (accept)    │
                 └────────────────────────────────────────┴────────────────────────────────────────┘
```

### Cell-by-cell

- **RAISES + CLOSABLE — automation/doc debt.** They were load-bearing only because the knowledge was never written down or was manually done. Candle can author the `Document`/`Fix`. *Highest-ROI cell:* close the gap and the person is freed up.
- **RAISES + IRREDUCIBLE — key-person risk.** The knowledge is genuinely tacit; masking the surface stalls the candle and it can only `Grant`/`Connect`. Action: **derisk** (redundancy, shadowing, accept the cost) — do **not** try to automate it away.
- **BARELY MOVES — the org doesn't depend on that surface.** Either the work is redundant/well-covered elsewhere (closable-ish, but nothing to do) or the person's load-bearing footprint is low / well-distributed. Remediation: none.
- **LOWERS + CLOSABLE — pathological friction.** The masked layer was *actively costing* the candle: stale docs, conflicting sources, dead legacy the candle chased into `dead_ends`. Candle authors a `Delete`/`Fix`. Action: **clean up the cruft — the person keeps their job; the bad information layer goes.** (This is `probe_legacy_legibility.md` pointed at a person's *outputs*.)
- **LOWERS + IRREDUCIBLE — protective friction.** Masking the surface lowers friction, but the candle *can't* remove it because it's a real **control**: a compliance sign-off, a security review, a human-judgment gate. Action: **leave it — this friction is a safeguard, not debt.**

---

## Why the bottom-right cell is the most valuable thing here

A naive operability tool treats *all* friction as waste and would recommend automating away a compliance control. The 3×2 forces the distinction between **friction-that's-debt** and **friction-that's-a-safeguard**. That "protective friction → leave it" cell is the tool telling on itself — refusing to recommend removing a gate it can't prove is safe to remove. In front of judges (and an acquirer like Antler) that reads as **maturity, not naïveté**: Linnaeus knows which friction it is *not* qualified to remove.

## Why the whole grid is load-bearing, not an add-on

The six cells exercise Linnaeus's **entire** remediation typology — `Document`/`Fix` (raise-closable), `Grant`/`Connect` (raise-irreducible), `Delete` (lower-closable), and `none/accept` (lower-irreducible + barely-moves). The 3×2 isn't bolted onto the model; it's a **complete projection of it**. That's the signal this thread is real and not a tangent: nothing new was invented — masking a surface and reading the emitted remediation type is enough.

---

## Framing rules (non-negotiable in any pitch)

1. **Mask a surface, never delete a person.** You measure a *surface's* net contribution to legibility — which can legitimately be negative — and every fix lands on the surface (`Delete` the stale doc), never the human. This is *why* the mechanic matters most on this probe.
2. **Bottom-left ("removing them lowers friction") is the single most dangerous sentence to say about a named person.** Say "their information *layer* adds friction (stale/conflicting docs)," never "they make things worse."
3. **Present bottom-right as "flags candidates for human judgment," not "the system knows which controls are load-bearing."** The candle's inability-to-remove is a *signal that concentrates attention*, not a proof.
4. **The disambiguation inherits the standard-candle-quality caveat.** "Candle can't author a fix" reliably means "tacit knowledge" *only* to the extent the standard candle is competent — same shadow that hangs over every finding, but heavier here because the claim is about a person's value. Hedge as *"a signal that concentrates attention,"* not *"proof someone is replaceable."*

---

## Hackathon scope

**Narration-only.** Do not build a live person-masking run unless SKMD has a cleanly one-person surface you can demo. The deliverable is:

- The offboarding trigger in the taxonomy fires the standard battery against a masked surface set (narrated).
- The **3×2 is the readout slide** — "here's where this goes."

You wire *one* trigger live (billing / deploy-announcement, per L28); you *narrate* the offboarding one with this 3×2 as the capstone. Keeps it in-scope and makes the pitch **bigger, not thinner**.

---

## Related

- `demo_org_change_delta.md` — the live billing regression (the money-shot); person-offboarding named there as the purest regression + the trigger taxonomy.
- `probe_legacy_legibility.md` — the "lowers friction + closable" cell is this probe pointed at a person's outputs (stale/legacy layer).
- `capture_mode.md` — the remediation-authoring pass that emits the Document/Connect/Grant/Fix/Delete types this probe reads as its classifier.
- `PLAN.md` L28 — the trigger taxonomy (one live fire + narrated rest) this probe is the capstone of.
