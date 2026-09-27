/** Recargo POS por defecto (%) cuando el tenant no lo configuró. */
export const DEFAULT_POS_FEE_PERCENT = 5

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

/** % de recargo POS del tenant (`config.payments.posFeePercent`), con default 5. */
export function resolvePosFeePercent(percent?: number | null): number {
  return typeof percent === 'number' && Number.isFinite(percent) && percent >= 0
    ? percent
    : DEFAULT_POS_FEE_PERCENT
}

/** Monto a pasar por el POS: base + recargo. */
export function posChargeAmount(base: number, percent?: number | null): number {
  return round2(base * (1 + resolvePosFeePercent(percent) / 100))
}

/** Comisión incluida en el cobro POS (no cuenta como ingreso). */
export function posFeeAmount(base: number, percent?: number | null): number {
  return round2(posChargeAmount(base, percent) - base)
}
