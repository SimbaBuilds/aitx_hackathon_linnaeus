# Standard candle — serving runbook (WS-A)

**Status (2026-07-18):** LIVE. `nemotron` = Nemotron-3-Nano-30B-A3B **FP8** on vLLM, H100 80GB.
Endpoint: `https://8000-6b6iq7v4d.brevlab.com/v1` (public). Box IP: 216.81.200.56 (Des Moines, massedcompute).

## Confirmed working
- `nano_v3` reasoning parser + `qwen3_coder` tool-call parser → **tool calling verified**.
- `--reasoning-parser deepseek_r1` is WRONG for this model (older blog); use `nano_v3` (L21).
- H100 → FP8 (V6). NVFP4 is Blackwell-only.

## Redeploy from scratch (if the instance is deleted — it does NOT support stop/start)
1. Deploy the Launchable: https://brev.nvidia.com/launchable/deploy?launchableID=env-36ikINrMffBCbrtTVLr6MFcllcs
   - Provider: any in-stock H100 80GB (massedcompute / paperspace / scaleway). Voltagepark often OOS.
2. Open the Jupyter terminal, upload/paste `run_vllm.sh`, then: `bash run_vllm.sh`
   (installs deps → downloads FP8 weights → serves on :8000; ~10–15 min first time)
3. Brev console → instance → Access tab → expose port **8000** → **Edit Access → make PUBLIC**.
4. Update `CANDLE_BASE_URL` in `.env.local` to `https://<new>-...brevlab.com/v1`.

## Smoke test (from anywhere, once public)
    curl -s https://8000-6b6iq7v4d.brevlab.com/v1/models      # lists "nemotron"
    # tool-calling test: POST /v1/chat/completions with a tools[] array → expect finish_reason=tool_calls

## Cost
~$3.28/hr, billed while Running (no stop/start on this env). Covered by the $100 Brev bounty credit.
Delete the instance when the hackathon is done.
