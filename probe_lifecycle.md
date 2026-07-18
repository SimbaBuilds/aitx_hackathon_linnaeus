# Probe Lifecycle — how a probe comes into being

*specs.md lists probe *kinds*; this doc covers the *mechanism* — how a probe is created, run, scored, and cached. It's also where the **two-layer scoring** physically lives (authoring is layer 1, execution is layer 2). Companion to `specs.md`, `probe_legacy_legibility.md`, `talking_points.md`.*

---

## The five steps

### 1. Registry — fixed categories
A small set of category definitions (TS/YAML), each with: `id`, `universal | synthesized`, task template, friction signals to capture, remediation-type hints (Document/Connect/Grant/Fix/Delete).

- **Universal categories** ship with a **hardcodable instance** — every system instantiates them by definition, so the specific task ports unchanged: *"find where auth is enforced," "onboard a client end-to-end," "can a designer contribute a change," "trace one request."* These carry **cross-org comparability** (everyone runs the identical task).
- **Synthesized categories** ship as a **category only** — too org-shaped to pin: *"extend the core data model," "find a live/legacy pair and extend the right one."*

### 2. Instantiation — *(synthesized only)* — LAYER 1 OF SCORING
An authoring pass has the agent explore the target and produce a concrete instance against *this* system.

**Testability gate:** if the agent *cannot* author a valid instance — can't find the core model, can't find a legacy/live pair — that is a **maximal operability finding, logged before any task runs.** The system was too illegible to even load the instrument. This is the layer people forget: you can fail the audit at authoring time. It's a genuine Frontier-factor differentiator.

### 3. Execution — LAYER 2 OF SCORING
The **pinned candle** (Nemotron-on-vLLM, fixed tag+quant+seed+temp) attempts the instance **inside the OpenShell sandbox**. Every stall, guess, re-read, dead-end is logged.

### 4. Scoring
- **Friction vector** (objective, no answer key): completed/stalled/had-to-ask, seconds to first correct move, surfaces/files opened before confident, retries/backtracks, low-confidence language.
- **Correctness gate** (coarse): supplied for free on the own-system demo because Cameron lived it. Catches the confident-wrong run.

### 5. Cache
Synthesized instances are cached **per-org**, versioned. Same instance re-run over time → the **longitudinal baseline** and the run1→run2 delta — which is a **caught regression across a real org change** (`friction 22 → 61 after nxtyou shipped`), *not* an improvement Linnaeus authored. Fixed probes give comparability; cached synthesized give continuity — neither does the other's job.

```
Registry ─┬─ universal → hardcoded instance ─────────────┐
          └─ synthesized → [2] Instantiate (testability   │
                            gate = layer-1 finding) ───────┤
                                                           ▼
                              [3] Execute (pinned candle, sandboxed)
                                                           ▼
                              [4] Score (friction vector + correctness gate)
                                                           ▼
                              [5] Cache per-org → delta / longitudinal
```

---

## The hackathon battery (scope-limited on purpose)

**3–4 fixed + 1 synthesized** — majority-fixed is a *build-load* decision for the weekend, not a design stance. One synthesized probe is enough to demonstrate the authoring step + the testability gate; the product would tilt toward *more* synthesized (they carry per-org fidelity).

| Probe | Kind | Substrate | Purpose in demo |
|---|---|---|---|
| **Auth boundary** — "find where auth is enforced, describe the boundary" | fixed / universal | codebase | clean-success calibration |
| **Can a designer contribute?** — designer-scoped change with only what's documented | fixed / universal | codebase | Boris-aligned; fails on missing CLAUDE.md / conventions / tokens |
| **Live-vs-Legacy (PDF orphan)** — classify the prescription-PDF path | fixed / universal | codebase | the negative-space cameo; remediation = Delete |
| **Onboard a client end-to-end** | fixed / universal | org | the workflow that now touches nxtyou |
| **Billing regression** — "compute this month's invoices" run before/after nxtyou | **synthesized** | org | authored against SKMD; proves instantiation + testability gate; hero delta = the caught regression across the change |

---

## The "can a designer contribute?" probe (headline codebase probe)

Boris's exact test — a non-engineer contributing on day one — turned into an operability measurement. Hand the candle a **designer-scoped task** (a component or styling change) with *only what's documented in the repo*, and see whether it lands without tribal knowledge.

Failure root-causes are legible and Boris-aligned, and each maps to a remediation:
- no `CLAUDE.md` → **Document**
- undocumented component conventions → **Document**
- no design-token doc → **Document**
- no `REVIEW.md` / the change would be rejected for wrong pattern → **Document**

It's intuitive to a judge and maps straight to "encode domain knowledge as infrastructure."

---

## How this connects to the rest

- **Remediation** (Document/Connect/Grant/Fix/Delete) is a **typed recommendation the candle emits** off each finding's tagged root-cause — see PLAN L25/L26. It does **not** power the delta (the delta is the caught regression across a real change). On the hackathon, recommendations are emitted for a human to decide; only the pure-code `Fix` is *optionally* executed live as closure. Connect+Grant are demonstrated artifacts.
- **Capture mode** (`capture_mode.md`) is the audit's data-gathering + recommendation-authoring layer at step 4: recoverable knowledge → write-back; unrecoverable → interview → typed recommendation. On Cameron's well-documented org it runs mostly write-back + the Connect/Grant artifacts, not the interview. Capture is not the delta source.
- **Two-mechanism validity** (`brainstorming_artifact.md`): comparability from fixed probes, continuity from cached synthesized. The lifecycle is where both are produced.
