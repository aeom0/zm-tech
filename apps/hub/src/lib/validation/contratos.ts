import { z } from 'zod'

export const contratoFormSchema = z.object({
  clientId: z.string().uuid('Cliente requerido'),
  projectId: z.string().uuid().optional().nullable(),
  amountUsd: z.coerce.number().min(0, 'Monto no puede ser negativo').optional().nullable(),
  paymentModel: z.string().max(50).default('50/50'),
  monthlySupportUsd: z.coerce.number().min(0, 'Monto no puede ser negativo').optional().nullable(),
  supportActive: z.boolean().default(false),
  startDate: z.string().optional().nullable(),
  deliveredAt: z.string().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
})

export type ContratoFormValues = z.infer<typeof contratoFormSchema>
