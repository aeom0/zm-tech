/**
 * Log outbound WABA a wa_messages (panel /panel/waba/mensajes).
 * Debe await-earse: `void insert` se pierde al terminar la Edge Function.
 */
import { waConversationKey } from "./wa-recipient.mjs";

export type WaOutboundLogClient = {
  from: (table: string) => {
    insert: (row: Record<string, unknown>) => PromiseLike<{ error: unknown }>;
  };
};

export async function logWaOutboundMessage(
  supabase: WaOutboundLogClient,
  opts: {
    phone: string;
    content: string;
    msgType?: string;
    stepBefore?: string | null;
    wamid?: string | null;
    tenantId?: string;
  },
): Promise<void> {
  const phone = waConversationKey(opts.phone);
  if (!phone || !opts.content.trim()) return;

  const { error } = await supabase.from("wa_messages").insert({
    phone,
    ...(opts.tenantId ? { tenant_id: opts.tenantId } : {}),
    direction: "out",
    msg_type: opts.msgType ?? "text",
    content: opts.content.trim().slice(0, 4000),
    step_before: opts.stepBefore ?? null,
    ...(opts.wamid ? { wamid: opts.wamid } : {}),
    // accepted = Meta API OK; delivered/read/failed llegan por webhook statuses
    ...(opts.wamid
      ? {
          delivery_status: "accepted",
          delivery_status_at: new Date().toISOString(),
        }
      : {}),
  });

  if (error) {
    console.error(
      "[wa-outbound-log] insert failed:",
      typeof error === "object" && error && "message" in error
        ? (error as { message: string }).message
        : error,
    );
  }
}

/** Resumen legible de plantilla Meta para el hilo del panel. */
export function formatTemplateLogContent(
  templateName: string,
  parts: string[],
): string {
  const body = parts
    .map((p) => p.trim())
    .filter(Boolean)
    .join(" · ");
  return body
    ? `[plantilla:${templateName}] ${body}`
    : `[plantilla:${templateName}]`;
}
