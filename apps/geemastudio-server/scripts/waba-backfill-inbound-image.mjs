/**
 * One-shot: backfill image_url de un wa_messages inbound + pausar bot.
 * Uso: node --env-file=.env scripts/waba-backfill-inbound-image.mjs <phone> <media_id>
 */
import { createClient } from "@supabase/supabase-js";

const phone = (process.argv[2] || "").replace(/\D/g, "");
const mediaId = process.argv[3] || "";
const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const WA_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

if (!phone || !mediaId) {
  console.error(
    "Uso: node --env-file=.env scripts/waba-backfill-inbound-image.mjs <phone> <media_id>",
  );
  process.exit(1);
}
if (!SUPABASE_URL || !SERVICE_KEY || !WA_TOKEN) {
  console.error("Faltan SUPABASE_URL / SERVICE_ROLE / WHATSAPP_ACCESS_TOKEN");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
const BUCKET = "waba-images";

async function main() {
  const mediaRes = await fetch(`https://graph.facebook.com/v22.0/${mediaId}`, {
    headers: { Authorization: `Bearer ${WA_TOKEN}` },
  });
  const mediaData = await mediaRes.json();
  if (!mediaData.url) {
    console.error("Meta no devolvió URL:", mediaData);
    process.exit(1);
  }

  const fileRes = await fetch(mediaData.url, {
    headers: { Authorization: `Bearer ${WA_TOKEN}` },
  });
  if (!fileRes.ok) {
    console.error("Download Meta falló:", fileRes.status);
    process.exit(1);
  }
  const buf = await fileRes.arrayBuffer();
  const fileName = `inbound-chat/${phone}/backfill_${Date.now()}_${mediaId.slice(-12)}.jpg`;

  const { data: up, error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(fileName, buf, {
      contentType: mediaData.mime_type ?? "image/jpeg",
      upsert: true,
    });
  if (upErr) {
    console.error("Upload:", upErr.message);
    process.exit(1);
  }

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(up.path);
  const imageUrl = pub.publicUrl;
  console.log("URL:", imageUrl);

  const { error: updErr } = await supabase
    .from("wa_messages")
    .update({ image_url: imageUrl, content: "[imagen]" })
    .eq("media_id", mediaId)
    .eq("direction", "in");
  if (updErr) console.error("wa_messages:", updErr.message);

  const { data: existing } = await supabase
    .from("whatsapp_sessions")
    .select("phone")
    .eq("phone", phone)
    .maybeSingle();

  if (existing) {
    const { error: pauseErr } = await supabase
      .from("whatsapp_sessions")
      .update({
        bot_paused_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("phone", phone);
    if (pauseErr) console.error("pause:", pauseErr.message);
    else console.log("Pausado:", phone);
  } else {
    const { error: pauseErr } = await supabase
      .from("whatsapp_sessions")
      .insert({
        phone,
        bot_paused_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    if (pauseErr) console.error("pause insert:", pauseErr.message);
    else console.log("Sesión creada + pausada:", phone);
  }

  // Push staff
  const { data: admins } = await supabase
    .from("profiles")
    .select("id")
    .in("role", ["owner", "dev"]);
  if (admins?.length) {
    const { error: pushErr } = await supabase.functions.invoke(
      "send-notification",
      {
        body: {
          user_ids: admins.map((a) => a.id),
          title: "📷 Foto diseño · Revisar YA",
          body: "Cynthia: foto de diseño (backfill). Bot en pausa. Abrí el chat.",
          data: {
            type: "waba_chat",
            phone,
            url: `https://geema.zmtechdev.com/panel/waba/mensajes?phone=${encodeURIComponent(phone)}`,
          },
        },
      },
    );
    if (pushErr) console.error("push:", pushErr.message);
    else console.log("Push enviado a", admins.length, "admins");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
