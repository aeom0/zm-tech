export interface Moneda {
  code: string;
  symbol: string;
  nombre: string;
  pais: string;
}

/** Monedas LATAM ordenadas: USD primero, luego alfabético por país */
export const MONEDAS_LATAM: Moneda[] = [
  { code: "USD", symbol: "$", nombre: "Dólar estadounidense", pais: "EE. UU. / Internacional" },
  { code: "VES", symbol: "Bs.", nombre: "Bolívar venezolano", pais: "Venezuela" },
  { code: "ARS", symbol: "$", nombre: "Peso argentino", pais: "Argentina" },
  { code: "BOB", symbol: "Bs.", nombre: "Boliviano", pais: "Bolivia" },
  { code: "BRL", symbol: "R$", nombre: "Real brasileño", pais: "Brasil" },
  { code: "CLP", symbol: "$", nombre: "Peso chileno", pais: "Chile" },
  { code: "COP", symbol: "$", nombre: "Peso colombiano", pais: "Colombia" },
  { code: "CRC", symbol: "₡", nombre: "Colón costarricense", pais: "Costa Rica" },
  { code: "CUP", symbol: "$", nombre: "Peso cubano", pais: "Cuba" },
  { code: "DOP", symbol: "RD$", nombre: "Peso dominicano", pais: "Rep. Dominicana" },
  { code: "GTQ", symbol: "Q", nombre: "Quetzal guatemalteco", pais: "Guatemala" },
  { code: "HNL", symbol: "L", nombre: "Lempira hondureño", pais: "Honduras" },
  { code: "MXN", symbol: "$", nombre: "Peso mexicano", pais: "México" },
  { code: "NIO", symbol: "C$", nombre: "Córdoba nicaragüense", pais: "Nicaragua" },
  { code: "PAB", symbol: "B/.", nombre: "Balboa panameño", pais: "Panamá" },
  { code: "PEN", symbol: "S/", nombre: "Sol peruano", pais: "Perú" },
  { code: "PYG", symbol: "₲", nombre: "Guaraní paraguayo", pais: "Paraguay" },
  { code: "SVC", symbol: "₡", nombre: "Colón salvadoreño", pais: "El Salvador" },
  { code: "UYU", symbol: "$U", nombre: "Peso uruguayo", pais: "Uruguay" },
];
