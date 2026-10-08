// anthropic.ts — Cliente Messages para el agente Haiku 5.5 (plan-cutover-agente-haiku.md)
//
// Haiku 5.5 rompe vs 4.5: sin temperature/top_p/top_k, thinking solo adaptive,
// sin prefill, el thinking cuenta en max_tokens y los bloques se leen por `type`.

import type { SupabaseClient } from "../lib/supabase.ts";
import { reportAnthropicApiFailure } from "../lib/haiku-usage.ts";

export const AGENT_MODEL = "claude-haiku-5-5";
export const AGENT_EFFORT = "medium" as const;
export const AGENT_MAX_TOKENS = 4096;
export const AGENT_TIMEOUT_MS = 25_000;

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

export type AgentTextBlock = { type: "text"; text: string };
export type AgentToolUseBlock = {
  type: "tool_use";
  id: string;
  name: string;
  input: Record<string, unknown>;
};
/** Thinking y otros bloques se devuelven tal cual (historial append-only). */
export type AgentOtherBlock = { type: string; [k: string]: unknown };
export type AgentContentBlock =
  | AgentTextBlock
  | AgentToolUseBlock
  | AgentOtherBlock;

export type AgentToolResultBlock = {
  type: "tool_result";
  tool_use_id: string;
  content: string;
  is_error?: boolean;
};

export type AgentMessage = {
  role: "user" | "assistant";
  content: string | AgentContentBlock[] | AgentToolResultBlock[];
};

export interface AgentToolDef {
  name: string;
  description: string;
  strict: true;
  input_schema: Record<string, unknown>;
}

export interface AgentSystemBlock {
  type: "text";
  text: string;
  cache_control?: { type: "ephemeral"; ttl?: "5m" | "1h" };
}

export interface AgentApiResult {
  content: AgentContentBlock[];
  stopReason: string;
  inputTokens: number;
  outputTokens: number;
  cacheCreationInputTokens: number;
  cacheReadInputTokens: number;
}

export async function callAgentMessages(opts: {
  system: AgentSystemBlock[];
  messages: AgentMessage[];
  tools: AgentToolDef[];
  supabase: SupabaseClient;
  phoneNumber: string;
  fetchImpl?: typeof fetch;
}): Promise<AgentApiResult | null> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    console.error("[AGENT] ANTHROPIC_API_KEY no configurada");
    return null;
  }
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AGENT_TIMEOUT_MS);
  try {
    const res = await (opts.fetchImpl ?? fetch)(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: AGENT_MODEL,
        max_tokens: AGENT_MAX_TOKENS,
        thinking: { type: "adaptive" },
        output_config: { effort: AGENT_EFFORT },
        system: opts.system,
        tools: opts.tools,
        tool_choice: { type: "auto" },
        messages: opts.messages,
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error(
        "[AGENT] Anthropic API:",
        res.status,
        errText.slice(0, 200),
      );
      void reportAnthropicApiFailure(opts.supabase, {
        status: res.status,
        bodyText: errText,
        source: "agent",
        phoneNumber: opts.phoneNumber,
      });
      return null;
    }
    const data = await res.json();
    const usage = data?.usage ?? {};
    return {
      content: Array.isArray(data?.content) ? data.content : [],
      stopReason: String(data?.stop_reason ?? ""),
      inputTokens: Number(usage.input_tokens ?? 0),
      outputTokens: Number(usage.output_tokens ?? 0),
      cacheCreationInputTokens: Number(usage.cache_creation_input_tokens ?? 0),
      cacheReadInputTokens: Number(usage.cache_read_input_tokens ?? 0),
    };
  } catch (err) {
    console.error("[AGENT] Anthropic fetch:", err);
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}
