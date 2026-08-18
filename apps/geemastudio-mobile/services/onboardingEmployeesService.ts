import { supabase } from '@/lib/supabase'

export interface FilaEmpleadoOnboarding {
  name: string
  color: string
}

/**
 * Inserta en `employees` tras el registro (RLS: solo owner/dev autenticados).
 * Usado al cerrar el onboarding, no en el paso 3 (aún sin sesión).
 */
export async function insertEmpleadosTrasOnboarding(
  filas: readonly FilaEmpleadoOnboarding[]
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (filas.length === 0) {
    return { ok: true }
  }

  const payload = filas.map((r) => ({
    name: r.name.trim(),
    color: r.color,
    is_active: true,
  }))

  const { error } = await supabase.from('employees').insert(payload)

  if (error) {
    return { ok: false, message: error.message }
  }

  return { ok: true }
}
