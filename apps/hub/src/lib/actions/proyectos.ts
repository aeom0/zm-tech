'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { proyectoFormSchema, type ProyectoFormValues } from '@/lib/validation/proyectos'
import type { ActionResult } from './clientes'

function stackDesdeString(raw: string | null | undefined): string[] {
  if (!raw) return []
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

export async function crearProyecto(
  values: ProyectoFormValues
): Promise<ActionResult<{ id: string }>> {
  const parsed = proyectoFormSchema.safeParse(values)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? 'Datos inválidos' }
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('hub_projects')
    .insert({
      client_id: parsed.data.clientId ?? null,
      name: parsed.data.name,
      slug: parsed.data.slug,
      type: parsed.data.type,
      status: parsed.data.status,
      repo_url: parsed.data.repoUrl || null,
      stack: stackDesdeString(parsed.data.stack),
      production_url: parsed.data.productionUrl || null,
      vercel_project: parsed.data.vercelProject ?? null,
      eas_project: parsed.data.easProject ?? null,
      supabase_ref: parsed.data.supabaseRef ?? null,
      version: parsed.data.version ?? null,
      notes: parsed.data.notes ?? null,
    })
    .select('id')
    .single()

  if (error) {
    return { ok: false, error: error.message }
  }

  revalidatePath('/proyectos')
  return { ok: true, data: { id: data.id as string } }
}

export async function actualizarProyecto(
  id: string,
  values: ProyectoFormValues
): Promise<ActionResult> {
  const parsed = proyectoFormSchema.safeParse(values)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? 'Datos inválidos' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('hub_projects')
    .update({
      client_id: parsed.data.clientId ?? null,
      name: parsed.data.name,
      slug: parsed.data.slug,
      type: parsed.data.type,
      status: parsed.data.status,
      repo_url: parsed.data.repoUrl || null,
      stack: stackDesdeString(parsed.data.stack),
      production_url: parsed.data.productionUrl || null,
      vercel_project: parsed.data.vercelProject ?? null,
      eas_project: parsed.data.easProject ?? null,
      supabase_ref: parsed.data.supabaseRef ?? null,
      version: parsed.data.version ?? null,
      notes: parsed.data.notes ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    return { ok: false, error: error.message }
  }

  revalidatePath('/proyectos')
  revalidatePath(`/proyectos/${id}`)
  return { ok: true, data: null }
}
