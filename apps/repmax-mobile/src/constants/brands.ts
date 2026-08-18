// ============================================================
// Seed de marcas y modelos del mercado automotor venezolano
// Fuente: parque circulante y ventas reportadas por VPA, JAC Venezuela,
// Empire Keeway y foros del sector (repuestosdelarosa.com, radaforca.com).
// No pretende ser exhaustivo — cubre lo que más rota en un mostrador.
// ============================================================

export const BRANDS = [
  // Carro / SUV — parque circulante histórico + ensamblaje reciente
  'Toyota',
  'Chevrolet',
  'Ford',
  'Hyundai',
  'Kia',
  'Nissan',
  'Mitsubishi',
  'Volkswagen',
  'Renault',
  'Fiat',
  'Jeep',
  'Dodge',
  'Chery',
  'JAC',
  'BYD',
  'Great Wall',
  'Geely',
  'JMC',
  'Suzuki',
  // Camión / carga liviana
  'Hino',
  'Isuzu',
  'Foton',
  // Moto — ensambladoras con mayor presencia en el país
  'Empire Keeway',
  'Bera',
  'Skygo',
  'MD',
  'Haojue',
  'Yamaha',
  'AVA',
  'Vefase',
]

/** Año más antiguo razonable para el parque circulante venezolano. */
export const VEHICLE_YEAR_MIN = 1980
export const VEHICLE_YEAR_MAX = new Date().getFullYear() + 1

/**
 * Modelos más buscados por marca — ayuda a normalizar el campo Modelo
 * (evita "corolla", "Corolla 2015", "TOYOTA COROLLA" como valores distintos).
 * No es una lista cerrada: el campo sigue siendo texto libre.
 */
export const MODELS_BY_BRAND: Record<string, string[]> = {
  Toyota: ['Corolla', 'Camry', 'Yaris', 'Hilux', 'Fortuner', 'Land Cruiser', 'RAV4', 'Terios'],
  Chevrolet: ['Aveo', 'Spark', 'Optra', 'Corsa', 'Grand Vitara', 'Silverado', 'Captiva'],
  Ford: ['Fiesta', 'Focus', 'Explorer', 'Ranger', 'Escape', 'EcoSport'],
  Hyundai: ['Accent', 'Elantra', 'Tucson', 'Santa Fe', 'Getz', 'Grand i10'],
  Kia: ['Rio', 'Cerato', 'Sportage', 'Picanto', 'Sorento'],
  Nissan: ['Sentra', 'Versa', 'X-Trail', 'Frontier', 'Almera'],
  Mitsubishi: ['Lancer', 'Montero', 'Outlander', 'L200'],
  Volkswagen: ['Gol', 'Voyage', 'Amarok', 'Jetta', 'Saveiro'],
  Renault: ['Logan', 'Sandero', 'Duster', 'Clio'],
  Fiat: ['Palio', 'Siena', 'Uno', 'Punto'],
  Jeep: ['Grand Cherokee', 'Cherokee', 'Wrangler', 'Patriot'],
  Dodge: ['Journey', 'Caliber', 'Durango'],
  Chery: ['Tiggo 2', 'Tiggo 3', 'Tiggo 7', 'Arauca', 'QQ'],
  JAC: ['Nevado', 'Tepuy', 'J7', 'S3'],
  BYD: ['Song Plus', 'Yuan Plus', 'Han', 'F3'],
  'Great Wall': ['Haval H6', 'Wingle', 'Poer'],
  Geely: ['Coolray', 'Emgrand', 'Azkarra'],
  JMC: ['Vigus', 'Boarding'],
  Suzuki: ['Grand Vitara', 'Swift', 'Alto'],
  Hino: ['300', '500', '700'],
  Isuzu: ['NPR', 'D-Max', 'FVR'],
  Foton: ['Tunland', 'Aumark'],
  'Empire Keeway': ['Horse RL', 'New Horse', 'TX', 'Voxx'],
  Bera: ['Jaguar', 'Socialista', 'Sr2', 'Brz'],
  Skygo: ['Corcel', 'SG', 'Duty'],
  MD: ['Houjin', 'MD150'],
  Haojue: ['DR160', 'HJ125'],
  Yamaha: ['XTZ 125', 'YBR', 'FZ'],
  AVA: ['Sparta', 'Cross'],
  Vefase: ['Voyage', 'Explorer'],
}
