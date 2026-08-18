import { NextRequest, NextResponse } from 'next/server'
import { obtenerTasaUsdt, crearRepositorioTasasUsdt } from '@zmtech/tasas/server'
import { ahoraVenezuela } from '@zmtech/tasas'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const tasa = await obtenerTasaUsdt()
  if (!tasa) {
    return NextResponse.json({ error: 'No se pudo obtener la tasa USDT' }, { status: 502 })
  }

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const repo = crearRepositorioTasasUsdt(admin as any)
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
