import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type WabaMessage = {
  id?: string;
  from?: string;
  timestamp?: string;
  type?: string;
  text?: { body?: string };
};

type WabaValue = {
  contacts?: Array<{ profile?: { name?: string } }>;
  messages?: WabaMessage[];
};

function extractValues(payload: unknown): WabaValue[] {
  if (!payload || typeof payload !== "object") return [];

  const root = payload as {
    object?: string;
    entry?: Array<{ changes?: Array<{ value?: WabaValue }> }>;
  };

  if (root.object !== "whatsapp_business_account" || !Array.isArray(root.entry)) {
    return [];
  }

  return root.entry.flatMap((entry) =>
    Array.isArray(entry.changes)
      ? entry.changes
          .map((change) => change.value)
          .filter((value): value is WabaValue => Boolean(value))
      : [],
  );
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const verifyToken = process.env.META_WABA_VERIFY_TOKEN;
  if (!verifyToken) {
    return NextResponse.json(
      { ok: false, error: "Falta META_WABA_VERIFY_TOKEN en entorno" },
      { status: 500 },
    );
  }

  if (mode === "subscribe" && token === verifyToken && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json(
    { ok: false, error: "No autorizado para verificar webhook" },
    { status: 403 },
  );
}

export async function POST(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Falta configurar NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY",
      },
      { status: 500 },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Body JSON invalido" },
      { status: 400 },
    );
  }

  const values = extractValues(payload);
  if (values.length === 0) {
    // Meta puede enviar eventos sin mensajes (status, delivery, read, etc.)
    return NextResponse.json({ ok: true, inserted: 0 }, { status: 200 });
  }

  const rows = values.flatMap((value) => {
    const profileName = value.contacts?.[0]?.profile?.name ?? null;
    const messages = Array.isArray(value.messages) ? value.messages : [];

    return messages.map((message) => {
      const timestampMs = message.timestamp
        ? Number.parseInt(message.timestamp, 10) * 1000
        : NaN;
      const messageTimestamp =
        Number.isFinite(timestampMs) && timestampMs > 0
          ? new Date(timestampMs).toISOString()
          : null;

      return {
        wa_message_id: message.id ?? null,
        from_phone: message.from ?? "desconocido",
        profile_name: profileName,
        message_type: message.type ?? "unknown",
        message_text: message.text?.body ?? null,
        message_timestamp: messageTimestamp,
        raw_payload: message as Record<string, unknown>,
      };
    });
  });

  if (rows.length === 0) {
    return NextResponse.json({ ok: true, inserted: 0 }, { status: 200 });
  }

  const { error } = await supabaseAdmin
    .from("waba_inbound_messages")
    .insert(rows);

  if (error) {
    return NextResponse.json(
      { ok: false, error: `Error guardando mensaje WABA: ${error.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, inserted: rows.length }, { status: 200 });
}
