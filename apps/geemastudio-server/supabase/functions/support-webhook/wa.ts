// wa.ts — Envío por la Cloud API con el número de soporte (no el de ningún salón).
// Secrets: SUPPORT_WA_PHONE_NUMBER_ID y SUPPORT_WA_ACCESS_TOKEN.

const WHATSAPP_API_URL = "https://graph.facebook.com/v22.0";

export function supportPhoneNumberId(): string | undefined {
  return Deno.env.get("SUPPORT_WA_PHONE_NUMBER_ID") || undefined;
}

/** Devuelve el wamid del mensaje enviado, o null si Meta lo rechazó. */
export async function sendSupportText(
  to: string,
  body: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string | null> {
  const phoneNumberId = supportPhoneNumberId();
  const token = Deno.env.get("SUPPORT_WA_ACCESS_TOKEN");
  if (!phoneNumberId || !token) {
    console.error(
      "[SUPPORT] faltan SUPPORT_WA_PHONE_NUMBER_ID o SUPPORT_WA_ACCESS_TOKEN",
    );
    return null;
  }
  try {
    const res = await fetchImpl(
      `${WHATSAPP_API_URL}/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to,
          type: "text",
          text: { body, preview_url: false },
        }),
      },
    );
    if (!res.ok) {
      console.error(
        "[SUPPORT] Meta send:",
        res.status,
        (await res.text()).slice(0, 200),
      );
      return null;
    }
    const data = await res.json();
    const wamid = data?.messages?.[0]?.id;
    return typeof wamid === "string" ? wamid : null;
  } catch (err) {
    console.error("[SUPPORT] Meta send fetch:", err);
    return null;
  }
}
