import { NextRequest, NextResponse } from "next/server";
import { obtenerTasaDesdeProveedores, crearRepositorioTasasBcv } from "@zmtech/tasas/server";
import { ahoraVenezuela, esFinDeSemana } from "@zmtech/tasas";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const tasa = await obtenerTasaDesdeProveedores();
  if (!tasa) {
    return NextResponse.json({ error: "No se pudo obtener la tasa BCV" }, { status: 502 });
  }

  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const repo = crearRepositorioTasasBcv(admin as any);
  const hoy = ahoraVenezuela().format("YYYY-MM-DD");

  await repo.guardar({
    fecha: tasa.fecha,
    usd: tasa.usd,
    fuente: tasa.fuente,
    es_fin_de_semana: esFinDeSemana(hoy),
  });

  return NextResponse.json({ ok: true, tasa });
}
