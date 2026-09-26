/** Comisión del POS (tarjeta): se cobra a la clienta pero NO es ingreso del negocio. */
export const POS_FEE_RATE = 0.05

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

/** Monto a pasar por el POS: base + 5 %. */
export function posChargeAmount(base: number): number {
  return round2(base * (1 + POS_FEE_RATE))
}

/** Comisión incluida en el cobro POS (no cuenta como ingreso). */
export function posFeeAmount(base: number): number {
  return round2(posChargeAmount(base) - base)
}
