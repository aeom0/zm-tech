import { useQuery } from '@tanstack/react-query'
import { queryKeys, resolveReferenceImageUrls } from '@geemastudio/data'

import { supabase } from '@/lib/supabase'

/** URLs firmadas (bucket privado) para mostrar las fotos de referencia de una cita. */
export function useReferenceImageUrls(values: readonly string[]) {
  return useQuery({
    queryKey: queryKeys.agenda.referenceImageUrls(values),
    enabled: values.length > 0,
    // Las firmas duran 1 h; se renuevan antes de vencer.
    staleTime: 45 * 60_000,
    queryFn: () => resolveReferenceImageUrls(supabase, values),
  })
}
