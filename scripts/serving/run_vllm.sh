#!/bin/bash
# Linnaeus standard candle — Nemotron-3-Nano-30B-A3B FP8 on vLLM (H100).
# Run ON the Brev box (user shadeform) from a terminal:  bash run_vllm.sh
# Logs to /home/shadeform/vllm.log ; serves OpenAI-compatible API on :8000.
source /home/shadeform/.venv/bin/activate
cd /home/shadeform
echo "=== $(date) starting ==="
python3 -c "import vllm" 2>/dev/null || { echo "installing vllm..."; pip install -q vllm torch nvidia-cutlass-dsl flashinfer-cubin==0.5.3 flashinfer-python==0.5.3; }
export GIT_LFS_SKIP_SMUDGE=1
[ -d NVIDIA-Nemotron-3-Nano-30B-A3B-FP8 ] || git clone -q https://huggingface.co/nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B-FP8
PLUGIN=NVIDIA-Nemotron-3-Nano-30B-A3B-FP8/nano_v3_reasoning_parser.py
if [ ! -f "$PLUGIN" ]; then
  [ -d NVIDIA-Nemotron-3-Nano-30B-A3B-BF16 ] || git clone -q https://huggingface.co/nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B-BF16
  PLUGIN=NVIDIA-Nemotron-3-Nano-30B-A3B-BF16/nano_v3_reasoning_parser.py
fi
echo "plugin=$PLUGIN vllm=$(python3 -c 'import vllm;print(vllm.__version__)' 2>&1)"
nohup python3 -m vllm.entrypoints.openai.api_server \
  --model nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B-FP8 \
  --dtype auto --trust-remote-code --served-model-name nemotron \
  --max-num-seqs 8 --max-model-len 65536 --kv-cache-dtype fp8 \
  --host 0.0.0.0 --port 8000 \
  --enable-auto-tool-choice --tool-call-parser qwen3_coder \
  --reasoning-parser-plugin "$PLUGIN" --reasoning-parser nano_v3 \
  >> /home/shadeform/vllm.log 2>&1 &
echo "launch pid $!"
