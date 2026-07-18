# NemoClaw + OpenShell Integration Recipe (2026 Alpha)

Research date: 2026-07-17. All projects are alpha; APIs are moving. Confidence tags:
**[High]** = confirmed from a primary NVIDIA repo/docs page or a canonical policy file I fetched verbatim.
**[Med]** = single source or reasonable inference across sources.
**[Low]** = guess / not directly stated.

Primary sources fetched for this report:
- NemoClaw repo: https://github.com/NVIDIA/NemoClaw
- OpenShell repo: https://github.com/NVIDIA/openshell
- Community sandbox policies (canonical examples): https://github.com/nvidia/openshell-community
  - `sandboxes/base/policy.yaml` (raw): https://raw.githubusercontent.com/NVIDIA/openshell-community/main/sandboxes/base/policy.yaml
  - `sandboxes/ollama/policy.yaml` (raw): https://raw.githubusercontent.com/NVIDIA/openshell-community/main/sandboxes/ollama/policy.yaml
- NVIDIA dev blog: https://developer.nvidia.com/blog/build-a-secure-always-on-local-ai-agent-with-nvidia-nemoclaw-and-openclaw/
- OpenShell inference routing: https://docs.nvidia.com/openshell/sandboxes/inference-routing
- NemoClaw "choose an inference provider": https://docs.nvidia.com/nemoclaw/latest/user-guide/openclaw/inference/learn-and-choose/choose-inference-provider
- OpenShell security best practices: https://docs.nvidia.com/openshell/security/best-practices
- OpenShell issue #879 (LAN-host routing gotcha): https://github.com/NVIDIA/OpenShell/issues/879
- OpenShell tutorial (Archit Dwivedi): https://blog.archit0.com/2026/05/06/openshell-tutorial/

---

## 1. TL;DR — the concrete Q1 wiring answer

**The single most important thing to internalize: the sandboxed agent does NOT get your vLLM base_url. It always calls `https://inference.local`. OpenShell's Privacy Router (an egress proxy on the host side of the sandbox veth) rewrites that to your real backend base_url and injects credentials host-side.** So endpoint/base_url config lives at the **OpenShell provider / inference-routing layer**, not in the agent and not (really) in `network_policies`. NemoClaw is a wizard on top that runs those OpenShell commands for you. **[High]**

Concretely, to route the sandboxed agent to your self-hosted vLLM at `http://<host>:8000/v1`:

1. **Serve vLLM on a host-visible address**, not `localhost`. From inside the sandbox/gateway, your workstation is `host.openshell.internal` (or the host LAN IP). `localhost`/`127.0.0.1` resolve *inside the gateway*, not on your box. **[High]**

2. **Create an OpenShell provider that points at your vLLM base_url** (this is where the base_url actually lives):
   ```bash
   openshell provider create \
     --name my-vllm \
     --type openai \
     --credential OPENAI_API_KEY=dummy \
     --config OPENAI_BASE_URL=http://host.openshell.internal:8000/v1
   ```
   `--config OPENAI_BASE_URL=...` is the verbatim field that sets the upstream endpoint. vLLM usually needs no real key, so any non-empty placeholder works. **[High]**

3. **Bind that provider to the sandbox's inference route:**
   ```bash
   openshell inference set --provider my-vllm --model nvidia/nemotron-3-super-... [--timeout 300]
   ```
   **[High]**

4. **The agent is left calling `https://inference.local`.** The router matches CONNECTs to `inference.local`, strips any sandbox-supplied `model`/`api_key`, injects the real backend credential, rewrites the model, and forwards to your `OPENAI_BASE_URL`. **[High]**

5. **Do NOT add your inference host to `network_policies` for the purpose of model calls.** Best-practices doc, verbatim: *"Do not add inference provider hosts to `network_policies`. Use OpenShell inference routing instead."* Adding it there hands the agent a direct path that bypasses credential isolation. **[High]**

6. **Egress from the router to your vLLM does not need a sandbox `network_policy`.** The router/gateway runs on the host side of the veth (proxy listens at `10.200.0.1:3128`), outside the sandbox's network namespace, so its outbound connection to `host.openshell.internal:8000` is not filtered by `network_policies` (those only govern processes *inside* the sandbox netns). **[Med — inferred from the namespace/proxy architecture; validate hands-on]**

**If you use NemoClaw's wizard instead of raw OpenShell commands:** pick **"Existing vLLM"** (`NEMOCLAW_PROVIDER=vllm`, auto-detected on `:8000`) or **"Other OpenAI-compatible endpoint"** (`NEMOCLAW_PROVIDER=custom` + endpoint + model + `COMPATIBLE_API_KEY`). NemoClaw then runs the `openshell provider create` / `openshell inference set` under the hood. **[High for provider names; Med for exact env-var wiring]**

**#1 residual risk to validate on Day 1:** the LAN-hostname routing bug (issue #879). If you point at a LAN box by hostname, the router does its own DNS (ignores sandbox `/etc/hosts`/`hostAliases`) and can return **403 by hostname but 200 by IP**. **Use the raw IP** in `OPENAI_BASE_URL` if `host.openshell.internal` or a `.local` name fails. **[High]**

---

## 2. NemoClaw provider config — confirmed vars/flags

Provider selection is driven by `NEMOCLAW_PROVIDER` plus per-provider credential vars. Confirmed values from the "choose an inference provider" doc and DeepWiki: **[High for the value set; Med for exact endpoint/model var spelling]**

| Use case | `NEMOCLAW_PROVIDER` | Extra config |
|---|---|---|
| Existing/self-hosted vLLM (auto-detected on `:8000`) | `vllm` | endpoint auto-detected as `http://127.0.0.1:8000/v1` → remapped host-side to `host.openshell.internal:8000` |
| Managed vLLM (NemoClaw installs & serves it) | `install-vllm` | model selection during wizard |
| Any OpenAI-compatible endpoint (OpenRouter, LocalAI, TensorRT-LLM, llama.cpp, your gateway) | `custom` | `NEMOCLAW_ENDPOINT`, `NEMOCLAW_MODEL`, `COMPATIBLE_API_KEY` |
| Any Anthropic-compatible endpoint | `anthropicCompatible` | endpoint, model, `COMPATIBLE_ANTHROPIC_API_KEY` |
| Local Ollama | `ollama` (wizard option 7) | model e.g. `nemotron-3-super:120b` |
| NVIDIA hosted | (NVIDIA endpoints) | `NVIDIA_INFERENCE_API_KEY` |

Other confirmed env facts:
- `COMPATIBLE_API_KEY` — key for the OpenAI-compatible ("custom") path. Doc verbatim: *"Set it to whatever credential your endpoint expects, or any non-empty placeholder if your endpoint does not require auth."* **[High]**
- `COMPATIBLE_ANTHROPIC_API_KEY` — key for the Anthropic-compatible path. **[High]**
- `NEMOCLAW_AGENT=hermes` (or the `nemohermes` alias) selects which agent gets installed. **[High]**
- `NEMOCLAW_EXPERIMENTAL=1` needed to expose Local NVIDIA NIM as an option. **[High]**
- The "custom" path requires an endpoint implementing `/v1/chat/completions` (optionally `/v1/responses`). vLLM, TensorRT-LLM, llama.cpp, LocalAI, OpenRouter all qualify. **[High]**

**Not cleanly verifiable verbatim:** the exact spelling `NEMOCLAW_ENDPOINT` vs `NEMOCLAW_BASE_URL` and `NEMOCLAW_MODEL` — search results assert `NEMOCLAW_ENDPOINT`/`NEMOCLAW_MODEL`, but I could not load a canonical doc page that prints the full `export ...` block (several docs.nvidia.com deep-links 404'd against the fetcher). **Treat the endpoint/model var names as [Med] and confirm in the running wizard's "review your config" screen, or in `src/lib/onboard/machine/handlers/provider-inference.ts` in the repo.** **[Med]**

**Architectural note that resolves the ambiguity in the brief:** endpoint config is effectively done at the **OpenShell** layer (`OPENAI_BASE_URL` on the provider). The `NEMOCLAW_*` vars are wizard inputs that get *translated into* `openshell provider create` / `openshell inference set`. There is no separate agent-visible `base_url` — the agent only ever sees `https://inference.local`. **[High]**

---

## 3. OpenShell network / inference policy — confirmed schema

The real policy file uses these **top-level keys** (from the canonical `sandboxes/base/policy.yaml`): **[High]**

- `version: 1`
- `filesystem_policy:` — `include_workdir`, `read_only: [...]`, `read_write: [...]`. **Locked at sandbox creation** (Landlock). **[High]**
- `landlock:` — `compatibility: best_effort | hard_requirement`. **[High]**
- `process:` — `run_as_user`, `run_as_group`. Locked at creation; backed by seccomp. **[High]**
- `network_policies:` — a **map of named policies**, each with `endpoints: [...]` and `binaries: [...]`. Hot-reloadable at runtime. **[High]**

Note the naming reality: it is **`filesystem_policy`** and **`network_policies`** (not `filesystem:`/`network:`). Some NVIDIA marketing/blog copy says "filesystem / network / process / inference domains" but the *file* uses the `_policy`/`_policies` suffixes above. **[High]**

**There is NO `inference:` block in the canonical policy files.** Inference routing is configured out-of-band via `openshell provider create` + `openshell inference set`, not in `policy.yaml`. Best-practices doc explicitly says to keep inference hosts *out* of `network_policies`. So: **OpenShell governs (a) filesystem, (b) process, (c) network egress from sandbox processes in the YAML; inference endpoint/base_url is a separate provider/router object.** **[High]**

### `network_policies` endpoint schema (from the real files)

Each named policy:
```yaml
<policy_name>:
  name: <string>
  endpoints:
    - host: <fqdn or "*.example.com">     # host matching is EXACT equality; wildcards only as literal "*.x"
      port: <int>
      protocol: rest | websocket | graphql # optional; enables L7 inspection
      tls: terminate | skip                # terminate = router does MITM w/ ephemeral CA (needed for cred rewrite + L7)
      enforcement: enforce | audit         # audit = log only; enforce = block
      access: read-only | read-write | full
      rules:                               # optional L7 allow-list
        - allow:
            method: GET | POST | HEAD | OPTIONS | ...
            path: "/**/info/refs*"         # glob: * = one segment, ** = recursive; query string included
  binaries:
    - { path: /usr/bin/git }               # binary identity = /proc inode + exe + SHA256 TOFU; globs allowed
```
**[High]** — every field above appears verbatim in `sandboxes/base/policy.yaml`.

Key enforcement facts embedded in the file's own comments/behavior: **[High]**
- Binary identity resolved via `/proc/net/tcp` inode + `/proc/{pid}/exe`; ancestor PPid walk + cmdline also matched; **SHA256 integrity enforced (trust-on-first-use)**.
- **Host matching is exact equality, not glob** (comment in the vscode/cursor blocks: *"OPA host matching uses exact equality, not glob — list hosts explicitly."*).
- If no `network_policies` entry matches (host, port, calling binary) → **default deny**.

---

## 4. The canonical example policy (quoted, with source)

Source: `https://raw.githubusercontent.com/NVIDIA/openshell-community/main/sandboxes/base/policy.yaml` (Apache-2.0). Fetched verbatim 2026-07-17. Two especially instructive blocks — a **read-only GitHub REST** policy and a **read-only git-over-HTTPS** policy (blocks push by simply not allowing `git-receive-pack`):

```yaml
# SPDX-License-Identifier: Apache-2.0
version: 1

filesystem_policy:
  include_workdir: true
  read_only:  [/usr, /lib, /proc, /dev/urandom, /app, /etc, /var/log]
  read_write: [/sandbox, /tmp, /dev/null]

landlock:
  compatibility: best_effort

process:
  run_as_user: sandbox
  run_as_group: sandbox

network_policies:
  github_ssh_over_https:
    name: github-ssh-over-https
    endpoints:
      - host: github.com
        port: 443
        protocol: rest
        tls: terminate
        enforcement: enforce
        rules:
          # Git Smart HTTP read-only: allow clone, fetch, pull
          - allow: { method: GET,  path: "/**/info/refs*" }        # discovery
          - allow: { method: POST, path: "/**/git-upload-pack" }   # reads
          # Data transfer for writes (COMMENTED OUT -> push is blocked):
          # - allow: { method: POST, path: "/**/git-receive-pack" }
    binaries:
      - { path: /usr/bin/git }

  github_rest_api:
    name: github-rest-api
    endpoints:
      - host: api.github.com
        port: 443
        protocol: rest
        tls: terminate
        enforcement: enforce
        access: read-only
    binaries:
      - { path: /usr/local/bin/claude }
      - { path: /usr/bin/gh }
```

The `sandboxes/ollama/policy.yaml` variant shows the same `github_rest_api` idea but expressed as explicit L7 method rules (GET/HEAD/OPTIONS on `/**/`) instead of `access: read-only` — both patterns are valid. Source: `https://raw.githubusercontent.com/NVIDIA/openshell-community/main/sandboxes/ollama/policy.yaml`.

Note: the brief's expected filename `dev-sandbox-policy.yaml` does **not** exist. The canonical examples live at `sandboxes/<agent>/policy.yaml` (base, droid, gemini, ollama, pi). **[High]**

---

## 5. Adapted starter `policy.yaml` for your use case

Design decisions mapped to your requirements:
- (a) egress to your vLLM on `/v1/*` → **handled by inference routing, NOT here** (see §1). The agent calls `inference.local`; you configure the provider separately. I deliberately do **not** put the vLLM host in `network_policies`.
- (b) read-only GitHub API → `github_rest_api` with `access: read-only`.
- (c) block push-to-main / destructive git → `git` policy allows only `git-upload-pack` (fetch/clone); `git-receive-pack` (push) is omitted → denied by default.
- (d) default-deny arbitrary egress → intrinsic: anything not listed is denied.
- (e) secrets off the sandbox FS → no credential paths in `read_only`/`read_write`; keys are injected host-side by the router. `/etc` kept read-only.
- (f) write docs to a working-branch path → `read_write` limited to `/sandbox` (your worktree) + `/tmp`.

```yaml
# SPDX-License-Identifier: Apache-2.0
# Starter policy for a doc-writing agent on self-hosted vLLM (Nemotron) via OpenShell inference routing.
# NOTE: your vLLM endpoint is configured OUT-OF-BAND, not in this file:
#   openshell provider create --name my-vllm --type openai \
#     --credential OPENAI_API_KEY=dummy \
#     --config OPENAI_BASE_URL=http://host.openshell.internal:8000/v1
#   openshell inference set --provider my-vllm --model <nemotron-model>
# The agent calls https://inference.local; the Privacy Router forwards to your vLLM.
version: 1

filesystem_policy:
  include_workdir: true
  # Read-only system paths (prevents CA/DNS/SSH tampering). No secret dirs anywhere.
  read_only:  [/usr, /lib, /proc, /dev/urandom, /app, /etc, /var/log]
  # Agent may only write inside its worktree + scratch. Docs go to a branch under /sandbox.
  read_write: [/sandbox, /tmp, /dev/null]

landlock:
  compatibility: hard_requirement   # for a bounty: FAIL CLOSED if kernel lacks Landlock (see §6)

process:
  run_as_user: sandbox
  run_as_group: sandbox

network_policies:

  # (b) Read-only GitHub REST API — gh + agent may read repos/PRs, cannot mutate.
  github_rest_api:
    name: github-rest-api
    endpoints:
      - host: api.github.com
        port: 443
        protocol: rest
        tls: terminate
        enforcement: enforce
        access: read-only
    binaries:
      - { path: /usr/bin/gh }
      - { path: /usr/local/bin/claude }

  # (c) Git over HTTPS: clone/fetch/pull ONLY. Push (git-receive-pack) omitted => denied.
  #     This blocks push-to-main and every other destructive remote mutation at L7.
  github_git_readonly:
    name: github-git-readonly
    endpoints:
      - host: github.com
        port: 443
        protocol: rest
        tls: terminate
        enforcement: enforce
        rules:
          - allow: { method: GET,  path: "/**/info/refs*" }
          - allow: { method: POST, path: "/**/git-upload-pack" }
          # NO git-receive-pack rule => pushes blocked by default-deny.
    binaries:
      - { path: /usr/bin/git }

  # (d) Everything else is denied by default. Do NOT add your vLLM host here.
  #     Do NOT add api.openai.com/api.anthropic.com here — use inference routing.
```

Deploy:
```bash
openshell policy set docwriter --policy ./policy.yaml --wait
# start in audit first if you want to see what the agent actually tries:
#   set enforcement: audit on each endpoint, run, review `openshell logs --tail`, then flip to enforce.
```

---

## 6. Install / CLI commands — confirmed vs. corrected

| Command from your brief | Verdict | Confirmed current form |
|---|---|---|
| `curl -fsSL https://www.nvidia.com/nemoclaw.sh \| bash` | **Confirmed** (appears in the NVIDIA dev blog) | same. There is also a "coding-agent" install path (paste the NemoClaw starter prompt into Cursor/Claude Code). **[High]** |
| `uv tool install -U openshell` | **Confirmed** (OpenShell README, PyPI) | same. Alt: `curl -LsSf https://raw.githubusercontent.com/NVIDIA/OpenShell/main/install.sh \| sh`; Helm: `helm install openshell oci://ghcr.io/nvidia/openshell/helm-chart`. **[High]** |
| `openshell sandbox create -- <agent>` | **Confirmed** | same. Related: `openshell sandbox connect [name]`, `openshell sandbox list`, `openshell logs [name] --tail`. **[High]** |
| `openshell policy set` | **Confirmed, but needs args** | `openshell policy set <name> --policy <file.yaml> [--wait]`; read back with `openshell policy get <name>`. **[High]** |

Inference-routing commands (needed for Q1, not in your brief): **[High]**
```bash
openshell provider create --name <n> --type openai \
  --credential OPENAI_API_KEY=<key-or-dummy> \
  --config OPENAI_BASE_URL=<http://host.openshell.internal:8000/v1>
openshell inference set --provider <n> --model <model> [--timeout 300]
```
NemoClaw wizard equivalents also exist (e.g. `openclaw nemoclaw launch --profile vllm` was shown in one mirror doc — **[Med]**, treat as illustrative).

Env-var facts: `NEMOCLAW_AGENT=hermes`, `NEMOCLAW_PROVIDER=vllm|install-vllm|custom|anthropicCompatible`, `NEMOCLAW_EXPERIMENTAL=1`. **[High for names/values]**

---

## 7. Adversarial-hardening notes (for the bounty)

What makes a policy genuinely hard to break (all from OpenShell's security best-practices doc): **[High]**

1. **Kernel-level, non-bypassable base layer.** The sandbox runs in a dedicated netns with a veth pair; all traffic is forced through the host-side proxy at `10.200.0.1:3128`. Doc verbatim: *"Even if a process ignores proxy environment variables, it can only reach the proxy."* This is not a config knob — it's structural. Prompt-injecting the agent to "ignore the proxy" does nothing.

2. **Bind each endpoint to specific binaries + SHA256 TOFU.** Replacing a binary mid-session triggers a hash-mismatch deny. **Avoid `/**` binary globs** — doc: *"A glob like `/**` allows any binary to reach the endpoint, defeating binary-scoped enforcement."*

3. **L7 enforce, not L4.** Pair `protocol: rest` + `enforcement: enforce`. Without `protocol`, the proxy *"cannot see HTTP methods, paths, or GraphQL operations"* — an agent told to push could just POST to `git-receive-pack`. L7 is exactly what blocks push-to-main while allowing clone.

4. **Exact hostnames beat wildcards** (resists DNS-rebinding/SSRF). The proxy also blocks private IPs for undeclared/wildcard/hostless endpoints.

5. **Route inference; never allow the provider host directly.** Otherwise the agent can exfiltrate via, or steal the key from, the inference channel.

6. **`landlock: hard_requirement` for judged runs.** Default `best_effort` **silently continues with NO filesystem restriction** if the kernel lacks Landlock (pre-5.13 / Ubuntu 20.04). That is the single biggest "policy didn't fire" trap — an adversary on an old kernel gets full FS access while the YAML *looks* locked down.

Documented gotchas where policies DON'T fire (name these in your writeup to score points): **[High]**
- **`tls: skip`** disables credential rewriting *and* L7 inspection — plaintext creds pass unobserved. Keep `tls: terminate`.
- **`access: full`** with no `rules` permits every method/path once host/port/binary match. Use `read-only` or explicit `allow` rules.
- **`enforcement: audit`** only logs. Easy to ship a policy that *looks* strict but never blocks. Ship `enforce`.
- **SUID binaries in readable paths** can re-escalate despite seccomp priv-drop — keep system paths read-only.
- **Writable `/etc` or `/etc/ssl`** lets the agent swap CA bundles / DNS → MITM. Keep them read-only (the starter policy does).
- **Seccomp does NOT block `fork`/`clone`** (only `CLONE_NEWUSER`); no fork-rate-limit → local DoS still possible.
- **Keep-alive reuse**: a connection that carried a routed inference request is denied for subsequent non-inference requests — don't assume "one CONNECT = permanently trusted stream."

Enforcement stack (for your architecture slide): OPA policy engine at the CONNECT proxy (network), **Landlock LSM** (filesystem, 256-path limit, fail-closed only if `hard_requirement`), **seccomp-BPF** two-phase (blocks `ptrace`, `process_vm_readv/writev`, `memfd_create`, `io_uring_setup`, `pivot_root`, `userfaultfd`, `CLONE_NEWUSER`, mount/module syscalls), **netns isolation** (structural). **[High]**

---

## 8. Open / unverifiable-without-install items (validate Day 1)

1. **Exact NemoClaw endpoint/model env-var spelling.** `NEMOCLAW_ENDPOINT` / `NEMOCLAW_MODEL` are asserted by secondary sources; I could not load a first-party doc page that prints the full `export` block (several docs.nvidia.com deep links 404'd for the fetcher). **Confirm in the wizard's config-review screen or `src/lib/onboard/.../provider-inference.ts`.** **[Med]**
2. **Whether "Existing vLLM" auto-detect needs the endpoint var at all**, or purely probes `127.0.0.1:8000` then remaps to `host.openshell.internal`. Search says auto-detect; verify it survives when vLLM is on a *different host/port*. **[Med]**
3. **Egress from router→your vLLM is exempt from `network_policies`.** Strongly implied by the netns/proxy architecture (proxy is host-side), but not stated in one sentence I could quote. If model calls fail with a deny, that assumption is wrong — check `openshell logs`. **[Med]**
4. **LAN-host routing bug (#879).** If you use `host.openshell.internal` or a `.local` name and get 403, switch `OPENAI_BASE_URL` to the raw IP (`http://192.168.x.y:8000/v1`). Confirmed open bug; behavior may change. **[High that the bug exists; Med on whether it's patched by hackathon date]**
5. **`openclaw nemoclaw launch --profile vllm`** appeared in one mirror doc, not the canonical NVIDIA repo — treat as illustrative, confirm the real launch verb. **[Med]**
6. **Whether NemoClaw writes a `.env`/config file to disk** that could land a placeholder key on the sandbox FS. Verify no real secret is written under `/sandbox`. **[Low]**
7. **Docs-site instability:** many `docs.nvidia.com/nemoclaw|openshell` deep links returned 404 to the fetcher (JS-rendered site / shifting paths). The `.md` mirror paths (e.g. `.../reference/policy-schema.md`) and the community repo raw files were the reliable primary sources — prefer those.
