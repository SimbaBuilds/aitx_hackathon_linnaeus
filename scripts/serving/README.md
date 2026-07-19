# Standard candle — serving runbook (WS-A)

**Status (2026-07-19):** LIVE. `nemotron` = Nemotron-3-Nano-30B-A3B **FP8** on vLLM, H100 80GB.
Endpoint: `https://8000-h8t7in906.brevlab.com/v1` (public). Box user: `shadeform`.
Jupyter: `https://jupyter-h8t7in906.brevlab.com/lab` · Brev console instance: `h8t7in906`.
*(The public URL and box id change every redeploy — see step 3.)*

## Confirmed working
- `nano_v3` reasoning parser + `qwen3_coder` tool-call parser → **tool calling verified**.
- `--reasoning-parser deepseek_r1` is WRONG for this model (older blog); use `nano_v3` (L21).
- H100 → FP8 (V6). NVFP4 is Blackwell-only.

## ⚠️ Gotcha: the launchable venv has NO pip (cost us ~40 min on 2026-07-19)
The Brev launchable ships a `/home/shadeform/.venv` with a `python3` but **no `pip`**.
If you `source` that venv and run `pip install`, it silently falls through to the
**system** pip (installs vLLM into `~/.local` for `/usr/bin/python3`) — but the server
then launches with the **venv** python, which can't `import vllm`. The process dies
instantly and the endpoint just **502s with no obvious error**.

**Fix (now baked into `run_vllm.sh`):** don't source the venv. Pick the interpreter that
can actually `import vllm` (that's `/usr/bin/python3`, via `~/.local`), install with *its*
`python3 -m pip`, **verify the import**, and launch the server with that **same** interpreter.
If you ever debug a 502: `ssh`/Jupyter-terminal in and check
`tail -20 /home/shadeform/vllm.log` — `ModuleNotFoundError: No module named 'vllm'`
means you're back in this trap (wrong interpreter).

## Redeploy from scratch (if the instance is deleted — it does NOT support stop/start)
1. Deploy the Launchable: https://brev.nvidia.com/launchable/deploy?launchableID=env-36ikINrMffBCbrtTVLr6MFcllcs
   - Provider: any in-stock H100 80GB (massedcompute / paperspace / scaleway). Voltagepark often OOS.
2. Open the Jupyter terminal and get `run_vllm.sh` onto the box, then: `bash run_vllm.sh`
   (installs deps → clones parser plugin → vLLM downloads FP8 weights → serves on :8000; ~10–20 min first time)
   - **Getting the script onto the box:** the Jupyter xterm mangles multi-line paste
     (collapses newlines; a leading `#!/bin/bash` even triggers `!` history expansion).
     Use the **Upload Files** button in the Jupyter file browser, OR base64 it in one line
     from your laptop:
     ```bash
     B64=$(base64 < scripts/serving/run_vllm.sh | tr -d '\n')
     # paste this single line into the box terminal:
     printf %s '<B64>' | base64 -d > /home/shadeform/run_vllm.sh && chmod +x /home/shadeform/run_vllm.sh
     ```
3. Brev console → instance → Access tab → expose port **8000** → **Edit Access → make PUBLIC**.
   - This mints the new public URL `https://8000-<id>.brevlab.com`. A 502 here means the
     port is public but nothing is serving yet (still loading, or the venv/pip trap above).
4. Update `CANDLE_BASE_URL` in `.env.local` to `https://<new>-...brevlab.com/v1`.

## Smoke test (from anywhere, once public)
    # full check — models + plain chat + THE load-bearing tool-call test:
    CANDLE_BASE_URL=https://<new>-...brevlab.com/v1 CANDLE_MODEL=nemotron bash scripts/serving/smoke.sh

    # or just confirm it's serving:
    curl -s https://<new>-...brevlab.com/v1/models      # lists "nemotron"

## Cost
~$3.28/hr, billed while Running (no stop/start on this env). Covered by the $100 Brev bounty credit.
Delete the instance when the hackathon is done.
