// anthropic.ts — Cliente Messages del agente de reservas (plan-cutover-agente-haiku.md)
//
// El cliente vive en _shared/agent/anthropic.ts; aquí se fija la key del
// salón (ANTHROPIC_API_KEY) y el aviso de crédito agotado de este agente.

import type { SupabaseClient } from "../lib/supabase.ts";
import { reportAnthropicApiFailure } from "../lib/haiku-usage.ts";
import {
  type AgentApiResult,
  type AgentMessage,
  type AgentSystemBlock,
  type AgentToolDef,
  callMessagesApi,
} from "../../_shared/agent/anthropic.ts";

export {
  AGENT_EFFORT,
  AGENT_MAX_TOKENS,
  AGENT_MODEL,
  AGENT_TIMEOUT_MS,
} from "../../_shared/agent/anthropic.ts";
export type {
  AgentApiResult,
  AgentContentBlock,
  AgentMessage,
  AgentOtherBlock,
  AgentSystemBlock,
  AgentTextBlock,
  AgentToolDef,
  AgentToolResultBlock,
  AgentToolUseBlock,
} from "../../_shared/agent/anthropic.ts";

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
  return await callMessagesApi({
    apiKey,
    system: opts.system,
    messages: opts.messages,
    tools: opts.tools,
    fetchImpl: opts.fetchImpl,
    onApiError: (status, bodyText) => {
      void reportAnthropicApiFailure(opts.supabase, {
        status,
        bodyText,
        source: "agent",
        phoneNumber: opts.phoneNumber,
      });
    },
  });
}
