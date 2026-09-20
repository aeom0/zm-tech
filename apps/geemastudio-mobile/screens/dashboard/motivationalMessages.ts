const MOTIVATIONAL_MESSAGES = [
  'Hoy es un gran día para atender a tus clientes con excelencia 💆',
  'Cada cita es una oportunidad de dejar una gran impresión ✨',
  'Tu trabajo transforma la confianza de las personas 💖',
  'Un negocio ordenado hoy es un negocio que crece mañana 📈',
  'La constancia es el secreto de los negocios que perduran 🌱',
  'Cuida cada detalle, tus clientes lo notan 🔍',
  'Hoy puedes superar tu mejor semana 🚀',
  'Cada cliente satisfecho es la mejor publicidad 🌟',
  'Tu dedicación se nota en cada servicio que ofreces 💅',
  'Organiza hoy, disfruta resultados mañana 🗓️',
  'Un buen servicio siempre encuentra el camino de vuelta 🔁',
  'La excelencia es un hábito, no un accidente 🏆',
  'Hoy es una nueva oportunidad para brillar ⭐',
  'Tu esfuerzo de hoy construye la lealtad de mañana 💎',
  'Cada agenda llena refleja el trabajo bien hecho 📅',
]

/** Elige una frase motivadora al azar para el encabezado del panel. */
export function getRandomMotivationalMessage(): string {
  const index = Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length)
  return MOTIVATIONAL_MESSAGES[index]
}
