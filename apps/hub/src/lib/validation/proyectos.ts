import { z } from "zod";
import { HUB_PROJECT_TYPES, HUB_PROJECT_STATUSES } from "@zmtech/hub-schema";

export const proyectoFormSchema = z.object({
  clientId: z.string().uuid().optional().nullable(),
  name: z.string().min(2, "El nombre es obligatorio").max(200),
  slug: z
    .string()
    .min(2, "El slug es obligatorio")
    .max(80)
    .regex(/^[a-z0-9-]+$/, "Solo minúsculas, números y guiones"),
  type: z.enum(HUB_PROJECT_TYPES).default("web"),
  status: z.enum(HUB_PROJECT_STATUSES).default("desarrollo"),
  repoUrl: z.string().url("URL inválida").optional().nullable().or(z.literal("")),
  stack: z.string().optional().nullable(),
  productionUrl: z.string().url("URL inválida").optional().nullable().or(z.literal("")),
  vercelProject: z.string().max(200).optional().nullable(),
  easProject: z.string().max(200).optional().nullable(),
  supabaseRef: z.string().max(40).optional().nullable(),
  version: z.string().max(40).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export type ProyectoFormValues = z.infer<typeof proyectoFormSchema>;
