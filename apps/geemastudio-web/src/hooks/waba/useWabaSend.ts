'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'

export interface SendWabaMessageInput {
  phone: string
  message?: string
  imageUrl?: string
  imageCaption?: string
  audioUrl?: string
  documentUrl?: string
  documentName?: string
  pauseBot?: boolean
  resumeBot?: boolean
}

async function invokeSendWhatsapp(input: SendWabaMessageInput) {
  if (!supabase) throw new Error('Supabase no está configurado')
  const { data, error } = await supabase.functions.invoke('send-whatsapp-notification', {
    body: input,
  })
  if (error) throw new Error(error.message ?? 'Error al enviar el mensaje')
  return data
}

export function useSendWabaMessage(phone: string | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: invokeSendWhatsapp,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['web_waba_thread', phone] })
      queryClient.invalidateQueries({ queryKey: ['web_waba_conversations'] })
    },
  })
}

export type StaffSessionAction = 'pause_bot' | 'resume_bot' | 'haiku_finish_booking'

async function invokeStaffSession(input: { phone: string; action: StaffSessionAction }) {
  if (!supabase) throw new Error('Supabase no está configurado')
  const { data, error } = await supabase.functions.invoke('waba-staff-session', {
    body: input,
  })
  if (error) throw new Error(error.message ?? 'Error al actualizar el bot')
  return data
}

export function useWabaStaffSession(phone: string | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: invokeStaffSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['web_waba_conversations'] })
      if (phone) queryClient.invalidateQueries({ queryKey: ['web_waba_thread', phone] })
    },
  })
}
