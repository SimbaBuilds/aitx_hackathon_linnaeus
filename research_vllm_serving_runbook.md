# vLLM × Nemotron 3 Serving Runbook & Hardware-Sizing Guide

*Solo hackathon build — a pinned "standard candle" OpenAI-compatible endpoint.*
Compiled 2026-07-17 from primary sources (docs.vllm.ai, vllm.ai/blog, huggingface.co/nvidia, github.com/NVIDIA-NeMo/Nemotron, docs.nvidia.com/brev). Confidence tags: **[High]** = stated verbatim in a primary source; **[Med]** = derived/cross-referenced; **[Low]** = estimate or unverified.

---

## 1. TL;DR — Recommended Default

**Model:** `nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B-NVFP4`
**Quant:** NVFP4 (routed MoE experts in NVFP4, Mamba/attention/shared-expert in FP8) + FP8 KV cache
**GPU:** 1× Blackwell-class GPU with ≥ 24 GB VRAM (RTX PRO 6000 96 GB, B200, or DGX Spark). Weights ≈ 20.9 GB. **[High]**
**Why this tier:** 30B total / ~3.5B active MoE is a genuinely capable multi-step agentic/tool-use reasoner, fits on ONE GPU, and NVFP4 is the cheapest reproducible checkpoint to pin. It ships with a native tool-call parser + reasoning parser, which is exactly what an agent loop needs.

**Default serve command (copy-paste):**
```bash
VLLM_USE_FLASHINFER_MOE_FP4=1 \
VLLM_FLASHINFER_MOE_BACKEND=throughput \
vllm serve nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B-NVFP4 \
  --served-model-name nemotron \
  --max-num-seqs 8 \
  --tensor-parallel-size 1 \
  --max-model-len 262144 \
  --kv-cache-dtype fp8 \
  --trust-remote-code \
  --host 0.0.0.0 \
  --port 8000 \
  --enable-auto-tool-choice \
  --tool-call-parser qwen3_coder \
  --reasoning-parser-plugin nano_v3_reasoning_parser.py \
  --reasoning-parser nano_v3
```
Requires **vLLM ≥ 0.12.0**, CUDA 12.x. **[High]**

**Reproducibility pinning (do all of these):**
- Pin the exact HF repo revision (commit SHA), not just the tag.
- Pin `--seed 0` on the server (or pass `seed` per request), `temperature=0`, `top_p=1` on the client.
- Record the vLLM version (`vllm --version`) and the `nano_v3_reasoning_parser.py` file hash.
- Do **not** re-quantize — this checkpoint is already NVFP4/FP8.

> ⚠️ **Model-ID naming caveat [Med]:** The HF model cards and the NeMo cookbook use `NVIDIA-Nemotron-3-Nano-30B-A3B`. The vLLM blog text renders it `NVIDIA-Nemotron-Nano-3-30B-A3B` (word order swapped). Treat the **HF repo page as authoritative** and copy the ID from `huggingface.co/nvidia` directly before you `vllm serve`. Verify the repo resolves before relying on it.

---

## 2. Per-Tier Serve Commands (confirmed flags)

### Tier A — Nemotron-3-Nano-30B-A3B (single-GPU candle)

Architecture: Mamba2-Transformer **Hybrid MoE** — 23 Mamba-2/MoE layers + 6 attention layers, 128 routed + 1 shared expert, 6 experts/token, 30B total / ~3.5B active. **[High]**
Source: https://huggingface.co/nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B-NVFP4

**NVFP4 (default, Blackwell):** see TL;DR above. **[High]**

**BF16 (Hopper/Ampere, needs ≥ 64 GB):** **[High]**
```bash
vllm serve nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B-BF16 \
  --dtype auto \
  --trust-remote-code \
  --served-model-name nemotron \
  --host 0.0.0.0 --port 8000 \
  --enable-auto-tool-choice \
  --tool-call-parser qwen3_coder \
  --reasoning-parser-plugin "NVIDIA-Nemotron-3-Nano-30B-A3B-BF16/nano_v3_reasoning_parser.py" \
  --reasoning-parser nano_v3
```

**FP8 (Hopper, ~32 GB):** same as BF16 but `...-A3B-FP8`. **[High]**

> **Reasoning-parser choice is load-bearing.** The vLLM blog's original snippet used `--reasoning-parser deepseek_r1`. That parser **breaks tool calling** (reasoning leaks / tool calls fail to parse). NVIDIA shipped a custom `nano_v3` reasoning parser (`nano_v3_reasoning_parser.py`, downloadable from the HF repo) which is what the NeMo cookbook and HF card now use. **For an agent that needs tool use, use `nano_v3`, not `deepseek_r1`.** **[High]**
> Sources: https://huggingface.co/nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B-BF16/discussions/3 · https://github.com/NVIDIA-NeMo/Nemotron/blob/main/usage-cookbook/Nemotron-3-Nano/vllm_cookbook.ipynb
> **Confirmed parser values for Nano tier: tool-call-parser = `qwen3_coder`; reasoning-parser = `nano_v3`.** (Not `nemotron_v3`, which was floated but does not appear in current docs; not `deepseek_r1`, which is superseded for tool use.) **[High]**

Download the plugin first:
```bash
huggingface-cli download nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B-NVFP4 \
  nano_v3_reasoning_parser.py --local-dir .
```

### Tier B — Nemotron-3-Super-120B-A12B (bigger box)

Architecture: hybrid Latent-MoE (interleaved Mamba-2 + MoE + select attention), ~120B total / ~12B active, includes **Multi-Token Prediction (MTP)** layers, up to 1M context. **[High]**
Source: https://huggingface.co/nvidia/NVIDIA-Nemotron-3-Super-120B-A12B-NVFP4

**NVFP4 serve command (verbatim from HF card):** **[High]**
```bash
vllm serve nvidia/NVIDIA-Nemotron-3-Super-120B-A12B-NVFP4 \
  --served-model-name nvidia/nemotron-3-super \
  --async-scheduling \
  --dtype auto \
  --max-model-len 262144 \
  --swap-space 0 \
  --trust-remote-code \
  --kv-cache-dtype fp8 \
  --gpu-memory-utilization 0.9 \
  --max-cudagraph-capture-size 128 \
  --enable-chunked-prefill \
  --mamba-ssm-cache-dtype float16 \
  --reasoning-parser-plugin /app/super_v3_reasoning_parser.py \
  --reasoning-parser super_v3 \
  --enable-auto-tool-choice \
  --tool-call-parser qwen3_coder
```
Requires **vLLM 0.20.0**. **Note the Super tier uses reasoning-parser `super_v3`** (different plugin file `super_v3_reasoning_parser.py`) — tool-call-parser stays `qwen3_coder`. **[High]**

DGX Spark env vars (from card): `VLLM_NVFP4_GEMM_BACKEND=marlin`, `VLLM_ALLOW_LONG_MAX_MODEL_LEN=1`, `VLLM_FLASHINFER_ALLREDUCE_BACKEND=trtllm`, `VLLM_USE_FLASHINFER_MOE_FP4=0`. **[High]**

> ⚠️ Known Super issue: **MTP / speculative decoding can OOM on RTX 6000 Pro** (spec-decode eats 20 GB+ at startup). If OOM, disable MTP/spec-decode. **[High]** — https://huggingface.co/nvidia/NVIDIA-Nemotron-3-Super-120B-A12B-NVFP4/discussions/9

### Tier C — Legacy Nemotron-Nano-9B-v2 (trivial single-GPU fallback)

Different, older parser scheme — **do not reuse the Nano-3 flags here.** **[High]**
Source: https://huggingface.co/nvidia/NVIDIA-Nemotron-Nano-9B-v2/discussions/9 · https://vllm.ai/blog/2025-10-23-now_serving_nvidia_nemotron_with_vllm
```bash
vllm serve nvidia/NVIDIA-Nemotron-Nano-9B-v2 \
  --trust-remote-code \
  --mamba_ssm_cache_dtype float32 \
  --served-model-name nemotron \
  --host 0.0.0.0 --port 8000 \
  --enable-auto-tool-choice \
  --tool-parser-plugin "NVIDIA-Nemotron-Nano-9B-v2/nemotron_toolcall_parser_no_streaming.py" \
  --tool-call-parser nemotron_json
```
- `--mamba_ssm_cache_dtype float32` is **required for accuracy** (Mamba hybrid). **[High]**
- Reasoning toggled via system prompt `/think` (no separate reasoning-parser plugin in the base recipe). **[High]**
- An `-NVFP4` variant exists (`nvidia/NVIDIA-Nemotron-Nano-9B-v2-NVFP4`) for even smaller footprint. **[Med]**

---

## 3. VRAM / Hardware by Tier & Quant

| Model | Quant | Weight footprint | Min single-GPU VRAM | GPU(s) needed | Confidence |
|---|---|---|---|---|---|
| Nano-30B-A3B | **NVFP4** | 20.9 GB | **≥ 24 GB** (leave room for KV/activations) | 1× Blackwell (RTX PRO 6000 96 GB, B200, DGX Spark). Card lists tested on B200 192 GB, RTX PRO 6000 96 GB, Jetson Thor, DGX Spark | weights **[High]**, 24 GB min **[Med]** |
| Nano-30B-A3B | FP8 | ~30 GB | ≥ 32 GB | 1× H100/H200 | **[High]** (cookbook: "≥ 32 GB for FP8") |
| Nano-30B-A3B | BF16 | ~60 GB | ≥ 64 GB | 1× H100 80 GB (or 1× A100 80 GB) | **[High]** (cookbook: "≥ 64 GB for BF16") |
| Super-120B-A12B | NVFP4 | ~65–70 GB | fits 1 GPU | **1× B200** OR 1× DGX Spark | GPU count **[High]**, GB **[Low]** |
| Super-120B-A12B | FP8 | ~120 GB | multi-GPU | 2× B200 **or** 2× H100 | **[High]** |
| Super-120B-A12B | BF16 | ~240 GB | multi-GPU | 4× A100 (or 4–8× H100/H200/B200) | **[High]** |
| Nano-9B-v2 | BF16 | ~18 GB | ≥ 24 GB | 1× A100/L40S/RTX class | **[Med]** |

Notes:
- **NVFP4 requires Blackwell** (B200 / RTX PRO 6000 / DGX Spark / RTX 5090-class) + CUDA 12.x. It will **not** run on A100 (Ampere) or plain H100 (Hopper) at native NVFP4 speed. If you only have an H100/A100, use the **FP8** checkpoint instead of NVFP4. **[High]**
- The 24 GB NVFP4 minimum is a working estimate: 20.9 GB weights + FP8 KV cache + CUDA graphs. At the full 262k context you'll want more headroom (48–96 GB); drop `--max-model-len` (e.g. 32768) on smaller cards. **[Med]**
- Sources: https://huggingface.co/nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B-NVFP4 · https://github.com/NVIDIA-NeMo/Nemotron/blob/main/usage-cookbook/Nemotron-3-Nano/vllm_cookbook.ipynb · https://huggingface.co/nvidia/NVIDIA-Nemotron-3-Super-120B-A12B-NVFP4

---

## 4. Brev / Compute Reality for a Solo Hackathon Participant

**What Brev is:** NVIDIA's GPU-instance broker — it provisions single GPU boxes from multiple cloud providers (Hyperstack, Voltage Park, Lambda, etc.) and offers **Launchables** (preconfigured container + notebook images). Billing is **per-hour while the instance is Running**; **Stopped** instances preserve data with no compute charge (data is pinned to the original provider/region). If credits run out, Brev stops/deletes instances after a grace period. **[High]**
Sources: https://developer.nvidia.com/brev · https://docs.nvidia.com/brev/concepts/gpu-instances · https://docs.nvidia.com/brev/reference/gpu-types

**GPU types Brev offers (VRAM):** B200 192 GB, H200 141 GB, H100 96 GB, A100 80 GB; L40S 44 GB, L40/RTX 6000 Ada 48 GB, **RTX PRO Server 6000 96 GB**, A6000 48 GB, RTX 5090 32 GB, L4/A10G 22 GB; plus entry T4/V100. DGX Spark can be **registered** as your own compute. **[High]**

**There IS a ready-made Launchable that skips setup:** "Deploying NVIDIA Nemotron-3-Nano with vLLM" — a Brev Launchable that ships the NVFP4 vLLM image. Use it instead of hand-installing. **[High]**
- https://brev.nvidia.com/launchable/deploy?launchableID=env-36ikINrMffBCbrtTVLr6MFcllcs
- Generic vLLM cookbook Launchable also available (H100, ~$1.99–2.28/hr observed). **[Med]**

**What "$100 Brev credits" realistically buys (observed 2026 rates):**

| GPU | ~$/hr (market, via Brev providers) | Hours per $100 | Weekend (48h) feasible? |
|---|---|---|---|
| A100 80 GB | ~$1.29–1.79 | ~56–77 h | **Yes**, comfortably (FP8 Nano) |
| H100 80/96 GB | ~$1.99–2.28 (Voltage Park / Hyperstack) | ~44–50 h | **Yes** (FP8/BF16 Nano) |
| L40S 44 GB | ~$0.50–1.00 | ~100–200 h | **Yes** (FP8/9B fallback) |
| B200 192 GB (native NVFP4) | ~$4–6 (est.) | ~17–25 h | Tight — enough for the demo, not idle |
| RTX PRO 6000 96 GB (NVFP4) | ~$1.5–3 (est.) | ~33–66 h | **Yes** — best NVFP4 value |

Confidence: A100/H100/L40S rates **[High]** (cross-provider); B200/RTX PRO 6000 rates **[Low]** (estimated, verify in Brev console at launch).

**Bottom line for the prize:** **$100 is enough to run a Nano candle for a weekend**, with margin — *if you STOP the instance when not actively demoing.* The cheapest reproducible NVFP4 path is **RTX PRO 6000 96 GB**; if NVFP4-native hardware isn't cheap/available, run the **FP8 Nano on a single A100/H100** (~50 h per $100). Idle-instance burn is the #1 way to waste the credits — always Stop.

**Free/hackathon compute:** Beyond the $100 prize credits, no separate always-free Brev GPU tier was found in the docs. Check the hackathon's own sponsor channel for extra codes; NVIDIA sometimes seeds additional Brev credits for event participants. **[Low — verify with organizers]**

**Best path to a single H100/A100-class box for a weekend:** launch the **Nemotron-3-Nano vLLM Launchable** on an A100 80 GB (FP8) or an RTX PRO 6000 96 GB (NVFP4) from the Brev console, run your candle, and Stop between sessions. Sources: https://docs.nvidia.com/brev/concepts/launchables · https://docs.nvidia.com/brev/reference/gpu-types

---

## 5. Serving Gotchas (vLLM × Nemotron field notes)

1. **baseURL must end at `/v1`.** Client `base_url = http://HOST:8000/v1`. Endpoints are `/v1/models`, `/v1/chat/completions`. Omitting `/v1` gives 404s. **[High]**
2. **`--served-model-name` must match the client's `model` field exactly.** The commands above set it to `nemotron` (Super card uses `nvidia/nemotron-3-super`). Whatever you pick, the client `model=` string must be identical or you get "model not found." **[High]**
3. **Use `nano_v3` reasoning-parser, NOT `deepseek_r1`, when tool-calling.** `deepseek_r1` breaks tool calls and lets reasoning text leak into tool-call args. `nano_v3` (Nano) / `super_v3` (Super) parse reasoning cleanly and keep tool JSON out of the reasoning channel. Tool calls are parsed only from the `content` field, not from reasoning. **[High]** — https://huggingface.co/nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B-BF16/discussions/3
4. **`finish_reason: "length"` — reasoning eats the token budget.** These are reasoning models; the thinking trace consumes output tokens before the visible answer/tool call. Set a generous `max_tokens` (e.g. 4096–8192+) or you'll truncate mid-reason and never get the tool call. To disable thinking entirely, pass chat-template arg `enable_thinking=False` (Nano) or use `/think`//`/no_think` style control on 9B-v2. **[High]**
5. **Do NOT double-quantize.** The `-NVFP4` and `-FP8` checkpoints are already quantized (PTQ + quantization-aware distillation). Don't pass an extra `--quantization` flag or re-run a quantizer over them. **[High]**
6. **Mamba-hybrid / MoE-specific flags:**
   - `--trust-remote-code` is required (custom modeling code). **[High]**
   - NVFP4 MoE path needs `VLLM_USE_FLASHINFER_MOE_FP4=1` + `VLLM_FLASHINFER_MOE_BACKEND=throughput`. **[High]**
   - `--kv-cache-dtype fp8` recommended to fit long context. **[High]**
   - Mamba SSM cache dtype matters: `float32` on 9B-v2 (accuracy), `float16` used on Super. **[High]**
   - Version floors: **Nano ≥ vLLM 0.12.0**, **Super = vLLM 0.20.0**. Pin the exact version; parser plugin names track the release. **[High]**
7. **NVFP4 needs Blackwell.** On Hopper/Ampere use the FP8 checkpoint instead — NVFP4 won't run natively. **[High]**

---

## 6. Smoke-Test Commands (copy-paste)

Assume `HOST=localhost`, port `8000`, `--served-model-name nemotron`.

**(a) Endpoint up — list models:**
```bash
curl -s http://localhost:8000/v1/models | python3 -m json.tool
```
Expect a JSON object with `"id": "nemotron"`.

**(b) Chat completion works:**
```bash
curl -s http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "nemotron",
    "messages": [{"role": "user", "content": "Reply with exactly: OK"}],
    "temperature": 0,
    "max_tokens": 2048
  }' | python3 -m json.tool
```
Set `max_tokens` high — reasoning consumes budget (gotcha #4). Check `choices[0].message.content` and, if present, `reasoning_content`.

**(c) Tool calling works (the one that matters for an agent):**
```bash
curl -s http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "nemotron",
    "messages": [{"role": "user", "content": "What is the weather in Austin, TX? Use the tool."}],
    "temperature": 0,
    "max_tokens": 4096,
    "tools": [{
      "type": "function",
      "function": {
        "name": "get_weather",
        "description": "Get current weather for a city",
        "parameters": {
          "type": "object",
          "properties": { "city": {"type": "string"} },
          "required": ["city"]
        }
      }
    }],
    "tool_choice": "auto"
  }' | python3 -m json.tool
```
**Pass criteria:** `choices[0].message.tool_calls[0].function.name == "get_weather"` and `arguments` is valid JSON containing `{"city": "Austin, TX"}` — with **no reasoning text leaking into `arguments`** (that's the `nano_v3` parser doing its job). If arguments are garbled or empty, your reasoning-parser is wrong (see gotcha #3).

---

## 7. "Genuinely in the Loop" + Efficiency Story for the vLLM Bounty

The judged win is demonstrating vLLM's **continuous (in-flight) batching** and **concurrent request handling** on your live candle. Concretely:

**Metrics endpoint (built in, no setup):**
```bash
curl -s http://localhost:8000/metrics | grep -E 'vllm:(num_requests_running|num_requests_waiting|prompt_tokens|generation_tokens|time_to_first_token)'
```
Key Prometheus gauges/counters (verbatim names): **[High]**
- `vllm:num_requests_running` — requests in the active GPU batch **right now** (this is continuous batching visible live: it rises as concurrent requests join the in-flight batch).
- `vllm:num_requests_waiting` — queue depth (requests waiting for scheduler capacity).
- `vllm:prompt_tokens_total`, `vllm:generation_tokens_total` — throughput counters (tokens/s = delta over time).
- `vllm:time_to_first_token_seconds` — TTFT histogram.
Source: https://docs.vllm.ai/en/stable/design/metrics/

**How to demonstrate (the concrete demo):**
1. Fire **N concurrent requests** at `/v1/chat/completions` (e.g. 32 parallel curls, or `vllm bench serve`). Watch `vllm:num_requests_running` climb to ~N and `num_requests_waiting` stay low — that's in-flight batching folding concurrent requests into one running batch instead of serializing them.
2. Use the official benchmark to produce a headline number:
   ```bash
   vllm bench serve \
     --model nemotron \
     --base-url http://localhost:8000 \
     --dataset-name random \
     --num-prompts 200 \
     --max-concurrency 32
   ```
   Capture **output-token throughput (tok/s)** and **request throughput (req/s)** at concurrency 1 vs 8 vs 32. The story is: throughput scales with concurrency at roughly flat per-request latency until the batch saturates — the efficiency win. **[Med]** (`vllm bench serve` is the current vLLM benchmarking entrypoint.)
3. **Metrics to report:** (a) aggregate output tok/s, (b) req/s, (c) `num_requests_running` peak (proves concurrent in-flight batching), (d) p50/p99 TTFT stable under load. Show a before/after: single-request tok/s vs 32-concurrent aggregate tok/s on the *same* GPU.
4. Bonus framing for Nemotron specifically: the hybrid Mamba-Transformer MoE gives "up to 4× higher token throughput" and "serves more requests on the same GPU" — pair the model claim with your measured vLLM concurrency numbers. **[High]** — https://vllm.ai/blog/2025-12-15-run-nvidia-nemotron-3-nano

Optional: scrape `/metrics` into Prometheus/Grafana for a live concurrency graph during the demo. **[Med]**

---

## 8. Uncertain / Unverifiable — Flag Before Relying

- **Exact model-ID word order** (`Nemotron-3-Nano` vs `Nemotron-Nano-3`): HF cards + cookbook say `NVIDIA-Nemotron-3-Nano-30B-A3B`; vLLM blog prose swaps it. **Copy the ID from the HF repo page at launch.** **[Med]**
- **NVFP4 single-GPU minimum of 24 GB**: derived (20.9 GB weights + overhead), not stated verbatim. At full 262k context budget more. **[Med/Low]**
- **B200 / RTX PRO 6000 hourly price on Brev**: estimated; A100/H100/L40S rates are well-sourced. Verify live in the Brev console. **[Low]**
- **Super-120B NVFP4 GB footprint**: GPU *count* (1× B200) is stated; the ~65–70 GB figure is inferred. **[Low]**
- **`vllm bench serve` exact flags**: entrypoint is current but flags shift across versions — run `vllm bench serve --help` on your pinned version. **[Med]**
- **Extra hackathon/free credits beyond the $100 prize**: not in Brev docs; confirm with organizers. **[Low]**
- The `qwen3_coder` tool-call parser is confirmed for **both** Nano and Super. The floated `nemotron_v3` parser name does **not** appear in current vLLM docs/cards — do not use it. **[High]**

---

### Source URLs (all cited inline above)
- vLLM blog — Nemotron 3 Nano: https://vllm.ai/blog/2025-12-15-run-nvidia-nemotron-3-nano
- vLLM blog — Now Serving Nemotron (9B-v2): https://vllm.ai/blog/2025-10-23-now_serving_nvidia_nemotron_with_vllm
- vLLM blog — Nemotron 3 Super: https://vllm.ai/blog/2026-03-11-nemotron-3-super
- HF — Nano-30B-A3B NVFP4: https://huggingface.co/nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B-NVFP4
- HF — Nano-30B-A3B BF16 (parser-broken discussion #3): https://huggingface.co/nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B-BF16/discussions/3
- HF — Super-120B-A12B NVFP4 (+ MTP OOM discussion #9): https://huggingface.co/nvidia/NVIDIA-Nemotron-3-Super-120B-A12B-NVFP4
- HF — Nemotron-Nano-9B-v2 (tool-call discussion #9): https://huggingface.co/nvidia/NVIDIA-Nemotron-Nano-9B-v2/discussions/9
- NeMo cookbook (Nano): https://github.com/NVIDIA-NeMo/Nemotron/blob/main/usage-cookbook/Nemotron-3-Nano/vllm_cookbook.ipynb
- vLLM metrics design doc: https://docs.vllm.ai/en/stable/design/metrics/
- Brev GPU types: https://docs.nvidia.com/brev/reference/gpu-types
- Brev GPU instances / billing: https://docs.nvidia.com/brev/concepts/gpu-instances
- Brev Launchables: https://docs.nvidia.com/brev/concepts/launchables
- Brev Nemotron-3-Nano vLLM Launchable: https://brev.nvidia.com/launchable/deploy?launchableID=env-36ikINrMffBCbrtTVLr6MFcllcs
- Brev overview: https://developer.nvidia.com/brev
