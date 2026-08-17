// Categorías MLV frecuentes para modo manual (sin predictor API).
// IDs alineados al árbol Accesorios para Vehículos → Repuestos Autos (site MLV).

export interface MlManualCategory {
  id: string;
  name: string;
  /** Algunas subcategorías exigen atributo COLOR en el publicador masivo. */
  requiresColor?: boolean;
}

export const ML_MANUAL_CATEGORIES: MlManualCategory[] = [
  { id: 'MLV1747', name: 'Repuestos Autos y Camionetas' },
  { id: 'MLV1771', name: 'Repuestos Motos y Cuatriciclos' },
  { id: 'MLV438380', name: 'Filtros de Aceite' },
  { id: 'MLV438381', name: 'Filtros de Aire' },
  { id: 'MLV438383', name: 'Filtros de Combustible' },
  { id: 'MLV1774', name: 'Frenos — Pastillas y Discos' },
  { id: 'MLV1775', name: 'Suspensión y Amortiguadores' },
  { id: 'MLV1776', name: 'Motor — Juntas y Empaques' },
  { id: 'MLV1777', name: 'Motor — Correas y Tensores' },
  { id: 'MLV1778', name: 'Encendido — Bujías y Cables' },
  { id: 'MLV1779', name: 'Encendido — Distribución' },
  { id: 'MLV1780', name: 'Transmisión — Embrague' },
  { id: 'MLV1781', name: 'Transmisión — Caja y Diferencial' },
  { id: 'MLV1782', name: 'Carrocería — Espejos y Manijas' },
  { id: 'MLV1783', name: 'Carrocería — Parabrisas y Ventanas' },
  { id: 'MLV1784', name: 'Iluminación — Faros y Bombillos' },
  { id: 'MLV1785', name: 'Aire Acondicionado y Calefacción' },
  { id: 'MLV1786', name: 'Sensores y Electrónica' },
  { id: 'MLV1787', name: 'Baterías y Accesorios' },
  { id: 'MLV1788', name: 'Lubricantes y Fluidos' },
  { id: 'MLV1789', name: 'Otros Repuestos Autos' },
  { id: 'MLV438400', name: 'Accesorios Interior — Fundas y Alfombras', requiresColor: true },
  { id: 'MLV438401', name: 'Accesorios Exterior — Deflectores', requiresColor: true },
];

export function buscarCategoriasManual(q: string): MlManualCategory[] {
  const term = q.trim().toLowerCase();
  if (!term) return ML_MANUAL_CATEGORIES;
  return ML_MANUAL_CATEGORIES.filter(
    (c) =>
      c.name.toLowerCase().includes(term) ||
      c.id.toLowerCase().includes(term),
  );
}

export function categoriaManualPorId(id: string): MlManualCategory | undefined {
  return ML_MANUAL_CATEGORIES.find((c) => c.id === id);
}
