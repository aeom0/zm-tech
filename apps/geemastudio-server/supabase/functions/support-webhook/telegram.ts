// telegram.ts — Avisos de soporte al equipo por Telegram (decidido el 16-oct-2026:
// sin ventana de 24 h ni plantillas, a diferencia de WhatsApp).
// Secrets: SUPPORT_TELEGRAM_BOT_TOKEN (bot propio de soporte, creado con @BotFather)
// y SUPPORT_TELEGRAM_CHAT_ID (chat de Alberto o grupo del equipo).

const TELEGRAM_API_URL = "https://api.telegram.org";
/** Límite de Telegram por mensaje. */
const TELEGRAM_MAX_CHARS = 4096;

/** Devuelve false si faltan los secrets o Telegram rechazó el envío. */
export async function sendTelegramAlert(
  text: string,
  fetchImpl: typeof fetch = fetch,
): Promise<boolean> {
  const token = Deno.env.get("SUPPORT_TELEGRAM_BOT_TOKEN");
  const chatId = Deno.env.get("SUPPORT_TELEGRAM_CHAT_ID");
  if (!token || !chatId) {
    console.warn(
      "[SUPPORT] Telegram sin configurar; aviso solo en logs:",
      text.slice(0, 200),
    );
    return false;
  }
  try {
    const res = await fetchImpl(`${TELEGRAM_API_URL}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Texto plano (sin parse_mode): el resumen viene del modelo y del usuario.
      body: JSON.stringify({
        chat_id: chatId,
        text: text.slice(0, TELEGRAM_MAX_CHARS),
        disable_web_page_preview: true,
      }),
    });
    if (!res.ok) {
      console.error(
        "[SUPPORT] Telegram:",
        res.status,
        (await res.text()).slice(0, 200),
      );
      return false;
    }
    return true;
  } catch (err) {
    console.error("[SUPPORT] Telegram fetch:", err);
    return false;
  }
}

export interface EscalationAlert {
  id: number;
  reused: boolean;
  urgente: boolean;
  categoria: string;
  resumen: string;
  phone: string;
  contactName: string | null;
  enHorario: boolean;
}

export function formatEscalationAlert(t: EscalationAlert): string {
  const head = [
    t.urgente ? "URGENTE ·" : "",
    `Caso #${t.id}${t.reused ? " (actualizado)" : ""}`,
    `· ${t.categoria}`,
  ].filter(Boolean).join(" ");
  return [
    head,
    `Contacto: ${t.contactName ? `${t.contactName} ` : ""}+${t.phone}`,
    t.enHorario ? "Llegó en horario de atención." : "Llegó fuera de horario.",
    "",
    t.resumen || "(sin resumen)",
  ].join("\n");
}
