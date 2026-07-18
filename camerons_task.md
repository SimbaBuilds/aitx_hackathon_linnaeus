# Cameron's Task List — things only you can do

*Everything an agent can't: credentials, OAuth, GPU serving, account setup, and the ground-truth facts only you know. Ordered by how much it unblocks. Companion to `implementation_plan.md`.*

Last updated: 2026-07-18 (Sat).

> **How to hand me secrets:** put keys in `.env.local` at the repo root (I'll create the file with placeholder names in WS-0 scaffold — you fill the values). **Do not paste secrets into chat.** For anything that's a login/OAuth flow, run it yourself with the `! <command>` prefix in the prompt so the output lands in-session.

---

## 🔴 TIER 1 — do first (unblocks parallel work + banks the $500)

### 1. Stand up the vLLM + Nemotron endpoint (WS-A — GPU) — ✅ DONE (2026-07-18)
**Live:** `nemotron` (Nemotron-3-Nano-30B-A3B **FP8**) on vLLM, H100 80GB (MASSEDCOMPUTE via Brev). Endpoint: `https://8000-6b6iq7v4d.brevlab.com/v1` (public). Tool-calling **verified** (nano_v3 reasoning + qwen3_coder tool parser). In `.env.local` as `CANDLE_BASE_URL`/`CANDLE_MODEL`. Resolves **V6 = H100→FP8** and confirms **L21 = nano_v3** (not deepseek_r1).
- ⚠️ **Only remaining thing YOU do here: STOP the instance in Brev when we're not actively testing** — it's ~$3.28/hr. Restart + re-run `bash run_vllm.sh` (already on the box) to bring it back.
- Launch script lives at `/home/shadeform/run_vllm.sh` on the box; logs to `/home/shadeform/vllm.log`.

<details><summary>Original setup instructions (kept for reference / restart)</summary>

Independent of everything else; banks the $500 vLLM bounty. **You have zero setup experience here, so use the Launchable path (A) — it's one click and comes preconfigured with the exact model + serve command.**

**Docs:** [Brev quickstart](https://docs.nvidia.com/brev/getting-started/quickstart) · [console walkthrough](https://docs.nvidia.com/brev/guides/console-reference) · [Nemotron-3-Nano vLLM blog (exact commands)](https://vllm.ai/blog/2025-12-15-run-nvidia-nemotron-3-nano) · [cookbook notebook](https://github.com/NVIDIA-NeMo/Nemotron/blob/main/usage-cookbook/Nemotron-3-Nano/vllm_cookbook.ipynb)

#### ➤ Path A — the Launchable (RECOMMENDED, no guessing)
1. Open the **["Deploying NVIDIA Nemotron-3-Nano with vLLM" Launchable](https://brev.nvidia.com/launchable/deploy?launchableID=env-36ikINrMffBCbrtTVLr6MFcllcs)**.
2. Sign in to Brev (NVIDIA account). If prompted, add a payment method — **your $100 Brev bounty credit should cover it; stop the instance when idle** (L20).
3. Click **Deploy Launchable** and pick a GPU. Any of these serve the 30B model fine — cheapest that fits wins:
   - **RTX PRO 6000** (Blackwell, 96 GB) — great + cheap; enables **NVFP4**.
   - **H100** (Hopper, 80 GB) — safe default; use **FP8**.
   - **B200** (Blackwell) — overkill but fine; NVFP4.
   - *(avoid A100 40 GB — too small for FP8; A100 80 GB is OK.)*
   → **Tell me which GPU it gave you** (that resolves V6: Blackwell→NVFP4 vs Hopper→FP8).
4. Provisioning takes 1–2 min. Open **JupyterLab** (in-browser) and run the cookbook's cells — they start `vllm serve` for you with the correct flags. **Change the port in the serve cell to `8000`** if it isn't already, and keep `--host 0.0.0.0`.
5. **Expose the port:** instance detail → **Access** tab → enter **`8000`** → **Add** → copy the generated public URL.
6. **Give me:** `CANDLE_BASE_URL=<that public URL>/v1` (I'll drop it into `.env.local`). Also tell me the `--served-model-name` the cookbook used (likely `nemotron`).
7. **Stop the instance** (instance → **Stop**) whenever you're not actively using it.

#### ➤ Path B — blank instance (only if the Launchable is gone)
Console → **GPUs** → **Create Instance** → pick **H100** → **Create** → open the terminal, then:
```bash
vllm serve --model "nvidia/NVIDIA-Nemotron-Nano-3-30B-A3B-FP8" \
  --dtype auto --trust-remote-code --served-model-name nemotron \
  --host 0.0.0.0 --port 8000 \
  --enable-auto-tool-choice --tool-call-parser qwen3_coder \
  --reasoning_parser deepseek_r1
```
Then **Access** tab → expose `8000` → send me the URL. (NVFP4: swap the tag to `nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B-NVFP4`.)

> ⚠️ **Parser note (I'll verify, not you):** the official NVIDIA/vLLM blog uses `--reasoning_parser deepseek_r1` *together with* tool calling — which contradicts our earlier PLAN L21 note that `deepseek_r1` breaks tool calls. **Just use whatever the Launchable's cookbook ships.** Once your endpoint is up, I'll run a tool-calling smoke test through it; if tool calls fail, *that's* when we swap the reasoning parser. Don't worry about this — it's my problem to confirm.

**Smoke test:** once it's up, from the box: `curl http://localhost:8000/v1/models` should list `nemotron`. I'll do the tool-calling test remotely once you send me `CANDLE_BASE_URL`.

</details>

### 2. Dev-candle key (M1 — unblocks the engine before the GPU is up)
The engine develops against **Claude Opus 4.8** through the same seam, then swaps to your vLLM endpoint for measured runs.
- **`ANTHROPIC_API_KEY`** → `.env.local`. (Reuse an existing key from another project if you have one — specs.md notes you can.)

### 3. Supabase project (WS-D — unblocks persistence) — ✅ DONE (I did this via CLI)
- Project **Linnaeus** (ref `jdiidxgtxxbngatepcfl`, us-east-1, in your **personal** org "Cameron Hightower Personal Supabase" — free plan). Dashboard: https://supabase.com/dashboard/project/jdiidxgtxxbngatepcfl
- URL + anon + service_role + db password are already in `.env.local`. I'll run migrations via the CLI/service key.
- *Nothing needed from you.*

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
