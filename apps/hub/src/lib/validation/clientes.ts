import { z } from "zod";
import {
  HUB_CLIENT_STATUSES,
  HUB_CLIENT_SOURCES,
  HUB_VERTICALS,
} from "@zmtech/hub-schema";

export const clienteFormSchema = z.object({
  name: z.string().min(2, "El nombre es obligatorio").max(200),
  contactName: z.string().max(200).optional().nullable(),
  email: z.string().email("Correo inválido").optional().nullable().or(z.literal("")),
  phone: z.string().max(30).optional().nullable(),
  whatsapp: z.string().max(30).optional().nullable(),
  country: z.string().max(80).optional().nullable(),
  city: z.string().max(80).optional().nullable(),
  vertical: z.enum(HUB_VERTICALS).default("otro"),
  status: z.enum(HUB_CLIENT_STATUSES).default("activo"),
  source: z.enum(HUB_CLIENT_SOURCES).default("directo"),
  sourceContactId: z.string().uuid().optional().nullable(),
  sourceQuoteLeadId: z.string().uuid().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export type ClienteFormValues = z.infer<typeof clienteFormSchema>;
