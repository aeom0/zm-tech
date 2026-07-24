/**
 * Auth webhook stub — recibe eventos de Supabase Auth (signup, login…).
 * Fase 1: bootstrap de odental_employees + claim tenant_id en JWT.
 *
 * Deploy: supabase functions deploy auth-webhook --project-ref llacowjutjfefboqgfnj
 */
Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const payload = await req.json();
    console.log("[odentalpro auth-webhook]", payload?.type ?? "unknown");
    return Response.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error("[odentalpro auth-webhook] error", error);
    return Response.json({ error: "invalid payload" }, { status: 400 });
  }
});
