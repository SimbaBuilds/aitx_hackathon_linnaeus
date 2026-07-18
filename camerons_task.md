# Cameron's Task List — things only you can do

*Everything an agent can't: credentials, OAuth, GPU serving, account setup, and the ground-truth facts only you know. Ordered by how much it unblocks. Companion to `implementation_plan.md`.*

Last updated: 2026-07-18 (Sat).

> **How to hand me secrets:** put keys in `.env.local` at the repo root (I'll create the file with placeholder names in WS-0 scaffold — you fill the values). **Do not paste secrets into chat.** For anything that's a login/OAuth flow, run it yourself with the `! <command>` prefix in the prompt so the output lands in-session.

---

## 🔴 TIER 1 — do first (unblocks parallel work + banks the $500)

### 1. Stand up the vLLM + Nemotron endpoint (WS-A — GPU, only you)
This is independent of everything else and banks the $500 vLLM bounty. Sequence:

1. **Brev:** launch a GPU instance. Prefer the ready-made **"Deploying Nemotron-3-Nano with vLLM" Launchable** if it's still listed.
2. **Confirm GPU class (V6):** if **Blackwell** (B200 / RTX PRO 6000) → use the **NVFP4** checkpoint (~21 GB). If **Hopper/Ampere** (H100 / A100) → use **FP8** (~32 GB, fits H100 80 GB). Tell me which — it fixes the model tag.
3. **Serve** (swap `FP8`→`NVFP4` per step 2). `--host 0.0.0.0` is load-bearing — it must be **host-visible, not localhost**, or the sandbox/app can't reach it:
   ```bash
   vllm serve nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B-FP8 \
     --host 0.0.0.0 --port 8000 \
     --served-model-name nemotron-candle \
     --tool-call-parser qwen3_coder \
     --reasoning-parser nano_v3
   ```
   ⚠️ `--reasoning-parser nano_v3` (Nano) / `super_v3` (Super) — **NOT** `deepseek_r1`, which breaks tool calling (L21). Our probe agent needs tool calls.
4. **Smoke test** (from the box):
   ```bash
   curl http://localhost:8000/v1/models
   ```
   then a tool-calling check (I'll hand you the exact JSON body in a `scripts/serving/smoke.sh` — WS-A agent writes it; you run it).
5. **Give me the endpoint:** the box's **public or LAN IP + port** → `CANDLE_BASE_URL=http://<ip>:8000/v1`. If the model is gated on HF, you may need `HUGGING_FACE_HUB_TOKEN` set on the box before serving.
6. **Stop the instance when idle** — $100 Brev ≈ 50 h only if you don't leave it running (L20).

### 2. Dev-candle key (M1 — unblocks the engine before the GPU is up)
The engine develops against **Claude Opus 4.8** through the same seam, then swaps to your vLLM endpoint for measured runs.
- **`ANTHROPIC_API_KEY`** → `.env.local`. (Reuse an existing key from another project if you have one — specs.md notes you can.)

### 3. Supabase project (WS-D — unblocks persistence)
- Create (or point me at an existing) Supabase project.
- Give me: **`NEXT_PUBLIC_SUPABASE_URL`**, **`NEXT_PUBLIC_SUPABASE_ANON_KEY`**, **`SUPABASE_SERVICE_ROLE_KEY`** → `.env.local`.
- If you want me to run migrations directly: the DB password / connection string (else I apply via the Supabase SQL editor and you paste).

### 4. Confirm repo read access (WS-B/E/F — the probe's main target)
- The probe runs against your **local SKMD checkout at `/Users/cameronhightower/Software_Projects/SKMD`**. Confirm I can read it (I already read its `CLAUDE.md`, so this is likely a ✅ — just confirm it's current on `main`).

---

## 🟠 TIER 2 — needed for the org surfaces + the hero probe (WS-E + the delta)

### 5. Ground truth for the billing regression probe (only you know this)
The hero delta depends on these facts — please fill in:
- **Where does the monthly billing script live** in SKMD? (path, e.g. `skmd_fastapi/…`)
- **What distinguishes "before" scope from "after" scope?** i.e. how does the data mark a docuspa client vs an nxtyou D2C client (a table, a `clearance_type`, a flag)?
- **Confirm the failure:** the current script genuinely does **not** correctly price the nxtyou D2C path (so Run 2 legitimately stalls/mis-prices). Yes / details:
- **Which DB tables** hold invoices + clients (so the RDS-read surface + the probe know where to look)?

### 6. Surface credentials (WS-E adapters — I build them, you authorize)
For each, either confirm the existing SKMD skill/token is reusable or provide a new cred:
- **Gmail + Google Drive:** SKMD already has a `gmail-access` skill (token scopes include Drive read-only). **Confirm I can reuse that token here**, or provide a fresh OAuth. Needed for: the deploy-announcement thread (trigger) + Drive runbooks/SOPs.
- **Notion:** **`NOTION_API_KEY`** (integration token) + the **page/database IDs** for the tasks page where progress-reports/follow-up-calls are noted.
- **AWS RDS (prod read):** confirm the probe can read prod via SKMD's SSM path (`scripts/sb_migrate/read_prod.sh` / `prod-db-read` skill), or provide a read-only cred. **Read-only only** — never mutate prod (SKMD rule).

---

## 🟡 TIER 3 — deploy + stretch (later Saturday / Sunday AM)

### 7. Vercel (WS-C deploy)
- Vercel account: either log me in via `! vercel login` in-session, or create the project and give me a **`VERCEL_TOKEN`** + project name so I can deploy via CLI.

### 8. Live Gmail trigger (L28 — the one real trigger)
- Point me at the **exact Gmail thread/label** for the nxtyou deploy announcement so the trigger can watch for (or replay) it.
- Same Gmail token as #6 covers auth.

### 9. NemoClaw + OpenShell (stretch — on the Brev box)
- Installs are `curl …nvidia.com/nemoclaw.sh | bash` and `uv tool install -U openshell` (V3). Confirm whether your Brev box has NGC/NVIDIA creds if the installer asks. Only if we reach the stretch tier.

---

## Quick-fill block (paste values into `.env.local`, not chat)

```
# dev candle (M1)
ANTHROPIC_API_KEY=

# measured candle (from WS-A, step 5)
CANDLE_BASE_URL=            # http://<brev-ip>:8000/v1
CANDLE_MODEL=nemotron-candle

# supabase (WS-D)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# notion surface (WS-E)
NOTION_API_KEY=
NOTION_TASKS_DB_ID=

# vercel (WS-C, optional if you `vercel login` instead)
VERCEL_TOKEN=
```

---

## What I do NOT need from you
- Any Nemotron API key — it's self-hosted on your box (the vLLM endpoint may take a dummy key).
- The friction-measurement logic, the contracts, the UI, the engine — all mine/the agents'.
- Passwords typed into chat — ever. Use `.env.local` or in-session `! login` flows.
