#!/usr/bin/env bash
# WS-A smoke test — verify the vLLM-Nemotron endpoint speaks OpenAI chat-completions
# AND tool-calling (the qwen3_coder parser). Run this on the Brev box (or anywhere
# that can reach it) the moment `vllm serve` is up.
#
# Usage:
#   CANDLE_BASE_URL=http://<ip>:8000/v1 CANDLE_MODEL=nemotron-candle ./scripts/serving/smoke.sh
# Defaults to localhost:8000 if unset.

set -euo pipefail

BASE="${CANDLE_BASE_URL:-http://localhost:8000/v1}"
MODEL="${CANDLE_MODEL:-nemotron-candle}"
KEY="${CANDLE_API_KEY:-dummy}"   # vLLM ignores the key

echo "▶ endpoint: $BASE   model: $MODEL"
echo

# ── 1. /v1/models is alive and lists the served model ────────────────────────
echo "1) GET /models"
MODELS=$(curl -sS "$BASE/models" -H "Authorization: Bearer $KEY")
echo "$MODELS" | grep -q "$MODEL" \
  && echo "   ✅ model '$MODEL' is served" \
  || { echo "   ❌ '$MODEL' not in /models response:"; echo "$MODELS"; exit 1; }
echo

# ── 2. plain chat completion returns text ────────────────────────────────────
echo "2) chat.completions (plain)"
CHAT=$(curl -sS "$BASE/chat/completions" -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" -d @- <<JSON
{ "model": "$MODEL", "temperature": 0, "seed": 42,
  "messages": [{"role":"user","content":"Reply with exactly the word: ready"}] }
JSON
)
echo "$CHAT" | grep -qi "ready" \
  && echo "   ✅ got a text completion" \
  || { echo "   ❌ no usable completion:"; echo "$CHAT"; exit 1; }
echo

# ── 3. THE load-bearing one: does it emit a tool_call? ───────────────────────
# The probe agent is useless without tool calling. This is what --tool-call-parser
# qwen3_coder must enable. If this fails, the reasoning/tool-call parser flags are wrong.
echo "3) chat.completions (tool-calling)"
TOOL=$(curl -sS "$BASE/chat/completions" -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" -d @- <<JSON
{ "model": "$MODEL", "temperature": 0, "seed": 42,
  "messages": [
    {"role":"system","content":"You are a probe agent. When you need data, call a tool."},
    {"role":"user","content":"Read the file skmd_fastapi/scripts/monthly_billing.py and tell me what it does. Use the repo_read tool."}
  ],
  "tools": [
    { "type":"function", "function": {
        "name":"repo_read",
        "description":"Read a file from the target repository.",
        "parameters": { "type":"object",
          "properties": { "path": {"type":"string","description":"repo-relative file path"} },
          "required": ["path"] } } }
  ],
  "tool_choice": "auto" }
JSON
)
if echo "$TOOL" | grep -q '"tool_calls"'; then
  echo "   ✅ model emitted a tool_call — tool-calling WORKS"
  echo "$TOOL" | grep -o '"name":[^,]*' | head -1
else
  echo "   ❌ NO tool_calls in response. The tool-call/reasoning parser is likely wrong."
  echo "      Confirm: --tool-call-parser qwen3_coder --reasoning-parser nano_v3 (NOT deepseek_r1)."
  echo "$TOOL"
  exit 1
fi
echo
echo "🎉 all three passed — endpoint is ready to be the standard candle."
echo "   → put CANDLE_BASE_URL=$BASE and CANDLE_MODEL=$MODEL in .env.local"
