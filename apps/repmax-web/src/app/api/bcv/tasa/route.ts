import { NextResponse } from "next/server";
import {
  crearRepositorioTasasBcv,
  crearRepositorioTasasUsdt,
  resolverTasaBcvOperacion,
} from "@zmtech/tasas/server";
import { calcularSpreadInfo } from "@zmtech/tasas";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const repoBcv = crearRepositorioTasasBcv(admin as any);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const repoUsdt = crearRepositorioTasasUsdt(admin as any);

  const resultado = await resolverTasaBcvOperacion(repoBcv);
  if (!resultado.ok) {
    return NextResponse.json(resultado.body, { status: 503 });
  }

  const bcv = resultado.tasa;
  const usdt = await repoUsdt.obtenerUltimaHasta(bcv.fecha);

  const bcvInfo = {
    valor: bcv.usd,
    fecha: bcv.fecha,
    fuente: bcv.fuente,
    disponible: true,
    esReferencial: bcv.esReferencial ?? false,
    ultimaActualizacion: new Date().toISOString(),
  };

  const usdtInfo = usdt
    ? {
        valor: usdt.usd,
        fecha: usdt.fecha,
        fuente: usdt.fuente ?? "usdt.com.ve",
        disponible: true,
        esReferencial: usdt.fecha !== bcv.fecha,
        ultimaActualizacion: new Date().toISOString(),
      }
    : {
        valor: bcv.usd,
        fecha: bcv.fecha,
        fuente: "sin-tasa",
        disponible: false,
        esReferencial: true,
        ultimaActualizacion: new Date().toISOString(),
      };

  const spread = calcularSpreadInfo(bcvInfo.valor, usdtInfo.valor);

  return NextResponse.json({
    bcv: bcvInfo,
    usdt: usdtInfo,
    spread,
    timestamp: Date.now(),
    aviso: bcv.aviso,
  });
}
