/**
 * Healthcheck — verifica que el runtime de Edge Functions responde.
 * Deploy: supabase functions deploy healthcheck --project-ref llacowjutjfefboqgfnj
 */
Deno.serve((_req) => {
  return Response.json(
    {
      ok: true,
      service: "odentalpro-server",
      ts: new Date().toISOString(),
    },
    { status: 200 },
  );
});
