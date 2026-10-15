import { anthropicSecrets } from './env.ts'

// Enum chico de Fase 0 (plan 10-PLAN-waba-sales-assistant.md, sección 5).
// Un solo llamado a Haiku por mensaje libre — nada de cascada de regex.
export const WA_INTENTS = ['consultar_producto', 'saludo', 'hablar_con_vendedor', 'otro'] as const

export type WaIntent = (typeof WA_INTENTS)[number]

const INTENT_SET = new Set<string>(WA_INTENTS)

const SYSTEM_PROMPT = `Clasificás el mensaje de un cliente que le escribe por WhatsApp a una repuestería.
Respondé SOLO un JSON con esta forma exacta: {"intent":"<valor>"}
<valor> debe ser uno de: consultar_producto, saludo, hablar_con_vendedor, otro.

Ejemplos:
"hola buenas" -> {"intent":"saludo"}
"tenés pastillas de freno para corolla 2015?" -> {"intent":"consultar_producto"}
"necesito un alternador para hilux" -> {"intent":"consultar_producto"}
"quiero hablar con alguien" -> {"intent":"hablar_con_vendedor"}
"me pueden llamar?" -> {"intent":"hablar_con_vendedor"}
"jaja ok gracias" -> {"intent":"otro"}`

function parseIntentJson(raw: string): WaIntent | null {
  const fenced = raw.match(/```json\s*([\s\S]*?)```/i)?.[1] ?? raw
  const jsonMatch = fenced.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return null

  try {
    const parsed = JSON.parse(jsonMatch[0]) as { intent?: unknown }
    const value = typeof parsed.intent === 'string' ? parsed.intent : null
    return value && INTENT_SET.has(value) ? (value as WaIntent) : null
  } catch {
    return null
  }
}

export async function classifyWaIntent(messageText: string): Promise<WaIntent> {
  const { apiKey } = anthropicSecrets()
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 6500)

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-5-5',
        // Haiku 5.5: el thinking cuenta en max_tokens; effort bajo para clasificar.
        max_tokens: 1024,
        thinking: { type: 'adaptive' },
        output_config: { effort: 'low' },
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: messageText.slice(0, 500) }],
      }),
      signal: controller.signal,
    })

    if (!res.ok) return 'otro'

    const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> }
    // La respuesta puede empezar con bloques `thinking`: leer por type.
    const text = data.content?.find((b) => b.type === 'text')?.text ?? ''
    return parseIntentJson(text) ?? 'otro'
  } catch {
    // Fail-soft: timeout, red caída, JSON inválido — nunca bloquea el flujo.
    return 'otro'
  } finally {
    clearTimeout(timeout)
  }
}
