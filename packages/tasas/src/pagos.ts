export type MonedaPago = 'USD' | 'BS'

export type MetodoPago = 'CASH_USD' | 'CASH_BS' | 'ZELLE' | 'PAGO_MOVIL' | 'TRANSFERENCIA' | 'MIXED'

export interface DetallePago {
  monto: number
  moneda: MonedaPago
}

export type DetallesPago = Partial<Record<MetodoPago, DetallePago>>

export interface ValidacionPagoMixto {
  valido: boolean
  totalUsdConvertido: number
  diferenciaUsd: number
  mensaje?: string
}

export function convertirUsdABs(montoUsd: number, tasaBcv: number): number {
  validarMonto(montoUsd, 'montoUsd')
  validarTasa(tasaBcv)
  return redondear(montoUsd * tasaBcv)
}

export function convertirBsAUsd(montoBs: number, tasaBcv: number): number {
  validarMonto(montoBs, 'montoBs')
  validarTasa(tasaBcv)
  return redondear(montoBs / tasaBcv)
}

export function validarDetallesPagoMixto(
  detalles: DetallesPago,
  totalUsd: number,
  tasaBcv: number,
  toleranciaUsd = 0.01
): ValidacionPagoMixto {
  validarMonto(totalUsd, 'totalUsd')
  validarTasa(tasaBcv)
  if (!Number.isFinite(toleranciaUsd) || toleranciaUsd < 0) {
    throw new Error('La tolerancia debe ser un número no negativo')
  }

  const totalUsdConvertido = redondear(
    Object.values(detalles).reduce((total, detalle) => {
      if (!detalle) return total
      validarMonto(detalle.monto, 'monto del pago')
      return total + (detalle.moneda === 'BS' ? detalle.monto / tasaBcv : detalle.monto)
    }, 0)
  )
  const diferenciaUsd = redondear(totalUsdConvertido - totalUsd)
  const valido = Math.abs(diferenciaUsd) <= toleranciaUsd

  return {
    valido,
    totalUsdConvertido,
    diferenciaUsd,
    mensaje: valido
      ? undefined
      : `Los pagos equivalen a $${totalUsdConvertido.toFixed(2)} y el total es $${totalUsd.toFixed(2)}`,
  }
}

function validarMonto(monto: number, nombre: string): void {
  if (!Number.isFinite(monto) || monto < 0) {
    throw new Error(`${nombre} debe ser un número no negativo`)
  }
}

function validarTasa(tasaBcv: number): void {
  if (!Number.isFinite(tasaBcv) || tasaBcv <= 0) {
    throw new Error('La tasa BCV debe ser mayor que cero')
  }
}

function redondear(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100
}
