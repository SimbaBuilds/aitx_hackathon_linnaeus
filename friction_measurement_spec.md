# Friction Measurement Spec — the semantics WS-B implements

*OWNED BY ORCHESTRATOR (M3). The engine (WS-B) implements the probe loop against these definitions; it does not redefine them. The code these words describe lives in `lib/instrumentation.ts` (`FrictionRecorder`, `frictionScore`) and `lib/contracts.ts` (`FrictionVector`). If the engine needs a signal not defined here, ask the orchestrator to add it here first.*

---

## The one rule

**Friction is mechanically observable from the run. No answer key.** Every field of `FrictionVector` is something the harness watches happen — not something a model judges. Correctness is a *separate*, coarse gate the human supplies (Cameron lived it); it is not part of the friction score.

---

## The probe loop (what WS-B builds)

```
recorder = new FrictionRecorder()
tools = surfaceTools.map(t => recorder.wrap(t))     // instrument every surface
messages = [systemPrompt(probe), userPrompt(probe.instance_spec)]
loop (bounded by maxSteps, e.g. 20):
    res = await candle.chat(messages, toolDefs(tools))
    recorder.scanText(res.text)                     // count hedges/low-confidence
    messages.push(res.message)
    if res.toolCalls is empty:
        break                                        // candle thinks it's done
    for tc of res.toolCalls:
        result = await tools[tc.name].invoke(parse(tc.arguments))
        if reachedCheckpoint(probe, result): recorder.markCorrectMove()
        messages.push(toolResultMessage(tc, result))
completed = didProbeSucceed(probe, messages)         // coarse; see "correctness gate"
finding = {
    ...,
    status: completed ? "completed" : "stalled",
    friction_vector: recorder.toVector(completed),
    root_cause_tag: classifyRootCause(recorder, messages),
    remediation: null                                // capture pass fills later
}
```

`failed_to_author` (the third status) is set **before the loop** — see the testability gate.

---

## Field definitions (`FrictionVector`)

| Field | Definition | How it's captured |
|---|---|---|
| `completed` | Did the probe reach its success criterion? | The coarse correctness gate (below). Set by the engine, passed to `toVector()`. |
| `seconds_to_first_correct_move` | Wall-seconds from run start to the **first** time the candle reached the probe's checkpoint. `null` if never. | `recorder.markCorrectMove()` — idempotent, records the first call only. |
| `surfaces_opened` | Count of **distinct** surfaces (`repo`/`gmail`/`drive`/`notion`/`rds`) the candle touched. | Auto: `recorder.wrap()` adds `tool.surface` to a set. |
| `tool_calls` | Total tool invocations. | Auto: incremented per wrapped `invoke()`. |
| `retries` | Consecutive invocations of the **same** tool with the **same** args. | Auto: signature comparison in `wrap()`. |
| `dead_ends` | Invocations that returned `ok:false` (no data / not found / unauthorized). | Auto: counted when `result.ok === false`. |
| `hedging_count` | Count of assistant turns containing low-confidence language. | Auto: `recorder.scanText()` against `HEDGE_PATTERNS`. |
| `guessed` | `true` iff the candle hedged **and** did not complete — it proceeded on an assumption it couldn't verify. | Derived in `toVector()`. |

**What the engine must wire (not automatic):**
- `markCorrectMove()` — the engine defines each probe's *checkpoint* (the first genuinely-correct step) and calls this when the tool result satisfies it.
- `completed` — the engine defines each probe's *success criterion* and passes the boolean to `toVector()`.
- `scanText(res.text)` — call once per assistant turn.

---

## The testability gate (layer-1 scoring — set BEFORE the loop)

For a **synthesized** probe, an authoring pass first asks the candle to produce a concrete instance against the target (e.g. "find the monthly billing script and the client-scope distinction"). If it **cannot** author a valid instance — can't find the model, can't find the legacy/live pair — the engine emits a finding with `status: "failed_to_author"` and does **not** run the loop. This is a *maximal* operability finding: the system was too illegible to even load the instrument. Give it a ceiling friction score (treat as not-completed with high thrash).

---

## The correctness gate (coarse — NOT the score)

Friction-only misses the *confident-wrong* run (breezes through, low friction, wrong answer). So keep a coarse `completed` check:
- **Demo (SKMD):** Cameron is ground truth — he confirms whether the invoice/output was right.
- **Product proxies (later):** does it compile, does the traced request connect, do N parallel candles converge.

`completed` gates the score direction; it is not itself a friction signal.

---

## Root-cause classification (`root_cause_tag`)

After the loop, map the failure to one tag (used by the UI + to pick a remediation type). Heuristics the engine applies over the recorder + transcript:
- repeated `dead_ends` on doc/search surfaces, no artifact found → `missing-doc`
- a surface returned `unauthorized` → `missing-access`
- the candle found code but it produced a wrong/stale result → `stale-code`
- found an artifact with no owner/ownership reference → `no-owner`
- completed but thrashed across many files for one change → `coupling`
- classified a path it couldn't tell was live/dead → `dead-code`
- no runbook/SOP for a real workflow step → `no-runbook`
- clean completion → `none`

Tag → default remediation type (capture pass): `missing-doc`→Document, `missing-access`→Grant, `stale-code`→Fix, `dead-code`→Delete, `no-runbook`→Document, `no-owner`→Document/Connect.

---

## The scalar rollup (`frictionScore`) — already implemented, don't re-derive

`lib/instrumentation.ts` defines it. Properties WS-B/WS-C rely on:
- **Higher = more friction.** Completed runs cap at 65; failed runs floor at 70. So a `completed → stalled` swing (the caught regression) always yields a large **positive** delta.
- **Only honest use is relative:** `frictionScore(after) − frictionScore(before)` = the delta. Never present the absolute as meaningful on its own (talking_points).
- The UI computes it from the vector; the DB stores the vector, not the score.
