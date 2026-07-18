# Linnaeus — Specs

*App name: **Linnaeus** (after the father of taxonomy — the naturalist who studies a living system and classifies what he finds). See the naming note in `brainstorming_artifact.md`.*

- Talking Points
    - Operability and observability have always been important within organizations, but in the age of AI, gaps are compunding 
- Tree based org questions to start
- Probing Notes
    - Could it find the artifact T/F? Time in seconds?
    - Model/harness stays constant
    - Cross domain static probes
    - Enterprise specific probes cached for baseline
    - Some way to control for organization size if comparing across enterprises?
- Probe Ideas
    - Agent as COO
        - Current state of paid versus unpaid invoices
        - Find staff contact information
        - Find org chart
        - Fix a recent problem that needed to be fixed
    - Agent as CTO
        - Of a Software Company
            - Monorepo or microservices?
            - How does deployment happen?
            - What is your tech stack?
            - Can carry a simple bug fix from client report to PR (T/F)?
            - Fix some kind of actual recent problem that needed to be fixed
            - Attempt a simple refactor given defined constraints and scope
            - What are the db schemas?
            - Probe around legacy implementations and backwards compat? What even is best practice here? (see probe_legacy_legibility.md)

- Modes (see capture_mode.md)
    - Passive mode (measure) — silent probe, clean friction score, uncontaminated baseline
    - Capture mode — each finding becomes a specific interview question; human answers; candle authors the typed recommendation (Document/Connect/Grant/Fix/Delete) for a human to decide. Capture = data-gathering + recommendation-authoring, NOT the delta source
    - Phases not a toggle: measure → capture (asking mid-run contaminates the standard candle). The hero delta comes from re-auditing a CHANGED org (a caught regression), not from re-measuring after you filled a gap. Optional closure: an executed pure-code Fix can be re-run to show it closes — not the delta
    - Two capture streams: recoverable (journal/write-back, no human) vs unrecoverable (interview the human)
    - Inverse value curve: passive carries the codebase, capture carries the enterprise (mostly glue in heads → the interview IS the data-gathering)
    - Immediate-value / commercial angle: populated docs + org knowledge-map walk out of the session; no "fix it Monday" deferral
    - And then what about Linnaeus ongoing maintenance mode?  An agentic system that helps you maintain agent operability in your organization (infra for capturing and documenting all data and content)?  Probably a future scope demo within demo.

- Scoring Model
    - Two things get bundled into "score" and they cost wildly differently — separate them
        - Correctness (was the answer right?) — needs ground truth, subjective, doesn't port to orgs you don't personally know. Expensive and fragile.
        - Friction (how much did the agent struggle to get there?) — mechanically observable from the run itself, no ground truth required. Cheap and objective.
    - Score friction, not correctness — the friction log IS the audit
        - Objective friction signals (no answer key needed): completed / stalled / had-to-ask (T/F); seconds to first correct move; files opened before confident; tool-calls, retries, dead-ends, backtracks; did it have to guess (low-confidence language)
    - Correctness as a gate, not the score
        - Friction-only misses the confident-wrong run (low friction, wrong answer — the worst case), so keep a coarse correctness check
        - Own-system demo (NxtYou/DocuSpa) supplies the correctness gate for free — this is why "run it on your own system" is load-bearing, not just convenient
        - Product approximates it with cheap proxies: does the code compile, does the traced request actually connect, do N parallel agents converge (self-consistency)
    - The single number is a lossy rollup — be honest about it
        - The real deliverable is a per-probe friction VECTOR; the single "Operability: 61/100" is deliberately lossy marketing painted on top
        - Value is relative/longitudinal, not absolute: "friction 22 → 61 after nxtyou shipped" (a caught regression across a real change) and "61 vs median 48" mean everything; "61" in isolation means almost nothing
        - Matches the two-mechanism split: comparability from the fixed probes, continuity from the cached probes
    - Size normalization: fix the instrument, not the org
        - Same model + same harness + same battery = the standard candle; normalize per-probe against the candle's baseline friction on a known-legible reference, not against org headcount
    - Quality as attribution, not an axis (see talking_points.md → "Quality — as attribution, not as an axis")
        - Never grade quality in the abstract — that's the "how organized are you" app we're avoiding
        - Quality enters ONLY as root-cause attribution for observed friction; quality that causes no agent friction is invisible by design
        - Each friction finding carries a root-cause tag (coupling / dead-code / missing-test / no-owner / no-runbook); metrics never sum into the headline
        - Quality is the codebase-side counterpart to negative-space detection (codebase has ~no negative space, so legibility/quality friction carries the signal there; org side carried by negative space)
        - Price the friction, don't mandate the cleanup — refactors/restructuring stay the company's call
    - Cheap pre-scan → heatmap → probe reveal (demo centerpiece)
        - Static metrics first (DRY, LOC, cyclomatic complexity, coupling) — cheap, instant, no agent → render as codebase heatmap
        - Then drop the probes; the heatmap lights up exactly where the agent face-plants
        - Does three jobs: validates the friction instrument against an independent cheap signal; ships as a standalone fast pre-screen; is the naturalist brand literal (field readings confirmed by direct observation)
        - Metrics stay PREDICTORS — corroboration alongside the friction score, never the score itself


Technical
- Lead agent can run GLM 5.2
- Can use service client creds from other projects 
- TS only, Vercel AI SDK
- Maybe no OpenAuth - creds instead? Or supports both?  openauth for the obvious ones and support for just reading with live creds and keys for the rest - obviusly needs web search then to look up API docs for obscure services 

- [ ]  Make it pretty
    - [ ]  AI images/videos
    - [ ]  Probes
    - [ ]  Agentic System Diagram
