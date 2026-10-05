import { NextRequest, NextResponse } from 'next/server'
import { obtenerTasaUsdt, crearRepositorioTasasUsdt } from '@zmtech/tasas/server'
import { ahoraVenezuela } from '@zmtech/tasas'
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

  const tasa = await obtenerTasaUsdt()
  if (!tasa) {
    return NextResponse.json({ error: 'No se pudo obtener la tasa USDT' }, { status: 502 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const repo = crearRepositorioTasasUsdt(supabaseAdmin as any, TABLAS_TASAS.usdt)
  const hoy = ahoraVenezuela().format('YYYY-MM-DD')

  await repo.guardar({
    fecha: hoy,
    usd: tasa.usd,
    buy_rate: tasa.buy,
    sell_rate: tasa.sell,
    fuente: tasa.fuente,
  })

  return NextResponse.json({ ok: true, tasa })
}
