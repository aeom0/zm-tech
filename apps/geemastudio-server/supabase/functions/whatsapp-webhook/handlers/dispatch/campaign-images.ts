// campaign-images.ts — Creativos CTWA de /panel/waba/campanas (Plan 08)

import type { SupabaseClient } from "../../lib/supabase.ts";

export type CampaignPromoImage = { url: string; caption: string };

/** Imágenes vigentes de /panel/waba/campanas (solo las que tienen URL). */
export function buildCampaignPromoImages(opts: {
  image1Url: string;
  image1Caption: string;
  image2Url: string;
  image2Caption: string;
  image3Url?: string;
  image3Caption?: string;
  image4Url?: string;
  image4Caption?: string;
}): CampaignPromoImage[] {
  return [
    { url: opts.image1Url, caption: opts.image1Caption },
    { url: opts.image2Url, caption: opts.image2Caption },
    { url: opts.image3Url ?? "", caption: opts.image3Caption ?? "" },
    { url: opts.image4Url ?? "", caption: opts.image4Caption ?? "" },
  ].filter((img) => Boolean(img.url?.trim()));
}

/**
 * Envía creativos de campaña. Anti-dup: si una imagen puntual (por URL) ya
 * salió en ~20s, no la reenvía — pero no bloquea el resto del lote. Antes el
 * guard era "¿salió CUALQUIER imagen en 20s?", lo que podía dejar sin
 * imágenes un tap de rubro distinto llegado por webhook duplicado/coalescido
 * poco después de otro rubro (ej. Extensiones seguido de Lifting).
 * Retorna cuántas imágenes se enviaron.
 */
export async function sendCampaignImagesIfAny(
  supabase: SupabaseClient,
  phoneNumber: string,
  images: CampaignPromoImage[],
  sendImageFn: (to: string, url: string, caption?: string) => Promise<unknown>,
): Promise<number> {
  if (images.length === 0) return 0;

  const since = new Date(Date.now() - 20_000).toISOString();
  const { data: recentOut } = await supabase
    .from("wa_messages")
    .select("image_url")
    .eq("phone", phoneNumber)
    .eq("direction", "out")
    .eq("msg_type", "image")
    .gte("created_at", since)
    .limit(20);
  const recentUrls = new Set(
    (recentOut ?? [])
      .map((r: { image_url: string | null }) => r.image_url)
      .filter((u): u is string => Boolean(u)),
  );

  const toSend = images.filter((img) => !recentUrls.has(img.url));
  if (toSend.length === 0 && images.length > 0) {
    console.log(
      "[WABA] campaign images: skip dup (mismas URLs recientes):",
      phoneNumber.slice(-4),
    );
    return 0;
  }

  let sent = 0;
  for (const img of toSend) {
    await sendImageFn(phoneNumber, img.url, img.caption || undefined);
    sent += 1;
  }
  return sent;
}
