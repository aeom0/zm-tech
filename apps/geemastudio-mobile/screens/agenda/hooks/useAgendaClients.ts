import { useQuery } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'

export interface AgendaClientOption {
  id: string
  name: string
  phone: string | null
  dni: string | null
}

/** Clientes existentes para autocompletar el campo de cliente en Nueva Cita. */
export function useAgendaClients() {
  return useQuery<AgendaClientOption[]>({
    queryKey: ['agenda_clients'],
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, phone, dni')
        .order('name', { ascending: true })
      if (error) throw new Error(error.message)
      return (data ?? []) as AgendaClientOption[]
    },
  })
}
