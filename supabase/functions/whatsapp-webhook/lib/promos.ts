// promos.ts — Reglas de promociones (ej. Packs Especiales solo Lun–Mié)

const PERU_TZ = "America/Lima";

export function isPacksEspecialesAllowed(
  timezone: string = PERU_TZ,
): boolean {
  const tzNow = new Date(
    new Date().toLocaleString("en-US", { timeZone: timezone }),
  );
  const day = tzNow.getDay();
  return day >= 1 && day <= 3;
}

export function isPacksEspecialesPromo(title: string, badge: string): boolean {
  const t = (title ?? "").toLowerCase();
  const b = (badge ?? "").toLowerCase();
  return (
    t.includes("packs especiales") ||
    t.includes("pack especial") ||
    b.includes("packs especiales") ||
    b.includes("pack especial")
  );
}

export function getPacksEspecialesRestrictionMessage(): string {
  return (
    "💜 Los *Packs Especiales* solo están disponibles de *lunes a miércoles*.\n\n" +
    "Hoy no aplican, pero puedes elegir otras promos o servicios del menú. " +
    "¿Quieres que te muestre las opciones disponibles?"
  );
}
