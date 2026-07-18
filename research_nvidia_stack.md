# NVIDIA Sponsor Stack Research — AITX "Claw Agent" Hackathon (for Linnaeus)

Research date: 2026-07-17. Confidence levels are flagged inline: **[High]** = corroborated by NVIDIA/vLLM primary sources; **[Med]** = single credible source or light inference; **[Low]** = inferred / not directly confirmed.

**First, the naming question you flagged:** These are **NOT** fictional or purely hackathon-branded. As of the 2026 timeline they are **real, shipping NVIDIA open-source projects**, announced at **GTC 2026 (March 16–19, 2026)** and currently in **alpha**:

- **NVIDIA/NemoClaw** — real GitHub repo, Apache 2.0. [github.com/NVIDIA/NemoClaw](https://github.com/NVIDIA/NemoClaw)
- **NVIDIA/OpenShell** — real GitHub repo. [github.com/NVIDIA/OpenShell](https://github.com/NVIDIA/OpenShell)
- **OpenClaw** — real, independent OSS agent framework (openclaw/openclaw, ~250k stars), the "heartbeat" always-on local agent gateway. [github.com/openclaw/openclaw](https://github.com/openclaw/openclaw). This is the one whose *heartbeat/repeated-inference* model the vLLM bounty language is riffing on.
- **Nemotron 3** — real NVIDIA open-weight model family (Nano/Super/Ultra).
- **NIM / vLLM / Brev** — all real NVIDIA-ecosystem products.

So: I researched the actual projects, not guesses. The only genuinely thin spots are alpha-stage doc gaps (OpenShell's full policy schema for escalation/human-in-the-loop), flagged in §7.

---

## 1. TL;DR — the integrated-path answer (your decision)

**YES. One setup legitimately earns all three bounties, with high overlap.** The stack is explicitly designed to compose, and — critically — **NemoClaw supports "Existing vLLM" as a first-class inference provider**, so your self-hosted standard-candle endpoint IS the thing agents route to. Nothing forces you onto NIM or Ollama. **[High]**

The one integrated setup:

```
[ vLLM serving Nemotron, OpenAI-compatible :8000/v1 ]   <-- your pinned "standard candle"
                 ^
                 |  routed inference (NemoClaw provider = "Existing vLLM")
[ NemoClaw CLI ] installs & supervises
                 |
[ OpenClaw agent ] (heartbeat gateway; your probe-agents)
                 |  runs INSIDE
[ OpenShell sandbox ] governed by your policy.yaml (blocks push-to-main / secrets / exfil)
```

- **vLLM bounty ($500):** satisfied by standing up the Nemotron-on-vLLM OpenAI endpoint and genuinely hammering it with your probe/heartbeat workload (continuous batching, PagedAttention, concurrent probes). Your Linnaeus "standard candle" *is* the vLLM entry. **[High]**
- **Nemotron bounty ($100 Brev/member):** satisfied *for free* by the same endpoint — the open model you serve on vLLM is Nemotron. **[High]**
- **NemoClaw + OpenShell bounty ($100 Brev/member):** satisfied by installing your agent via NemoClaw (routed to your vLLM Nemotron) AND authoring a real OpenShell `policy.yaml` that survives adversarial testing. **[High]**

**Overlap verdict:** vLLM + Nemotron bounties are essentially **the same deliverable** (one endpoint). NemoClaw+OpenShell adds **one incremental layer** (install-via-NemoClaw + write-a-policy) on top, reusing the exact same endpoint. Estimate **~70% shared work**; the independent 30% is the OpenShell policy authoring + adversarial hardening. This maps almost perfectly onto Linnaeus (probe-agents that need a pinned model and a sandbox to run real tasks in).

**One caveat to design around:** NemoClaw's *default happy path* nudges you toward "Managed vLLM" or "Local Ollama," and OpenShell has a "Privacy Router" that re-routes inference. You must explicitly select the **"Existing vLLM"** / **"Other OpenAI-compatible endpoint"** provider and make sure the OpenShell network policy *allows egress to your vLLM host*, or the sandbox will block your own candle. See §3 and §7. **[Med]**

---

## 2. Each component

### 2.1 vLLM
- **What it is:** Open-source, high-throughput LLM inference/serving engine. Exposes an **OpenAI-compatible** `/v1` endpoint. Core efficiency features: **PagedAttention** (KV-cache paging), **continuous / in-flight batching**, high concurrency, chunked prefill, FP8/NVFP4 quant support. **[High]**
- **Nemotron fit:** vLLM has shipped **day-0 support** for every Nemotron 3 tier. The Mamba-Transformer hybrid + MoE means "thinking tokens" generate up to ~6x faster than a comparable dense model, and vLLM's KV-cache management suits Nemotron's long context — explicitly pitched for "real-time agentic use-cases." **[High]**
- **Serve command (Nano, single-GPU friendly):**
  ```bash
  vllm serve nvidia/NVIDIA-Nemotron-Nano-3-30B-A3B-BF16 \
    --dtype auto --trust-remote-code \
    --served-model-name nemotron --host 0.0.0.0 --port 8000 \
    --enable-auto-tool-choice --tool-call-parser qwen3_coder \
    --reasoning-parser deepseek_r1
  ```
- **License:** Apache 2.0. **Links:** [docs.vllm.ai](https://docs.vllm.ai/en/latest/getting_started/quickstart/) · [vLLM Nemotron blog index](https://vllm.ai/blog/now_serving_nvidia_nemotron_with_vllm)

### 2.2 Nemotron (Nemotron 3 family)
NVIDIA open-weight models "built for agentic workloads." Hybrid **Mamba-Transformer MoE**, native **1M-token context**, **reasoning ON/OFF** with an inference-time "thinking budget" control, tool-use tuned. **License: NVIDIA Open Model License (commercial use allowed).** **[High]**

| Tier | Total / Active params | Rough serving hardware | Notes |
|---|---|---|---|
| **Nano** (Nemotron-3-Nano-30B-A3B) | ~31.6B total / ~3.2B active | **Single GPU** — BF16 ≈ needs ~1×H100 80GB; **NVFP4** fits smaller (RTX Pro 6000) | Best "small-model punch" story for the vLLM bounty; still a competent agentic reasoner |
| **Super** (Nemotron-3-Super-120B-A12B) | 120.6B total / 12.7B active | **4×H100** BF16, or **NVFP4** on fewer GPUs / DGX Spark cluster | The "clearly capable enough" candle; strong instruction-following + multi-step reasoning |
| **Ultra** (Nemotron-3-Ultra-550B-A55B) | 550B total / 55B active | Multi-node, out of solo-box scope | Overkill for Linnaeus |
| (legacy) Nemotron-Nano-9B-v2 | 9B dense-ish | Single GPU, trivial | Older; simplest to stand up |

- **Standard-candle recommendation for Linnaeus:** **Nemotron-3-Nano-30B-A3B in NVFP4 on a single GPU** is the sweet spot — capable enough that measured friction reflects the *codebase*, cheap enough to hammer repeatedly, and it directly gives you the vLLM bounty's coveted "small-model punch" narrative. If your Brev box is beefy (4×H100), pin **Super-120B** instead for a stronger candle and note the tier in your writeup. Either way, **pin the exact model tag + quant + seed/temperature** so measurements don't drift — that IS your "standard candle." **[Med]**
- Release timeline: Nano 2025-12-15, Super 2026-03-11, Ultra 2026-06-04.
- **Links:** [research.nvidia.com/labs/nemotron/Nemotron-3](https://research.nvidia.com/labs/nemotron/Nemotron-3/) · [HF Nemotron org](https://huggingface.co/nvidia) · [NVIDIA-NeMo/Nemotron cookbooks](https://github.com/NVIDIA-NeMo/Nemotron)

### 2.3 NemoClaw
- **What it is:** Apache-2.0 **reference stack / orchestration CLI** that installs and supervises an always-on agent (OpenClaw / Hermes / LangChain Deep Agents Code) *inside* an OpenShell sandbox, wiring up **routed inference, network policy, and lifecycle management**. It is the "one CLI to glue it together" layer — it does **not** itself serve models; it *routes* to a provider you choose. **[High]**
- **Inference providers it supports** (the crux of your integration question) — from the "Runtime and Provider Selection" onboarding: **Existing vLLM, Managed vLLM, Local Ollama, NVIDIA Endpoints (NIM/API catalog), OpenRouter, OpenAI, Anthropic, Google Gemini, Model Router, "Other OpenAI-compatible endpoint," "Other Anthropic-compatible endpoint," Hermes Provider.** For a custom endpoint you set `NEMOCLAW_PROVIDER=custom` + endpoint URL + model name + `COMPATIBLE_API_KEY`. **=> NemoClaw does NOT force NIM. Your raw vLLM setup is a supported, named option.** **[High]**
- **Harnesses:** OpenClaw (default), Hermes (`NEMOCLAW_AGENT=hermes` / `nemohermes`), LangChain Deep Agents Code. **[High]**
- **License:** Apache 2.0. **Links:** [github.com/NVIDIA/NemoClaw](https://github.com/NVIDIA/NemoClaw) · [docs.nvidia.com/nemoclaw](https://docs.nvidia.com/nemoclaw/latest/) · [NVIDIA blog: secure always-on local agent](https://developer.nvidia.com/blog/build-a-secure-always-on-local-ai-agent-with-nvidia-nemoclaw-and-openclaw/)

### 2.4 OpenShell
- **What it is:** The **sandbox runtime** — "safe, private runtime for autonomous AI agents." Runs a K3s cluster inside a single Docker container; enforces **declarative YAML policies** across four domains: **filesystem, network, process, inference**. Kernel-level mechanisms: **seccomp** (syscall filtering — blocks ptrace/mount/raw sockets), **Landlock LSM** (filesystem restriction), **network namespaces** (traffic isolation). **[High]**
- **Static vs dynamic:** `filesystem`, `landlock`, `process` are **locked at sandbox creation**; `network_policies` / `network_middlewares` (and inference routing) are **hot-reloadable** via `openshell policy set/update`. **[High]**
- **Privacy Router:** strips caller credentials, injects backend credentials, forwards to the managed model — "keeps sensitive context on sandbox compute." This is the inference-routing enforcement point; it's why your policy must explicitly permit your vLLM host. **[Med]**
- **Built-in agent clients:** Claude Code, OpenCode, Codex, GitHub Copilot CLI (plus OpenClaw/Hermes via NemoClaw). **[High]**
- **License:** open source (Apache-2.0 family; repo confirms OSS). **Links:** [github.com/NVIDIA/OpenShell](https://github.com/NVIDIA/OpenShell) · [docs.nvidia.com/openshell](https://docs.nvidia.com/openshell/about/overview) · community policies repo referenced as `nvidia/openshell-community` (`dev-sandbox-policy.yaml`)

### 2.5 NIM (NVIDIA Inference Microservices)
Prebuilt, containerized, GPU-optimized inference microservices exposing OpenAI-compatible endpoints — NVIDIA's "batteries-included" alternative to hand-rolling vLLM. Nemotron ships as NIM containers. **For the hackathon it is an *alternative* inference path, not required** — and using NIM instead of raw vLLM would *forfeit* the vLLM bounty's judging criteria (they want to see *you* stand up and tune vLLM). So: **skip NIM for the vLLM bounty; use raw `vllm serve`.** (NIM under the hood often *is* TensorRT-LLM or vLLM, but it's opaque/managed.) **[Med]**

### 2.6 Brev
NVIDIA's GPU-cloud platform (acquired from brev.dev). Gives one-click access to GPU instances across clouds with auto environment setup. **Launchables** = preconfigured one-click GPU+container+repo environments. **The bounty prize ("$100 Brev credits/member") is GPU compute credit** — spend it to rent the single GPU box that runs your whole stack. Note: credits exhausting can stop/delete instances, so checkpoint work. **[High]** **Links:** [developer.nvidia.com/brev](https://developer.nvidia.com/brev) · [docs.nvidia.com/brev](https://docs.nvidia.com/brev/getting-started/overview)

---

## 3. How they compose (recommended Linnaeus architecture)

```
                          ONE GPU BOX (Brev instance)
 ┌───────────────────────────────────────────────────────────────────────┐
 │                                                                         │
 │   HOST (or a dedicated inference sandbox)                               │
 │   ┌─────────────────────────────────────────────┐                      │
 │   │  vLLM  →  Nemotron-3-Nano-30B-A3B (NVFP4)    │  ← STANDARD CANDLE   │
 │   │  OpenAI-compatible  http://<host>:8000/v1    │    (pinned model,    │
 │   │  continuous batching · PagedAttention · FP8  │     temp, seed)      │
 │   └───────────────▲─────────────────────────────┘                      │
 │                   │ routed inference (egress ALLOWED by policy)         │
 │   ┌───────────────┴─────────────────────────────┐                      │
 │   │  OpenShell sandbox  (K3s-in-Docker)          │                      │
 │   │  policy.yaml: filesystem/network/process/inf │                      │
 │   │  ┌────────────────────────────────────────┐  │                      │
 │   │  │ OpenClaw agent (heartbeat gateway)      │  │                      │
 │   │  │  = your Linnaeus probe-agents           │  │                      │
 │   │  │  Juniper event-driven dispatch drives   │  │                      │
 │   │  │  repeated probe → friction-log inference │ │                      │
 │   │  └────────────────────────────────────────┘  │                      │
 │   └───────────────────────────────────────────────┘                     │
 │           ▲ installed & supervised by                                   │
 │   ┌───────┴──────────────┐                                              │
 │   │  NemoClaw CLI         │  provider = "Existing vLLM" → :8000/v1       │
 │   └──────────────────────┘                                              │
 └───────────────────────────────────────────────────────────────────────┘
```

**Flow:** NemoClaw installs OpenClaw into an OpenShell sandbox and points its inference provider at your existing vLLM Nemotron endpoint. Your Juniper dispatch fires probe cycles (OpenClaw heartbeat is a natural driver for the "repeated-inference workload" the vLLM bounty wants). Probes attempt real tasks inside the sandbox; the OpenShell policy is what makes "they tried to push to main / read a secret and were blocked" a *measurable, governed* friction event rather than a dangerous one. The delta is measured by **re-auditing across a real org change** (the caught regression); emitted recommendations / an optional pure-code `Fix` write to an allowed branch path.

**Where inference is served:** on the host (or a GPU-enabled inference sandbox) — NOT re-served per agent. Everything shares the one pinned candle. **Where the sandbox sits:** wraps the *agent*, not the model server; the model is an allowed network egress target.

---

## 4. Minimal-viable-qualification matrix

| Bounty | Smallest legit qualifying thing | Overlap |
|---|---|---|
| **vLLM ($500)** | Stand up `vllm serve <Nemotron tier>` as an OpenAI endpoint and show it is *genuinely in the loop* under your repeated probe/heartbeat workload — i.e., Linnaeus actually calls it, and you can point to continuous/in-flight batching + concurrent probe requests + a "small-model punch" tier (Nano). Show a throughput/concurrency observation. | **Shared endpoint** with Nemotron bounty |
| **Nemotron ($100/member)** | The model you serve on that endpoint is a Nemotron 3 tier, used for real agentic reasoning (tool use / reasoning-on). Basically free once vLLM is up. | **Same endpoint**; ~0 extra work |
| **NemoClaw + OpenShell ($100/member)** | (a) Install your agent via **NemoClaw** with any supported harness, routed to Nemotron/open model (select **"Existing vLLM"** → your endpoint), AND (b) author a **real OpenShell `policy.yaml`** that **survives adversarial testing** (blocks push-to-main / secret access / exfil while allowing doc-writes to a branch). | Reuses the **same endpoint**; adds NemoClaw install + policy authoring only |

**Net independent work beyond "one endpoint":** (1) run the NemoClaw installer and pick your provider (~minutes), (2) write + adversarially harden the OpenShell policy (the real effort — this is also the most *demoable* and judge-friendly part, and it's literally Linnaeus's thesis about governed friction).

---

## 5. Hardware / cost reality

- **Single box: yes.** The whole stack (vLLM + NemoClaw + OpenShell sandbox + OpenClaw) is designed to run on one machine; NVIDIA's own "always-on local agent" blog runs it on a single GPU host, and the "remote GPU deployment" use case is literally "one sandboxed agent on one cloud GPU." **[High]**
- **VRAM by candle tier:**
  - **Nano-30B-A3B:** single GPU. BF16 wants ~1×H100 80GB (30B weights ≈ ~60GB + KV cache); **NVFP4 quant** drops it enough for an RTX Pro 6000 / smaller — **recommended for a solo Brev box.** **[Med]**
  - **Super-120B-A12B:** ~**4×H100** in BF16, or **NVFP4** on fewer GPUs / a DGX Spark cluster (the corti.com walkthrough runs Super-120B-NVFP4 on a 2-node DGX Spark cluster with `tp2`). Use only if Brev grants a big box. **[Med]**
  - Legacy **Nano-9B-v2:** trivially single-GPU; good fallback if you hit VRAM trouble.
- **Brev's role:** the prize credits pay for exactly this GPU instance. Use a **Launchable** (preconfigured CUDA + vLLM image) to skip environment setup. Budget: a single H100-class instance for the event weekend; checkpoint artifacts because running out of credits can delete non-stoppable instances. **[High]**
- **TensorRT-LLM vs vLLM:** TensorRT-LLM can be faster on NVIDIA hardware but is heavier to configure; **for this hackathon use vLLM** — it's the bounty target, OpenAI-compatible out of the box, and has day-0 Nemotron support. NVFP4 gives you Blackwell-class throughput wins if you land on a B200. **[Med]**

---

## 6. Concrete quickstart (commands + URLs)

**A. Serve the standard candle (vLLM + Nemotron):**
```bash
# on the GPU box / Brev instance
pip install vllm           # or use a Brev vLLM Launchable
vllm serve nvidia/NVIDIA-Nemotron-Nano-3-30B-A3B-NVFP4 \
  --served-model-name nemotron --host 0.0.0.0 --port 8000 \
  --trust-remote-code --enable-auto-tool-choice \
  --tool-call-parser qwen3_coder --reasoning-parser nemotron_v3
# (for Nano use --reasoning-parser deepseek_r1; for Super use nemotron_v3)
# verify:
curl http://localhost:8000/v1/models
```
Nemotron-on-vLLM gotchas (from the corti.com field notes): `baseURL` must end at `/v1`; `served-model-name` must match your client config exactly; if you see reasoning text leaking into tool arguments, confirm the `--reasoning-parser` is active; if `finish_reason:"length"` with no tool call, raise `max_tokens` to 2048–4096 (reasoning tokens eat the budget); don't double-quantize an already-FP8/NVFP4 checkpoint.

**B. Install the agent via NemoClaw, routed to YOUR vLLM:**
```bash
curl -fsSL https://www.nvidia.com/nemoclaw.sh | bash    # interactive installer
# During onboarding, choose provider: "Existing vLLM"
#   endpoint: http://<host>:8000/v1   model: nemotron   key: (any / EMPTY)
# or non-interactively:
export NEMOCLAW_PROVIDER=custom
export NEMOCLAW_ENDPOINT=http://<host>:8000/v1
export NEMOCLAW_MODEL=nemotron
export COMPATIBLE_API_KEY=EMPTY
nemoclaw onboard
nemoclaw my-assistant connect
openclaw agent --agent main --local -m "hello" --session-id test
openclaw tui
```

**C. OpenShell sandbox + policy:**
```bash
curl -LsSf https://raw.githubusercontent.com/NVIDIA/OpenShell/main/install.sh | sh
# or: uv tool install -U openshell
openshell sandbox create -- claude            # or opencode/codex/copilot/openclaw
openshell policy set demo --policy ./linnaeus-policy.yaml --wait
openshell policy get demo --full
openshell sandbox connect demo
openshell term                                # live monitoring dashboard
```

**D. Starter OpenShell policy for Linnaeus** (based on the confirmed quickstart schema; extend the network rules for adversarial hardening):
```yaml
filesystem_policy:
  read_only:  [/usr, /lib, /proc, /dev/urandom, /app, /etc, /var/log]
  read_write: [/sandbox, /tmp, /dev/null]      # repo checkout + doc-write branch live under /sandbox
  include_workdir: true
landlock:
  compat_mode: best_effort
process:
  user: sandbox
  group: sandbox
network_policies:
  vllm_candle:                                  # ALLOW your standard-candle endpoint
    binaries: [{ path: /usr/local/bin/openclaw }]
    allow:
      - { host: <host>, port: 8000, methods: [POST], paths: ["/v1/*"] }
  github_readonly:                              # allow reads, DENY mutations (blocks push-to-main)
    binaries: [{ path: /usr/bin/curl }, { path: /usr/bin/git }]
    allow:
      - { host: api.github.com, port: 443, methods: [GET] }
    deny_rules:
      - { operation_type: mutation, fields: [deleteRepository, deleteRef, createCommitOnBranch] }
  # everything else = default deny (no arbitrary egress => blocks exfiltration)
```
Notes: **push-to-main / destructive git** is blocked at the *network* layer (deny POST/mutation to the git host) rather than a git-specific feature; **secrets** never touch the sandbox filesystem (OpenShell injects creds as runtime env, and `/etc` etc. are read-only); **exfiltration** is blocked by default-deny egress — the only allowed outbound hosts are your vLLM candle and read-only GitHub. To allow doc-writes to a branch, permit the specific push path/branch while denying `main`. **"Surviving adversarial testing"** here means: an agent prompted to `git push origin main`, `curl` a secret to an external host, or `cat ~/.aws/credentials` is *provably blocked by policy* and you can show the `policy_denied` responses.

**Key doc/repo URLs to bookmark:**
- vLLM quickstart: https://docs.vllm.ai/en/latest/getting_started/quickstart/
- vLLM×Nemotron blogs: https://vllm.ai/blog/2026-03-11-nemotron-3-super · https://vllm.ai/blog/2025-12-15-run-nvidia-nemotron-3-nano · https://vllm.ai/blog/2026-06-04-nemotron-3-ultra-vllm
- Nemotron cookbooks (vLLM notebooks): https://github.com/NVIDIA-NeMo/Nemotron
- NemoClaw: https://github.com/NVIDIA/NemoClaw · https://docs.nvidia.com/nemoclaw/latest/
- NemoClaw+OpenClaw blog: https://developer.nvidia.com/blog/build-a-secure-always-on-local-ai-agent-with-nvidia-nemoclaw-and-openclaw/
- OpenShell: https://github.com/NVIDIA/OpenShell · https://docs.nvidia.com/openshell/about/overview · policy source in `nvidia/openshell-community` (`dev-sandbox-policy.yaml`)
- Brev: https://developer.nvidia.com/brev · https://docs.nvidia.com/brev/getting-started/overview
- Self-hosted Nemotron+vLLM field notes: https://corti.com/connecting-opencode-to-a-self-hosted-llm-vllm-nemotron-3-super/
- OpenShell hands-on tutorial: https://blog.archit0.com/2026/05/06/openshell-tutorial/

---

## 7. Open questions / risks / things I could not fully confirm

1. **OpenShell inference routing to an arbitrary base_url — [Med, not fully confirmed].** OpenShell's `inference` policy section and "Privacy Router" clearly *route* model calls, but the public docs I could reach say inference is "Configure separately" and don't show an explicit `base_url: http://myhost:8000/v1` field verbatim. **However**, NemoClaw (which sits above OpenShell) *does* explicitly list "Existing vLLM" and "Other OpenAI-compatible endpoint," and OpenShell's `network_policies` can allow egress to any host:port. So the integrated path works, but you may configure the endpoint at the **NemoClaw** layer + open the egress at the **OpenShell network** layer, rather than via a dedicated OpenShell `inference.base_url` field. **Validate this on Day 1** by pointing NemoClaw at your vLLM and confirming the sandbox can reach `:8000/v1`. This is the single biggest integration risk.

2. **Escalation / human-in-the-loop / conditional policies — [Low/undocumented].** The alpha docs show allow/deny rule blocks, method/path filtering, and GraphQL mutation denies, but **do NOT** document allow-with-escalation, time/context-conditional permissions, or HITL approval flows. If your Linnaeus demo wants a "probe hits a wall → human approves" beat, treat that as *your* app-layer logic (via Juniper dispatch), not a native OpenShell feature you can rely on. Confirm against the live `openshell-community` repo.

3. **Full `policy.yaml` schema — [Med].** I confirmed the *shape* (`filesystem_policy.read_only/read_write/include_workdir`, `network_policies.<name>.binaries/allow/deny_rules`, `landlock.compat_mode`, `process.user/group`) from the quickstart example and the tutorial, but not an exhaustive field reference. Pull the canonical `dev-sandbox-policy.yaml` from `github.com/nvidia/openshell-community` before finalizing (the doc points there; I got a 404 on a guessed path).

4. **NemoClaw installer URL — [Med].** The `curl … nvidia.com/nemoclaw.sh | bash` form appears in a secondary source; the GitHub README emphasizes an *interactive installer* and a coding-agent starter prompt. Prefer the official installer per the repo README at event time; the env-var/custom-provider mapping (`NEMOCLAW_PROVIDER=custom`) is documented but exact var names could shift in alpha.

5. **VRAM figures are estimates — [Med].** NVIDIA blogs list *supported GPUs* (RTX Pro 6000, DGX Spark, H100, B200) but are cagey on exact minimum VRAM. Nano-on-single-GPU is safe; Super needs ~4×H100 BF16 (or NVFP4 on fewer). Right-size to whatever Brev grants you and pick the tier accordingly.

6. **"Genuinely in the loop" for the vLLM bounty — [design note].** Judges reward real integration + efficiency, not a token call. Make sure Linnaeus's probe cycles actually drive *concurrent* requests through vLLM (multiple probe-agents in flight) so continuous/in-flight batching visibly kicks in, and capture a throughput/concurrency number. The OpenClaw heartbeat is your built-in "repeated-inference workload" — lean into that framing.

7. **These are alpha projects.** NemoClaw and OpenShell were announced ~4 months before your event and are explicitly alpha with best-effort support. Expect rough edges, breaking changes, and thin docs. De-risk by getting the *vLLM+Nemotron* endpoint (the $500 piece) working first and standalone — it has no alpha dependency — then layer NemoClaw/OpenShell on top for the second bounty.
