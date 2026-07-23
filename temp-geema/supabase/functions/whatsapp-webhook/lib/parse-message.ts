// parse-message.ts — Extracción segura de texto e interactivos del payload de WhatsApp

function getReplyField(
  obj: Record<string, unknown>,
  keySnake: string,
  keyCamel: string,
  field: string,
): string | undefined {
  const reply = obj[keySnake] ?? obj[keyCamel];
  if (!reply || typeof reply !== "object" || !(field in reply))
    return undefined;
  const val = (reply as Record<string, unknown>)[field];
  return val != null ? String(val) : undefined;
}

export function getInteractiveId(
  message: Record<string, unknown>,
): string | undefined {
  const interactive = message?.interactive;
  if (!interactive || typeof interactive !== "object") return undefined;
  const obj = interactive as Record<string, unknown>;

  const listId = getReplyField(obj, "list_reply", "listReply", "id");
  if (listId) return listId;

  const buttonId = getReplyField(obj, "button_reply", "buttonReply", "id");
  if (buttonId) return buttonId;

  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val && typeof val === "object" && "id" in val) {
      const id = (val as { id: string }).id;
      if (id != null) return String(id);
    }
  }

  return undefined;
}

export function getInteractiveTitle(
  message: Record<string, unknown>,
): string | undefined {
  const interactive = message?.interactive;
  if (!interactive || typeof interactive !== "object") return undefined;
  const obj = interactive as Record<string, unknown>;

  return (
    getReplyField(obj, "list_reply", "listReply", "title") ??
    getReplyField(obj, "button_reply", "buttonReply", "title")
  );
}

export function getMessageText(message: Record<string, unknown>): string {
  if (message?.type !== "text") return "";
  const text = message.text;
  if (!text || typeof text !== "object") return "";
  const body = (text as Record<string, string>).body;
  return body != null ? String(body).trim() : "";
}

export interface WAReferal {
  source_type: string;
  source_id?: string;
  headline?: string;
  ctwa_clid?: string;
}

export function getReferral(
  message: Record<string, unknown>,
): WAReferal | null {
  const ref = message?.referral;
  if (!ref || typeof ref !== "object") return null;
  const r = ref as Record<string, string>;
  return {
    source_type: r.source_type ?? "unknown",
    source_id: r.source_id,
    headline: r.headline,
    ctwa_clid: r.ctwa_clid,
  };
}

export function isFromAd(message: Record<string, unknown>): boolean {
  return getReferral(message)?.source_type === "ad";
}
