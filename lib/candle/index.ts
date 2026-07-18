// ─────────────────────────────────────────────────────────────────────────────
// Contract B — CandleClient.  OWNED BY ORCHESTRATOR (M3).  FROZEN + implemented.
// The swap seam between the engine and the model endpoint.
//   dev  (M1): Claude Opus 4.8 via Anthropic's OpenAI-compatible endpoint
//   prod     : vLLM-Nemotron (natively OpenAI-compatible) = THE STANDARD CANDLE
// Both speak the OpenAI chat-completions + tool-calling protocol, so the engine
// sees ONE message format.  Selection is env-driven; the engine never knows which
// model is behind it.  A measured/scored run MUST use prod (the pinned candle);
// dev is for building the engine before the GPU is up — never for a scored run.
// ─────────────────────────────────────────────────────────────────────────────

import OpenAI from "openai";
import type { CandleSpec } from "@/lib/contracts";
import type { ToolSchema } from "@/lib/surfaces";

// OpenAI-chat-completions message shapes (so conversion is near-identity).
export interface ToolCall {
  id: string;
  name: string;
  arguments: string; // JSON string of args (as the model emits it)
}

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: ToolCall[]; // present on assistant turns that call tools
  tool_call_id?: string; // present on role:"tool" turns
  name?: string; // tool name on role:"tool" turns
}

export interface ToolDef {
  name: string;
  description: string;
  schema: ToolSchema; // JSON schema for the args
}

export interface CandleResponse {
  message: ChatMessage; // the assistant message to append to history verbatim
  text: string; // convenience: assistant text (may be "")
  toolCalls: ToolCall[]; // convenience: [] when the model is done
  usage: { promptTokens: number; completionTokens: number };
}

export interface CandleClient {
  spec: CandleSpec; // recorded on the Run so the candle is pinned + auditable
  isProd: boolean; // true = the pinned Nemotron candle (scored runs only)
  chat(messages: ChatMessage[], tools?: ToolDef[]): Promise<CandleResponse>;
}

export interface CandleConfig {
  baseURL?: string; // set → prod (vLLM); unset → dev (Anthropic compat)
  model?: string;
  apiKey?: string;
  seed?: number;
  temperature?: number;
}

// Convert our simplified ChatMessage into the OpenAI wire shape. Assistant
// tool-call turns must be re-expanded to { id, type:"function", function:{…} }
// or the API rejects the next request ("tool_calls.0.type: Field required").
function toWireMessage(
  m: ChatMessage,
): OpenAI.Chat.Completions.ChatCompletionMessageParam {
  if (m.role === "assistant" && m.tool_calls && m.tool_calls.length) {
    return {
      role: "assistant",
      content: m.content ?? "",
      tool_calls: m.tool_calls.map((tc) => ({
        id: tc.id,
        type: "function" as const,
        function: { name: tc.name, arguments: tc.arguments },
      })),
    };
  }
  if (m.role === "tool") {
    return {
      role: "tool",
      content: m.content ?? "",
      tool_call_id: m.tool_call_id ?? "",
    };
  }
  if (m.role === "system") return { role: "system", content: m.content ?? "" };
  if (m.role === "assistant") return { role: "assistant", content: m.content ?? "" };
  return { role: "user", content: m.content ?? "" };
}

// Factory. Reads env by default; pass overrides for tests.
//   prod  when CANDLE_BASE_URL is set   → { baseURL, model: CANDLE_MODEL, apiKey: dummy-ok }
//   dev   otherwise                     → Anthropic OpenAI-compat, Opus 4.8, ANTHROPIC_API_KEY
export function createCandle(cfg: CandleConfig = {}): CandleClient {
  const baseURL = cfg.baseURL ?? process.env.CANDLE_BASE_URL;
  const isProd = Boolean(baseURL);
  const seed = cfg.seed ?? 42;
  const temperature = cfg.temperature ?? 0;

  const resolved = isProd
    ? {
        baseURL: baseURL!,
        model: cfg.model ?? process.env.CANDLE_MODEL ?? "nemotron-candle",
        apiKey: cfg.apiKey ?? process.env.CANDLE_API_KEY ?? "dummy", // vLLM ignores
        quant: (process.env.CANDLE_QUANT as string | undefined) ?? null,
      }
    : {
        baseURL: "https://api.anthropic.com/v1/",
        // M1 (revised 2026-07-18): dev stand-in = Sonnet 5 (~2.5x cheaper than
        // Opus, near-Opus tool-use). Dev-only; measured runs go to Nemotron.
        model: cfg.model ?? process.env.DEV_CANDLE_MODEL ?? "claude-sonnet-5",
        apiKey: cfg.apiKey ?? process.env.ANTHROPIC_API_KEY ?? "",
        quant: null,
      };

  const client = new OpenAI({ baseURL: resolved.baseURL, apiKey: resolved.apiKey });

  const spec: CandleSpec = {
    model: resolved.model,
    quant: resolved.quant,
    seed,
    temp: temperature,
  };

  return {
    spec,
    isProd,
    async chat(messages, tools) {
      const req: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming = {
        model: resolved.model,
        // seed + temperature are for the pinned vLLM candle (determinism). The dev
        // Opus stand-in deprecates temperature and rejects unknown params, so send
        // neither on the dev path (undefined is dropped by the SDK).
        seed: isProd ? seed : undefined,
        temperature: isProd ? temperature : undefined,
        messages: messages.map(toWireMessage),
        ...(tools && tools.length
          ? {
              tools: tools.map((t) => ({
                type: "function" as const,
                function: { name: t.name, description: t.description, parameters: t.schema },
              })),
            }
          : {}),
      };

      const completion = await client.chat.completions.create(req);
      const choice = completion.choices[0]?.message;

      const toolCalls: ToolCall[] =
        choice?.tool_calls?.map((tc) => ({
          id: tc.id,
          // only function tool-calls are used by our surfaces
          name: "function" in tc ? tc.function.name : (tc as { name?: string }).name ?? "",
          arguments: "function" in tc ? tc.function.arguments : "{}",
        })) ?? [];

      const message: ChatMessage = {
        role: "assistant",
        content: choice?.content ?? "",
        ...(toolCalls.length ? { tool_calls: toolCalls } : {}),
      };

      return {
        message,
        text: choice?.content ?? "",
        toolCalls,
        usage: {
          promptTokens: completion.usage?.prompt_tokens ?? 0,
          completionTokens: completion.usage?.completion_tokens ?? 0,
        },
      };
    },
  };
}
