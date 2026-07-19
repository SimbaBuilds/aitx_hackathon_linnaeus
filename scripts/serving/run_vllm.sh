#!/bin/bash
# Linnaeus standard candle — Nemotron-3-Nano-30B-A3B FP8 on vLLM (H100).
# Run ON the Brev box (user shadeform) from a terminal:  bash run_vllm.sh
# Logs to /home/shadeform/vllm.log ; serves OpenAI-compatible API on :8000.
#
# ⚠️ LESSON (2026-07-19): the Brev launchable's .venv has a python3 but NO pip.
# The old script `source`d that venv, so `pip install` fell through to the SYSTEM
# pip (installing vLLM into ~/.local for /usr/bin/python3), while the server was
# launched with the venv python — which then couldn't `import vllm`. Result: the
# server died instantly and the endpoint 502'd with no obvious error.
# Fix: pick ONE interpreter that can import vllm (installing with ITS OWN pip if
# needed), VERIFY the import, and launch the server with that SAME interpreter.

set -uo pipefail
cd /home/shadeform
echo "=== $(date) starting ==="

# ── Choose the Python that runs the server ──────────────────────────────────
# Prefer whichever interpreter can already import vllm; else the system python3
# (its `python3 -m pip` targets ~/.local, which works). We deliberately do NOT
# `source` the launchable venv — it has no pip and can't see the installed vllm.
PY=""
for cand in /usr/bin/python3 "$(command -v python3)" /home/shadeform/.venv/bin/python3; do
  [ -x "$cand" ] || continue
  if "$cand" -c "import vllm" 2>/dev/null; then PY="$cand"; break; fi
done
# Nothing has vllm yet → install with the system python3 (has a working pip).
if [ -z "$PY" ]; then
  PY=/usr/bin/python3
  echo "installing vllm into $PY ..."
  "$PY" -m pip install -q vllm torch nvidia-cutlass-dsl flashinfer-cubin==0.5.3 flashinfer-python==0.5.3
fi

# ── Verify the import BEFORE launching (fail loud, not into a 502) ───────────
if ! "$PY" -c "import vllm; print('vllm', vllm.__version__, 'via', __import__('sys').executable)"; then
  echo "✗ FATAL: $PY cannot import vllm after install. Aborting — the server would only 502." >&2
  exit 1
fi

# ── Reasoning-parser plugin (clone small files only; vLLM downloads weights) ──
export GIT_LFS_SKIP_SMUDGE=1
[ -d NVIDIA-Nemotron-3-Nano-30B-A3B-FP8 ] || git clone -q https://huggingface.co/nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B-FP8
PLUGIN=NVIDIA-Nemotron-3-Nano-30B-A3B-FP8/nano_v3_reasoning_parser.py
if [ ! -f "$PLUGIN" ]; then
  [ -d NVIDIA-Nemotron-3-Nano-30B-A3B-BF16 ] || git clone -q https://huggingface.co/nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B-BF16
  PLUGIN=NVIDIA-Nemotron-3-Nano-30B-A3B-BF16/nano_v3_reasoning_parser.py
fi
echo "plugin=$PLUGIN  python=$PY"

# ── Serve (launch with the SAME interpreter we verified above) ───────────────
pkill -f vllm.entrypoints 2>/dev/null   # clear any dead/stale server first
nohup "$PY" -m vllm.entrypoints.openai.api_server \
  --model nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B-FP8 \
  --dtype auto --trust-remote-code --served-model-name nemotron \
  --max-num-seqs 8 --max-model-len 65536 --kv-cache-dtype fp8 \
  --host 0.0.0.0 --port 8000 \
  --enable-auto-tool-choice --tool-call-parser qwen3_coder \
  --reasoning-parser-plugin "$PLUGIN" --reasoning-parser nano_v3 \
  >> /home/shadeform/vllm.log 2>&1 &
echo "launch pid $!  — model load takes ~10-20 min; watch: tail -f /home/shadeform/vllm.log"
