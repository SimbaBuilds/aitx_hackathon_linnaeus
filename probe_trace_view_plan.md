# Plan — Probe Trace View

*Makes demo beat 6 (org-level negative-space) **watchable**: for each org-level finding, show the ordered path the Nemotron candle actually took — repo → Gmail → stall — ending in the verdict and the friction outcome. "Show, don't say" for the cross-surface proof.*

Last updated: 2026-07-18 (Sat).

---

## Goal

Turn the mechanical trace we already capture (`results/nemotron_synth_board.json` → `call_log`) into an in-UI, per-finding **trace panel** so a judge can watch the candle:

1. search the repo, find no committed owner,
2. reach into **Gmail**, actually find the name in a thread,
3. **still stall** → `no-owner`.

That sequence *is* the negative-space argument. Today it lives only in a terminal log and a JSON file.

## Non-goals

- Not a live-streaming/animated view (that's the deferred "visual map" idea).
- Not the second-Nemotron narrator (deferred stretch goal).
- Not for the universal/billing probes (no `call_log` for those) — trace shows only for probes that have one; other rows render exactly as today.

---

## Privacy (honors demo decision 1a — public board is name-free)

The board JSON carries **live identifiers** (`SKMD`, `SKMD Wellness`, client/person names in queries + verdicts). The UI is public-facing, so every displayed trace string passes through a small **anonymizer** before render:

- **Surface/identifier map** (same scheme as the anonymized demo surfaces): `SKMD → Telehealth Monorepo`, `skmd_fastapi → telehealth_api`, `docuspa → medspa_web`, `nxtyou → d2c_web`, `skmdwellness → telehealth_ops`.
- **Curated person/client redaction list** (known org names → `[redacted]`): the medical director's name, business owner first name, named clinics. Curated, not a general NLP parser — small and auditable, which is the safe choice for a public room.
- The raw, un-anonymized run stays the **1c proof-on-demand** artifact (terminal + JSON), shown privately if a judge wants receipts.

If a string can't be confidently anonymized, prefer the **structured outcome** (status / root-cause / score — already name-free) over raw text.

---

## Data we already have vs. need

- **Have:** `call_log[]` per probe — `{ probe, tool, surface, ok, query, note }`, in execution order. Enough for the step list.
- **Need (small add):** the **final verdict line** per probe (`OWNER: UNDOCUMENTED — …`). `runProbe` currently returns only the `Finding`; the transcript is dropped. Add a non-breaking `onFinish?(messages)` callback to `RunProbeOptions`, have the run script extract the last assistant verdict, and persist it as `verdict` on each board finding. Re-run the board once (~2 min on Nemotron) to regenerate with verdicts. Trace view must render gracefully if `verdict` is absent.

---

## Implementation steps

1. **Engine (non-breaking):** add `onFinish?: (messages: ChatMessage[]) => void` to `RunProbeOptions`; call it with `drive.messages` just before `runProbe` returns. No behavior change for existing callers.
2. **Run script:** in `run-synth-board.ts`, pass `onFinish` to capture the last assistant message; parse the verdict line (`/(OWNER|ROLLOUT|WIRING):.*/i`); store `verdict` on each finding in the output JSON. Re-run to regenerate `nemotron_synth_board.json`.
3. **Anonymizer util:** `components/linnaeus/anonymize.ts` — `anonymize(s: string): string` applying the surface map + redaction list. Pure, tested inline.
4. **Data layer:** in `data.ts`, expose `traceOf(probeId): TraceStep[]` (anonymized, ordered) and `verdictOf(probeId): string | null` (anonymized), sourced from the board `call_log` / `verdict`.
5. **UI:** make org-level rows in `FindingsView` **expandable** (client `useState` set of open probe ids; chevron affordance). Expanded panel renders:
   - the ordered steps: `[surface badge] tool_name · query` → `ok`/`stall` + short note,
   - a highlighted **cross-surface** marker on the first successful non-repo step ("← reached Gmail"),
   - the **verdict line**, then the outcome chips (status / root-cause / friction) already shown in the row.
   Rows without a trace (universal/billing) are not expandable and look unchanged.
6. **Verify:** headless data check (`traceOf` returns anonymized steps, no raw `SKMD`/names) + `next build`.

---

## Acceptance

- Expanding `no-owner-clinical-signoff` shows: repo searches → a **Gmail** step marked as the cross-surface reach → verdict `OWNER: UNDOCUMENTED` → `stalled / no-owner / 74.0`.
- No raw `SKMD` or person/client names appear anywhere in the rendered trace.
- Non-org rows and the delta/heatmap views are unchanged; `next build` clean.
