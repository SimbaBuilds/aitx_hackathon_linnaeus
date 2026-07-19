# ☀️ Sunday Morning Checklist — Linnaeus @ AITX/NVIDIA Hackathon

*Everything to do and remember before judging. Self-contained — you shouldn't need to open another doc. Full detail lives in `hackathon_demo_plan.md`; the pitch is `talking_points.md`.*

## ⏰ Hard deadlines
- **11:00 AM — CODE FREEZE / submissions due.** Submit the project BEFORE this.
- **11:30 AM** — back at office · **12:00–3:00 PM — Judging** · **2:00–4:00 PM — Hack Fair + public voting** · **4:00 PM — awards.**
- Submit here: the Airtable form (in the Notion page). Don't miss the 11:00 freeze.

---

## 🥇 Do this first (the critical path)

1. **Sort GPU credits/funding.** The box auto-deleted overnight when credits ran out. A fresh H100 for the judging window is ~$10 — trivial IF a payment method is attached, blocking if not. **Confirm you can pay before you rely on a live box.** If you can't: fall back to the recording (step 4) — still legitimate.
2. **Bring the NVIDIA box up** (Brev) and serve the candle:
   ```bash
   bash /home/shadeform/run_vllm.sh          # on the box (script also at scripts/serving/run_vllm.sh)
   # ~15 min: installs deps, clones the FP8 model, serves on :8000
   ```
3. **Verify + repoint:**
   ```bash
   curl <NEW-URL>/v1/models                   # must list "nemotron"
   ```
   - The URL is **new** each deploy (old dead one was `https://8000-6b6iq7v4d.brevlab.com/v1`).
   - **Edit `.env.local`** → set `CANDLE_BASE_URL=<NEW-URL>/v1`.
   - **Add a line to `COORDINATION.md`** so the build session picks up the new URL.
4. **Backfill the org-board verdicts (Nemotron, ~2 min).** The synthesized org-level board (beat 6) is banked and Nemotron-measured, but the trace-panel *verdict lines* (`OWNER: UNDOCUMENTED …`) couldn't be captured before the box died. One clean run fills them:
   ```bash
   npx tsx scripts/run-synth-board.ts        # prod path — writes results/nemotron_synth_board.json
   ```
   - Needs the repointed `CANDLE_BASE_URL` (step 3) — it MUST be the Nemotron candle, not dev/Haiku. (`LINNAEUS_ALLOW_DEV=1` exists but writes a *separate* `dev_synth_board.json` — never use it for the demo board.)
   - Google auto-refresh is wired in, so no token minting — but if Gmail/Drive show `unauthorized`, run `npx tsx scripts/verify-surfaces.ts` first.
   - Expect: 3 stalled (≈74 / 86.5 / 82.5), `no-owner ×2` + `dead-code`, and "**3 successful non-repo (gmail) calls**" = the cross-surface proof. Trace panels then show the verdict line + the "← reached gmail" marker.
5. **Pre-warm + RECORD (own this footage all day):** run the battery once and screen-record it —
   ```bash
   LINNAEUS_BATTERY_CONCURRENT=1 npx tsx scripts/run-audit.ts
   ```
   Capture, in one ~2-min take (or 3 short ones):
   - the **runtime UI** (candle card + panel: probes-in-flight → 5, KV-cache filling),
   - the **vLLM log** scrolling (`Running: 5 reqs`),
   - the **money-shot delta** in the product UI (16.8 → 70.5),
   - **NEW:** expand an org-board finding to show the **trace** (repo → Gmail reach → `no-owner` stall) — beat 6, watchable.
   → This recording is your ambient/fallback content whether or not the box stays up.
6. **Arrange + practice the proof screens** (below) once, so it's muscle memory.
7. **Keep the box up through 12–3** for the NVIDIA/vLLM judges; kill it if idle after. Don't leave it burning between judges.

---

## 🖥️ Proof screens — have these ready to open (prove it's really Nemotron/vLLM)

You never say "trust me" — you show the server's own telemetry.

| Screen | Command | Proves |
|---|---|---|
| **vLLM log (live)** | `ssh <box> 'tail -f /home/shadeform/vllm.log'` | `Running: 5 reqs` = real batching. Strongest. |
| **Model identity** | `curl <url>/v1/models` | `nemotron` / `NVIDIA-Nemotron-3-Nano-30B-A3B-FP8` / 65k ctx |
| **GPU** | `ssh <box> 'watch -n1 nvidia-smi'` | H100, ~32 GB VRAM held, util spikes on run |
| **Runtime panel** | the app (if built) | pretty version of the above, from vLLM `/metrics` |

**Layout:** browser (app + panel) on one half · `tail -f` terminal on the other · `nvidia-smi` in a corner. Web terminal (Brev/Jupyter tab) is the fallback if SSH is fussy.

---

## 🎬 Booth strategy (3-hr science fair)
- **Always-on:** the **interactive web app on banked data** (heatmap → findings → +53.7 delta). No GPU needed — `next dev` or the deployed app. Let judges click it. **Expand an org-board finding** to reveal the trace (repo → Gmail → `no-owner`) — the watchable beat 6, name-safe (curated anonymizer).
- **Ambient proof:** the morning **recording** (loop it on a second screen/tab).
- **Marquee:** the **live box** run, for judges who care (esp. NVIDIA/vLLM). Not a 3-hr loop.
- **Live-run move:** `LINNAEUS_BATTERY_CONCURRENT=1 npx tsx scripts/run-audit.ts` → ~113s, narrate "5 in flight, vLLM batching them." **2-min mental cap**, then fall back to the recording.

---

## 🔢 Numbers to have on the tip of your tongue
- **Money shot:** billing probe **16.8 (completed) → 70.5 (stalled) = Δ +53.7**, Nemotron-measured, reproducible (`seed 42`, `temp 0`). A *caught regression*, not authored.
- **vLLM A/B:** **200.1s sequential → 113.3s concurrent = 1.77× / −43%**, same H100/model/battery.
- **Codebase board:** 4 of 5 codebase axes legible; billing is the one that drew blood.
- **Org board (beat 6):** 3 synthesized org-level probes, all stalled — **≈74 / 86.5 / 82.5**, `no-owner ×2` + `dead-code`. **3 successful Gmail calls** = Nemotron provably worked the mailbox and *still* found no committed owner (the negative space).
- **Model:** Nemotron-3-Nano-30B-A3B, **FP8**, **~3B active params** (MoE) = the "small-model punch."
- **Banked at:** `results/nemotron_billing_delta.json`, `results/vllm_batching_ab.json`, `results/nemotron_synth_board.json` (org board), `results/synthesized_probes_*.md` (the 8 proposals), `fixtures/demo.json`.

---

## 🎯 The pitch arc (6 beats — full script in `talking_points.md`)
1. **Instrument** — fixed, memory-less Nemotron candle. "The friction log *is* the audit."
2. **Caught regression (money shot)** — 16.8 → 70.5. *[codebase — instrument WORKS]*
3. **Typed recommendation** — candle emits a `Fix` card; human decides.
4. **Codebase board** — 4/5 legible.
5. **Synthesis** — frontier model invented 8 grounded probes from my real org. *[you don't have to know your gaps]*
6. **Org negative-space board** — finds the approver's name in Gmail, still scores `no-owner`. **The absence is the finding.** *[org — instrument MATTERS]*

- **Track/bounty framing:** anchor to **bounties** (vLLM $500 · Nemotron $100/head · Antler Commercializable). Track home = **Red Hat Live Data** (the trigger/heartbeat). **Do NOT pitch Recursive Intelligence** (our delta is a caught regression, not self-improvement).
- **Why vLLM (the "why"):** self-hosting keeps the instrument *calibrated & reproducible* — a correctness requirement, not a cost play. A drifting hosted API can't be a standard candle.

---

## 📤 Submission (before 11:00)
- [ ] Submit on the Airtable form (Notion page).
- [ ] Paste the **efficiency blurb** (in `hackathon_demo_plan.md`) into the vLLM bounty + Frontier/Performance boxes.
- [ ] Attach / reference `nemotron_bounty_writeup.md` (already anonymized) for the Nemotron bounty's required written explanation.
- [ ] Backup slide ready: `slides/vllm_batching_ab.html`.

---

## 🕵️ Anonymization map (keep demo-facing surfaces consistent)
`SKMD → "Telehealth Monorepo"` · `skmd_fastapi → telehealth_api` · `docuspa → medspa_web` · `nxtyou → d2c_web` · clients → **medspa / D2C**. (Planning docs + `results/*.json` keep real names — not demo-facing.)

---

## ⚠️ Gotchas
- **New URL every deploy** → always repoint `.env.local` + tell the build session.
- **Box is delete-only** (no stop/start) and **bills while up** — time-box each spin-up.
- **Dev candle = Haiku 4.5** now — cheap, for iteration only. **Never demo a live Haiku run** (weaker tool-use); a watched live run is the Nemotron box.
- **Two Claude sessions share this repo** — check `COORDINATION.md` for anything the build session left.
