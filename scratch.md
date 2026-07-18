UI:
- Authenticated app or no needs a UI at all?  Yes need UI to show entropy or negative space map heat map etc..
- Details about the visuals. Front end framework, shad CN? Maya?
- Need DB, yes, supabase

Remediation Authoring and Org v Codebase:
- Remediation authoring at or at organization level, get it out of their head. What does it look like to get it out of their head? Also in the organization case, often it's going to be an automation connection or permission that is needed, not just documentation.
- “A nightly codebase clean up agent is a 5 minute build [the enterprise use case is where the challenge is]”


Legacy Legibility(probe_legacy_legibility.md):
- Legacy implementations, one example for me, prescriptions PDFs not wired up in my codebase.
- Example probe for SW company: “Can can a designer contribute to your code base?"
- And what about the probe creation process? specs.md talk a lot about the different kinds of probes but we haven’t talked much about that in this conversation.  

---

# Addendum — Claude (scoping pass, 2026-07-18)

## UI

**Do you need a UI? Yes — it's not optional here.** Judging rewards "real working systems" and the **heatmap is the demo centerpiece** (pre-scan → probes stall on the hot cells → re-probe cools them). The UI *is* the instrument readout. But scope it to **exactly three views**, not a general dashboard:
1. **Operability map** — the heatmap / negative-space map. Codebase = file/module heat grid; org = the 7-surface map with hot spots where probes stalled.

User agreed. 

2. **Findings** — per-probe friction vectors with root-cause tags + the remediation type (document / connect / grant / fix / delete — see remediation section below).

User agreed. 

3. **The delta** — run 1 vs run 2, friction dropping. This is the money shot for the Recursive Intelligence track; guard it.

User agreed. 

**Authenticated?** For the build, **skip real auth** — it's pure overhead on a single-tenant demo of your own org. Optional: a single hardcoded/fake login screen *only* as pitch polish for Antler (makes it read as a product). Don't spend real time on authz.

User agreed. 


**Framework:** **Next.js (App Router) + Tailwind + shadcn/ui, deploy on Vercel** — it's your entire SKMD muscle memory (docuspa_njs et al.) and matches specs.md's "TS only." Near-zero ramp. For the viz specifically: heatmap = a simple SVG/Canvas color-scale grid (or `visx`); the org knowledge/negative-space graph = **React Flow** (node-graph, cheap and looks great). I'll load the `dataviz` skill before we build any chart so the palette/heatmap read as one system. *(I don't recognize "Maya" as a standard FE lib — if you meant a specific design system/kit, point me at it; otherwise shadcn is the pick.)*

Great, let's just use one of the newer shad CN styling packages just so it doesn't look so AI generated. 

**DB (Supabase, confirmed).** It's what makes the delta and longitudinal baseline real. Minimal schema:
- `runs` (id, target, candle_model+quant+seed, started_at, mode=passive|capture)
- `probes` (id, category, universal|synthesized, instance_spec, cached_for_org)
- `findings` (run_id, probe_id, status, friction_vector JSON, root_cause_tag, remediation_type)
- `artifacts` (finding_id, remediation_type, content/target, provenance)  ← what capture mode writes
- `surfaces` (the org's 7 surfaces + access status) — powers the org map
This is also your longitudinal store: same probe across runs = the 40→65 line.

User agreed. 


**Build-order note:** the UI is downstream of the probe engine's output, so **stub it with fixture JSON early** and let UI + engine proceed in parallel. UI never goes on the critical path ahead of the delta (L12).

User agreed. 


## Remediation Authoring + Org vs Codebase

**Your key insight is right and it expands the model: org remediation is often NOT documentation.** Boris's taxonomy is doc-centric because it's about codebases. At the org level, the friction is frequently that the agent *can't reach* or *isn't allowed to do* something — so the fix is a connection or a permission, not a paragraph. Remediation is a **typed taxonomy**:

| Type | When | Example (your org) |
|---|---|---|
| **Document** | knowledge is recoverable-but-scattered, or in-head | write the index/CLAUDE.md pointing at the 7 surfaces |
| **Connect** | capability exists but agent can't reach it | wire an MCP tool / API / event trigger (the nxtyou deploy that lived only in a Gmail thread → an event hook) |
| **Grant** | agent is blocked by missing access/authz | give the probe read access to Notion / RDS / the billing data |
| **Fix** | the system is stale; operable fix is code | update the billing script for nxtyou's D2C path |
| **Delete** | orphaned legacy (why-nowhere) | remove dead paths (prescription-PDF orphan, below) |


Two consequences worth locking:
- **"Get it out of their head" ≠ transcribe.** The interview (capture stream two) captures the *what*, but the deliverable that actually removes the human from the loop is often the **Connect/Grant** — a wired integration or a granted permission, not a doc. So capture mode's output surface must emit **connection specs + permission requests + code stubs**, not only markdown. The re-probe tests whether the gap closed *regardless of remediation type* — that keeps the delta honest across all five.

User: 100% agree and yes connection specs permission requests and stubs that can be shown in the video the visualizations obviously pretty out of scope to actually execute on these actual permission requests and connections for this hackathon. Agree?

- **Connect/Grant is the responsibility-gradient theme made concrete.** Granting the agent a permission literally raises its authority ceiling — the same axis as the Juniper "stopped short of committing" beat. Ties the remediation model back to the autonomy ladder.

User agreed. 


**"Nightly codebase cleanup = 5-min build; enterprise is the challenge."** Agreed, and it now has a crisp articulation: on the **codebase**, remediation is mostly **Delete/Document** (cheap, automatable — hence the 5-min toy). On the **org**, it's **Connect/Grant/Fix** (multi-modal, high-value, genuinely hard). That asymmetry is *why the org is the hero* — the remediation itself is harder and worth more there. Reinforces L1/L17.

User agreed. 


## Legacy Legibility

**Your prescription-PDFs example = the codebase calibration cameo's legacy instance.** PDFs generated/exist but not wired up = **orphaned legacy** (why-nowhere). A candle asked to work near that path can't tell if it's live or dead — exactly the live-vs-legacy stall from `probe_legacy_legibility.md`. Perfect concrete instance for the ~20s codebase warm-up: probe stalls classifying it, root-cause = "no deprecation marker / no removal condition," remediation = **Delete** (or Document if there's a real future-use reason). Verifiable, you're ground truth.

**"Can a designer contribute to your codebase?" — adopt this as a headline codebase probe.** It's Boris's exact test (non-engineer contributing day one) turned into an operability probe: hand the candle a designer-scoped task (a component/styling change) with *only what's documented*, and see if it lands without tribal knowledge. Failure root-causes are legible and Boris-aligned: no CLAUDE.md, undocumented component conventions, no design-token doc, no REVIEW.md. Strong because it's intuitive to a judge and maps straight to the "encode knowledge as infra" thesis. Add to the fixed battery.

User agreed. 


**The probe-creation process (the gap you flagged — here's the lifecycle).** specs.md lists probe *kinds* but not how one comes into being. The mechanism, and it's also where the **two-layer scoring** lives:

1. **Registry (fixed categories).** A small set of category definitions (TS/YAML): `id`, `universal|synthesized`, task template, friction signals to capture, remediation-type hints. Universal ones ship with a hardcodable instance ("find the auth boundary," "onboard a client," "can a designer contribute"). Org-shaped ones ("extend the core model," "live-vs-legacy pair") ship as a *category only*.
2. **Instantiation (for synthesized categories) — this is layer 1 of scoring.** An authoring pass has the agent explore the target and produce a concrete instance. **Testability gate:** if it *can't* author a valid instance (can't find the model, can't find a legacy/live pair), that's a **maximal operability finding logged before any task runs** — the system was too illegible to even load the instrument. This is the piece we hadn't discussed and it's a real Frontier-factor differentiator.
3. **Execution.** The pinned candle attempts the instance inside the OpenShell sandbox; friction logged.
4. **Scoring.** Friction vector (objective) + coarse correctness gate (you supply it).
5. **Cache.** Synthesized instances cached per-org → longitudinal baseline / the delta.

**Hackathon scope for the battery:** ship **3–4 fixed** probes (auth boundary, onboard-a-client, can-a-designer-contribute, live-vs-legacy on the PDF orphan) **+ 1 synthesized** (billing-regression instance authored against SKMD) — enough to demonstrate both the mechanism *and* the testability gate, on both substrates, without building the whole product.

User: So you're recommending Majority Fixed Probes in only one System created probe. Is that just for the sake of this hackathon for just reducing build load? Because if that's the reason I agree. 

---

## What to propagate (if you approve)
- **PLAN.md:** new locked rows — UI stack (Next+shadcn+Vercel, 3 views, no auth), Supabase schema, remediation taxonomy (5 types), probe lifecycle + hackathon battery (3–4 fixed + 1 synthesized).
- **capture_mode.md:** remediation output ≠ only docs (emit connection specs / permission requests / code stubs).
- **probe_legacy_legibility.md:** add the prescription-PDF orphan as the canonical calibration instance.
- **specs.md / new `probe_lifecycle.md`:** the 5-step lifecycle + testability gate + the designer-contribution probe.

