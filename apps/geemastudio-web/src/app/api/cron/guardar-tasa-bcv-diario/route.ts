import { NextRequest, NextResponse } from 'next/server'
import { obtenerTasaDesdeProveedores, crearRepositorioTasasBcv } from '@zmtech/tasas/server'
import { ahoraVenezuela, esFinDeSemana } from '@zmtech/tasas'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { TABLAS_TASAS } from '@/lib/tasas'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Falta SUPABASE_SERVICE_ROLE_KEY' }, { status: 500 })
  }

  const tasa = await obtenerTasaDesdeProveedores()
  if (!tasa) {
    return NextResponse.json({ error: 'No se pudo obtener la tasa BCV' }, { status: 502 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const repo = crearRepositorioTasasBcv(supabaseAdmin as any, TABLAS_TASAS.bcv)
  const hoy = ahoraVenezuela().format('YYYY-MM-DD')

  await repo.guardar({
    fecha: tasa.fecha,
    usd: tasa.usd,
    fuente: tasa.fuente,
    es_fin_de_semana: esFinDeSemana(hoy),
  })

  return NextResponse.json({ ok: true, tasa })
}
