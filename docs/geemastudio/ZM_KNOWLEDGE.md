# ZM_KNOWLEDGE_FOR_GEEMASTUDIO.md

> **Propósito**: Contexto técnico extraído de ZM Lash & Nails Beauty (v2.3) para guiar el desarrollo de GeemaStudio. Todo lo aquí documentado está implementado y probado en producción en ZM. Cada módulo debe portarse a GeemaStudio respetando el sistema multi-tenant: sin hardcodes de nombre, color, moneda ni terminología.
>
> **Regla de oro**: Lo que en ZM dice `"chicas"`, `"S/"`, `"#7B2D8E"`, `"ZM Lash"` → en GeemaStudio es `config.terminology.staff`, `config.locale.currency.symbol`, `config.theme.primaryColor`, `config.businessName`.

---

## 1. Estado de ZM vs GeemaStudio

| Módulo / Feature                             | ZM (v2.3)                                            | GeemaStudio (v1.3) | Prioridad de port    |
| -------------------------------------------- | ---------------------------------------------------- | ------------------ | -------------------- |
| Auth Supabase real                           | ✅                                                   | ⚠️ modo dev        | Alta                 |
| Dashboard                                    | ✅ v2.1 (logo real, tappable cards, accesos rápidos) | ✅                 | —                    |
| Agenda modularizada                          | ✅                                                   | ✅                 | —                    |
| Agenda tablet (CalendarGrid + packs)         | ✅ v2.3                                              | Parcial            | Media                |
| Servicios + Packs + Promos por ítems         | ✅                                                   | Parcial            | Media                |
| Finanzas modularizada                        | ✅                                                   | ✅                 | —                    |
| Finanzas: etiqueta pack/servicio en pagos    | ✅ v2.3                                              | ❌                 | Media                |
| Inventario                                   | ✅                                                   | ✅                 | —                    |
| Módulo Clientes (mobile)                     | ✅ v2.0                                              | ✅ v1.3            | —                    |
| MoreHomeScreen con badges                    | ✅ v1.6                                              | ✅ v1.3            | —                    |
| SettingsScreen modular                       | ✅ v2.1                                              | ✅ v1.3            | —                    |
| ThemeContext (Light/Auto/Dark)               | ✅                                                   | ✅ v1.3            | —                    |
| ValidacionPagosScreen                        | ✅                                                   | ❌                 | Media                |
| AsignarProfesionalesScreen                   | ✅                                                   | ❌                 | Media                |
| PromoMasivaScreen (WABA)                     | ✅ v1.8                                              | ❌                 | Baja (requiere WABA) |
| HistorialPromosScreen                        | ✅                                                   | ❌                 | Baja                 |
| Notificaciones push (FCM)                    | ✅                                                   | ✅ parcial         | Media                |
| Bot WABA + Claude Haiku                      | ✅ v1.9–v2.2                                         | ❌                 | Roadmap              |
| Saludo bienvenida Haiku (6 franjas horarias) | ✅ v2.2                                              | ❌                 | Roadmap              |
| UI tablet responsive                         | ✅                                                   | Parcial            | Media                |
| Web /finanzas                                | ✅                                                   | ✅                 | —                    |
| Web /servicios (CRUD)                        | ✅                                                   | ❌                 | Media                |
| Web /panel/waba/mensajes                     | ✅ v2.3                                              | ❌                 | Roadmap              |
| Normalización phone_country/phone_normalized | ✅ v2.1                                              | ❌                 | Media                |
| buildAppointmentWorkLabel (pack_id en citas) | ✅ v2.3                                              | ❌                 | Media                |
| Landing web                                  | ✅                                                   | ✅                 | —                    |
| Sanity CMS                                   | ✅                                                   | ❌                 | Baja                 |

---

## 2. Arquitectura de BD (schema compartido)

Tablas activas en ZM con sus relaciones clave. En GeemaStudio usar el mismo schema base.

```
profiles           → id = auth.users.id, role (dev|owner|staff), employee_id
employees          → id, name, email, color (hex), commission_percentage, is_active, notes,
                     commission_mode (`percent` | `fixed_house`), house_cut_fixed (S/ por línea;
                     Alejandra = fixed_house 50 — Vanessa retiene S/50; profesional el resto),
                     avatar_url (Storage bucket `employee-avatars`, publico; agregado a la tabla
                     real de ZM el 30-ago-2026 — antes solo existia en tenants Geema-nativos),
                     payment_mode/salary_amount (solo dialecto 'geema', ver employeesAdapter.ts)
                     -- Prod ZM (04-sep-2026): Vanessa, Stephani, Karelis (ex Chica Externa /
                     emp-romina), Alejandra (micro). WABA carril Karelis post-1pm sin cambio.
service_categories → id, name, color (hex), icon, order
services           → id, name, category_id→service_categories, price, duration, is_active
clients            → id, name, phone, email, notes, created_at,
                     phone_country (text, código país, ej. "51"),
                     phone_normalized (text, número sin código, ej. "932535512")
                     -- clave única de búsqueda: phone_country + phone_normalized
appointments       → id, client_id→clients, client_name, client_phone, employee_id→employees,
                     service_id→services (legacy), date, duration, price, status, notes,
                     created_at, completed_at
appointment_services → id, appointment_id→appointments, service_id→services,
                       employee_id→employees, price, duration,
                       pack_id→packs (nullable — agrupa líneas del mismo pack)
payments           → id, appointment_id→appointments, employee_id→employees,
                     amount, method, date, is_abono, service_total
inventory_items    → id, name, category, quantity, min_stock, unit, price, notes
tenant_settings    → id, key, value, created_at (RLS: solo dev/owner)

-- Módulo Promos (ZM v1.5+):
promotions         → id, title, description, badge, accent_color, service_ids[], promo_price,
                     is_active, expires_at
promotion_items    → id, promo_id→promotions, item_type (service|pack), item_id,
                     quantity, discounted_price
packs              → id, name, description, price, service_ids[], is_active

-- Módulo Promos Masivas (ZM v1.8):
promo_broadcasts      → id, name, promo_text, image_url, status, sent_at, created_by
promo_broadcast_items → id, broadcast_id, client_id, phone, status, sent_at, error

-- Bot WABA:
whatsapp_sessions     → phone_number, state (json), updated_at
appointment_verifications → id, appointment_id, screenshot_url, status, submitted_at
cart_items            → id, session_phone, item_type (service|pack), item_id,
                         quantity, price, created_at
```

### Gotcha crítico: Joins encadenados PostgREST

**NUNCA** hacer joins profundos en una sola query PostgREST — devuelven vacío silencioso.

```typescript
// ❌ INCORRECTO — devuelve [] silenciosamente
const { data } = await supabase
  .from('clients')
  .select(`*, appointments(*, payments(*), appointment_services(*, services(*)))`)

// ✅ CORRECTO — 3 queries separadas + combinar en memoria
const { data: clients } = await supabase.from('clients').select('*')
const { data: appointments } = await supabase
  .from('appointments')
  .select('id, client_id, date, status, price')
  .in(
    'client_id',
    clients.map((c) => c.id)
  )
const { data: payments } = await supabase
  .from('payments')
  .select('appointment_id, amount')
  .in(
    'appointment_id',
    appointments.map((a) => a.id)
  )
// → combinar en JS
```

---

## 3. Módulo Clientes (implementado en ZM v2.0)

### Estructura de archivos (en ZM)

```
apps/mobile/screens/clients/
├── types.ts
├── hooks/
│   ├── useClientsData.ts      # lista enriquecida + KPIs (3 queries separadas)
│   └── useClientDetail.ts     # historial de citas de un cliente
└── components/
    ├── ClientsHeader.tsx       # búsqueda + contador
    ├── ClientKPIStrip.tsx      # scroll horizontal, 4 KPI cards + top spender
    ├── ClientFilterBar.tsx     # chips segmento + chips categoría favorita
    ├── ClientCard.tsx          # tarjeta con avatar, métricas y badges
    ├── ClientDetailModal.tsx   # modal bottom-sheet con historial y notas editables
    └── ClientAppointmentRow.tsx
apps/mobile/screens/ClientsScreen.tsx   # orquestador (también como ClientesScreen)
```

### Tipos clave

```typescript
export interface ClientEnriched extends ClientRow {
  total_appointments: number
  total_spent: number
  last_visit: string | null
  favorite_category: string | null
  favorite_category_color: string | null
  days_since_last_visit: number | null
  days_until_next_visit: number | null
  is_at_risk: boolean // sin visita >45 días (y no es nuevo)
  is_new: boolean // created_at en los últimos 30 días
  is_vip: boolean // ≥3 citas completadas
}

export interface ClientsKPIs {
  total_clients: number
  vip_count: number
  new_this_month: number
  at_risk_count: number
  top_spender: { name: string; total: number } | null
}

export type ClientSortKey = 'ultima_visita' | 'nombre' | 'total_gastado' | 'mas_citas'
export type ClientSegmentFilter = 'todos' | 'vip' | 'nuevos' | 'en_riesgo'
```

### Lógica de segmentación (en `useClientsData`)

```typescript
// Pasos: clients → appointments → payments → enriquecer en memoria
const isVip = cApts.length >= 3
const isNew = createdAt >= thirtyDaysAgo
const isAtRisk = !isNew && daysUntilNext == null && (daysSince == null || daysSince > 45)
```

### `useClientDetail` — historial individual

```typescript
// Fetch: appointments del cliente con joins de 1 nivel (no encadenar más)
// appointments con employees(name, color) y appointment_services(service_id, services(name, category))
// Luego fetch payments separado con .in('appointment_id', aptIds)
// Calcular: total_paid, pending_amount = price - total_paid
```

### Adaptación para GeemaStudio

```typescript
// ✅ Usar siempre:
const { config } = useTenant()
const currencySymbol = config.locale.currency.symbol
const staffLabel = config.terminology.staff

// Para formatear moneda en cards:
formatCurrency(client.total_spent, config) // en vez de fmtSoles()

// Label "X clientes" — usar término neutro, NO "clientas"
```

---

## 4. MoreHomeScreen con badges (ZM v1.6 → GeemaStudio v1.3)

### Queries de badges (ambas con `refetchInterval: 60_000`, `enabled: isAdmin`)

```typescript
// Badge 1: Validaciones pendientes
const { data: pendingCount = 0 } = useQuery({
  queryKey: ['pending_verifications_count'],
  queryFn: async () => {
    const { count } = await supabase
      .from('appointment_verifications')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'payment_submitted')
    return count ?? 0
  },
})

// Badge 2: Citas sin asignar (próximos 7 días, zona horaria del tenant)
const { data: unassignedCount = 0 } = useQuery({
  queryKey: ['unassigned_appointments_count', start, end],
  queryFn: async () => {
    const { count } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .gte('date', start)
      .lt('date', end)
      .neq('status', 'cancelled')
      .is('employee_id', null)
    return count ?? 0
  },
})
```

---

## 5. SettingsScreen modular (ZM → GeemaStudio v1.3)

### `ThemeContext` (implementado en ZM)

```typescript
// apps/mobile/contexts/ThemeContext.tsx
export type ThemePreference = 'auto' | 'light' | 'dark'
// AsyncStorage key usa @geemastudio/theme_preference

export function ThemeProvider({ children }: { children: React.ReactNode })
export function useThemePreference(): { preference; resolved; setPreference }
```

### `TokenWarningBanner` — adaptación para GeemaStudio

```typescript
// GeemaStudio (dinámico desde TenantConfig):
const { config } = useTenant()
const expiryStr = config.integrations?.waba?.tokenExpiry
if (!expiryStr || !config.features?.whatsapp) return null
const WABA_TOKEN_EXPIRY = new Date(expiryStr)
```

Lógica de colores:

```
daysLeft > 30  → no mostrar
daysLeft 8–30  → naranja (#FB923C)
daysLeft 1–7   → amarillo urgente (#F59E0B)
daysLeft ≤ 0   → rojo crítico (#EF4444)
```

---

## 6. ValidacionPagosScreen (ZM — pendiente en GeemaStudio)

### Patrón de aprobación (evitar spinner global)

```typescript
const [approvingId, setApprovingId] = useState<string | null>(null)

const handleApprove = async (verificationId: string, appointmentId: string) => {
  setApprovingId(verificationId)
  try {
    await supabase.from('appointments').update({ status: 'confirmed' }).eq('id', appointmentId)
    sendWAMessages(appointmentId, clientPhone).catch(console.error)
    queryClient.invalidateQueries({ queryKey: ['pending_verifications_count'] })
  } finally {
    setApprovingId(null)
  }
}
```

---

## 7. AsignarProfesionalesScreen (ZM: AsignarChicasScreen)

```typescript
// Cálculo del rango (7 días desde hoy en zona horaria del tenant)
const { config } = useTenant()
const tzOffset = getTimezoneOffset(config.locale.timezone)
const offsetMs = tzOffset * 60 * 60 * 1000
```

---

## 8. Bot WABA con Claude Haiku (ZM v1.9–v2.2 — roadmap GeemaStudio)

### Configuración del modelo

```typescript
// Modelo: claude-haiku-4-5-20251001
// max_tokens: 350 (respuestas), 120 (saludos)
// Timeout: 5s (respuestas), 4s (saludos)
// Secret: ANTHROPIC_API_KEY en Supabase
```

### System prompt dinámico

```typescript
// buildSystemPrompt() carga desde BD:
// - Categorías activas, servicios, packs, promos activas
// En GeemaStudio: toda info hardcodeada debe venir de TenantConfig
```

---

## 9. Finanzas — Desglose por profesional

```typescript
// Modo percent (Stephani, Karelis, …):
const empleadoGana = generado * (employee.commission_percentage / 100)

// Modo fixed_house (Alejandra): por cada línea de appointment_services
const house = Math.min(employee.house_cut_fixed ?? 0, linePrice) // ej. S/50
const profesionalGana = linePrice - house
// Los `house` se acumulan en la comisión de Vanessa (owner / emp-vanessa)
```

UI: Personal → selector % vs fijo casa; Finanzas → `EmployeeBreakdown` muestra etiqueta de corte.

---

## 10. Notificaciones Push (FCM v1)

```typescript
// Edge Function send-notification debe deployarse con --no-verify-jwt
// Body: { user_id?, user_ids?, title, body, data? }
// Tokens FCM nativo (fXXXX...) — NO Expo Push tokens en producción
```

---

## 11. Patrones y gotchas críticos

### React Query v5

```typescript
useQuery({ queryKey: ['key'], queryFn: async () => ... })
queryClient.invalidateQueries({ queryKey: ['key'] })
```

### CORS en Edge Functions

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
```

### Drizzle ORM vs SQL directo

```typescript
// Migraciones additive → SQL directo (scripts/db/)
// Schema nuevo → Drizzle
```

---

## 12. TenantConfig — campos que GeemaStudio debe tener

```typescript
interface TenantConfig {
  businessName: string
  businessType: 'spa-nails' | 'barbershop' | 'hair-salon' | 'full-aesthetic'
  theme: { primaryColor: string; accentColor: string }
  locale: {
    language: string // 'es-VE' | 'es-MX' | 'pt-BR' | etc.
    timezone: string // 'America/Lima' | 'America/Bogota' | etc.
    currency: { symbol: string; code: string }
  }
  terminology: { staff: string; staffSingular: string }
  features?: { whatsapp?: boolean; inventory?: boolean; commissions?: boolean }
  integrations?: { waba?: { tokenExpiry?: string } }
  schedule?: {
    weekdays: { open: string; close: string }
    sunday: { open: string; close: string } | null
  }
}
```

---

## 13. Checklist de port — nuevas pantallas

Al portear cualquier pantalla de ZM a GeemaStudio, verificar:

- [ ] `fmtSoles()` → `formatCurrency(amount, config)`
- [ ] `"S/"` hardcodeado → `config.locale.currency.symbol`
- [ ] `"chicas"` → `config.terminology.staff` (singular: `config.terminology.staffSingular`)
- [ ] `"ZM Lash"` → `config.businessName`
- [ ] `"#7B2D8E"` → `theme.primary`
- [ ] `"es-PE"` → `config.locale.language`
- [ ] Lima UTC-5 hardcodeado → `config.locale.timezone`
- [ ] AsyncStorage key `@zm_*` → `@geemastudio/*`
- [ ] Links hardcodeados (WhatsApp, Instagram) → `config.contact.*`

---

_Generado: marzo 2026 — actualizado: abril 2026 — basado en ZM Lash & Nails v2.3_
_Para actualizar: extraer desde el proyecto ZM en claude.ai y reemplazar este archivo_
