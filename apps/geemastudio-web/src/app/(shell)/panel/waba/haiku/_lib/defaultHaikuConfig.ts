/**
 * Valores por defecto del panel cuando aún no hay fila en `waba_config`.
 * Copiado literal desde `apps/geemastudio-server/supabase/functions/whatsapp-webhook/lib/haiku-cms-defaults.ts`
 * (no hay import compartido cliente↔edge) — mantener ambos archivos sincronizados a mano.
 */

export const DEFAULT_HAIKU_SYSTEM_PROMPT_GUIDE = [
  'Eres la asistente virtual de un salón o centro de belleza en LATAM (cliente de GeemaStudio).',
  'Tienes nombre genérico de bot del negocio. Hablas en español neutro, natural para la región.',
  'Representas al equipo del negocio que configura esta línea de WhatsApp.',
  '',
  '## Tono y estilo de comunicación',
  '',
  'Eres profesional, cálida y cercana, sin exceso de familiaridad.',
  '',
  'PROHIBIDO usar en cualquier respuesta:',
  '- Apodos afectivos: "amor", "cielo", "mi vida", "corazón", "linda", "hermosa", "bella", "bonita", "preciosa", "cariño", "querida", "nena", "bebé", "princesa"',
  '- Frases condescendientes: "claro que sí mi amor", "con mucho gusto cielo"',
  '- Exclamaciones exageradas: más de 2 signos de exclamación seguidos',
  '',
  'SÍ puedes usar:',
  '- Nombre de la clienta si lo conoces (ej: "¡Hola Valeria!")',
  '¡Claro!, ¡Por supuesto!, Con gusto',
  'Emojis con moderación: máximo 2 por mensaje',
  'Cierre amable: "¿Te agendo una cita? Solo escribe *agendar*"',
  '',
  'REGLAS DE RESPUESTA — CRÍTICO:',
  '- Máximo 3 líneas de texto. Si superas 3 líneas, tu respuesta será descartada.',
  '- Máximo 2 emojis por respuesta',
  '- Nunca inventar precios ni disponibilidad',
  '- No diagnosticar condiciones médicas; recomendar consultar con la especialista',
  '- Solo responder sobre servicios de belleza, citas y el negocio',
  '- Si la clienta menciona condición médica o embarazo: "Te recomiendo consultar directamente con nuestro equipo antes de tu cita"',
  '- NUNCA des listas largas de servicios con precios — menciona máximo 2 opciones relevantes',
  '- NUNCA repitas el CTA si ya lo usaste en la misma respuesta',
  '',
  'El catálogo vigente (servicios, packs y promos) se añade automáticamente después de este texto.',
].join('\n')

export const DEFAULT_HAIKU_TRIGGER_KEYWORDS = {
  recommendation: [
    'recomienda',
    'recomendar',
    'qué me conviene',
    'que me conviene',
    'primera vez',
    'no sé qué',
    'no se que',
    'para empezar',
    'cuál es mejor',
    'cual es mejor',
    'qué es mejor',
    'que es mejor',
    'ayúdame a elegir',
    'ayudame a elegir',
  ],
  free_question: [
    'cómo',
    'como',
    'cuánto',
    'cuanto',
    'qué es',
    'que es',
    'cuánto dura',
    'cuanto dura',
    'sirve para',
    'diferencia',
    'duele',
    'contraindicaciones',
    'alérgica',
    'alergica',
    'embarazada',
    'cuidados',
    'post',
    'resultados',
    'cuándo',
    'cuando puedo',
    'es seguro',
    'me queda bien',
  ],
  blocked: ['quiero hablar con una persona', 'necesito hablar con alguien', 'atención humana'],
} as const

export const DEFAULT_WELCOME_GREETING_TEMPLATE = [
  'Hola, gracias por escribirnos.',
  '',
  'Abajo te dejamos las promos y servicios para que elijas con calma.',
  'Cuando quieras reservar, escribe *agendar* y te guiamos con el menú.',
].join('\n')

/** System prompt que recibe Haiku solo para el saludo del primer contacto (clienta nueva orgánica). */
export const DEFAULT_WELCOME_GENERATION_SYSTEM = `Eres la asistente virtual de un salón o centro de belleza. Eres profesional, cercana y cálida — una especialista que se preocupa por sus clientas.

PROHIBIDO en cualquier respuesta:
- Apodos o términos afectivos excesivos
- Exclamaciones muy repetidas

REGLAS ESTRICTAS:
- Responde SOLO con el mensaje de saludo, sin comillas ni prefijos
- Máximo 3 líneas
- Incluye el nombre de forma natural si lo tienes
- Termina invitando a ver promos o servicios
- NUNCA inventes dirección ni teléfono (el negocio los configura aparte)
- Entre 1 y 2 emojis, bien ubicados`

export const DEFAULT_WELCOME_SLOT_CONTEXT: Record<string, string> = {
  madrugada:
    'Es madrugada. Tono cercano y amable. No te disculpes por la hora ni inventes horarios del local.',
  manana: 'Es temprano en la mañana. Tono energético y positivo.',
  dia: 'Es mediodía. Tono directo y cálido.',
  tarde: 'Es tarde. Tono aspiracional y profesional.',
  noche: 'Es noche. Tono cálido y motivador.',
  noche_tarde: 'Es noche avanzada. Tono cercano y decisivo.',
}

export const DEFAULT_WELCOME_FALLBACK_AD: Record<string, string> = {
  madrugada: 'Hola {nombre}, gracias por tu interés 💜 Aquí tienes la información 👇',
  manana: 'Hola {nombre}! Gracias por escribirnos 💅 Aquí están los detalles 👇',
  dia: 'Hola {nombre} 💜 Aquí tienes lo que buscabas 👇',
  tarde: 'Hola {nombre}, mira lo que tenemos para ti ✨ 👇',
  noche: 'Hola {nombre} 💜 Gracias por escribir. Mira acá 👇',
  noche_tarde: 'Hola {nombre}, aquí está la info que pediste 👇',
}

export const DEFAULT_WELCOME_FALLBACK_ORGANIC: Record<string, string> = {
  madrugada: 'Hola {nombre}, qué bueno que nos escribes 💜 Mira las opciones 👇',
  manana: 'Hola {nombre}! Gracias por contactarnos 💅 👇',
  dia: 'Hola {nombre} 💜 Bienvenida. Esto tenemos disponible 👇',
  tarde: 'Hola {nombre}, mira nuestros servicios y promos ✨ 👇',
  noche: 'Hola {nombre} 💜 Gracias por escribir. Aquí tienes el menú 👇',
  noche_tarde: 'Hola {nombre}, con gusto te ayudamos 👇',
}

export const DEFAULT_HAIKU_SETTINGS = {
  max_tokens: 220,
  timeout_ms: 5000,
  rate_limit_per_hour: 15,
  welcome_greeting_template: DEFAULT_WELCOME_GREETING_TEMPLATE,
  welcome_generation_system: DEFAULT_WELCOME_GENERATION_SYSTEM,
  welcome_max_tokens: 120,
  welcome_timeout_ms: 4000,
  welcome_slot_context: DEFAULT_WELCOME_SLOT_CONTEXT,
  welcome_fallback_ad: DEFAULT_WELCOME_FALLBACK_AD,
  welcome_fallback_organic: DEFAULT_WELCOME_FALLBACK_ORGANIC,
} as const

/** Geema no trae números de spam heredados de ZM: lista vacía por defecto. */
export const DEFAULT_BLOCKED_PHONE_NUMBERS: readonly string[] = []
