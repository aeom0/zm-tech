# ZM_KNOWLEDGE_FOR_SALONPRO.md

> **Propósito**: Contexto técnico extraído de ZM Lash & Nails Beauty (v2.3) para guiar el desarrollo de SalonPro. Todo lo aquí documentado está implementado y probado en producción en ZM. Cada módulo debe portarse a SalonPro respetando el sistema multi-tenant: sin hardcodes de nombre, color, moneda ni terminología.
>
> **Regla de oro**: Lo que en ZM dice `"chicas"`, `"S/"`, `"#7B2D8E"`, `"ZM Lash"` → en SalonPro es `config.terminology.staff`, `config.locale.currency.symbol`, `config.theme.primaryColor`, `config.businessName`.

---

## 1. Estado de ZM vs SalonPro

| Módulo / Feature | ZM (v2.3) | SalonPro (v1.3) | Prioridad de port |
|---|---|---|---|
| Auth Supabase real | ✅ | ⚠️ modo dev | Alta |
| Dashboard | ✅ v2.1 (logo real, tappable cards, accesos rápidos) | ✅ | — |
| Agenda modularizada | ✅ | ✅ | — |
| Agenda tablet (CalendarGrid + packs) | ✅ v2.3 | Parcial | Media |
| Servicios + Packs + Promos por ítems | ✅ | Parcial | Media |
| Finanzas modularizada | ✅ | ✅ | — |
| Finanzas: etiqueta pack/servicio en pagos | ✅ v2.3 | ❌ | Media |
| Inventario | ✅ | ✅ | — |
| Módulo Clientes (mobile) | ✅ v2.0 | ✅ v1.3 | — |
| MoreHomeScreen con badges | ✅ v1.6 | ✅ v1.3 | — |
| SettingsScreen modular | ✅ v2.1 | ✅ v1.3 | — |
| ThemeContext (Light/Auto/Dark) | ✅ | ✅ v1.3 | — |
| ValidacionPagosScreen | ✅ | ❌ | Media |
| AsignarProfesionalesScreen | ✅ | ❌ | Media |
| PromoMasivaScreen (WABA) | ✅ v1.8 | ❌ | Baja (requiere WABA) |
| HistorialPromosScreen | ✅ | ❌ | Baja |
| Notificaciones push (FCM) | ✅ | ✅ parcial | Media |
| Bot WABA + Claude Haiku | ✅ v1.9–v2.2 | ❌ | Roadmap |
| Saludo bienvenida Haiku (6 franjas horarias) | ✅ v2.2 | ❌ | Roadmap |
| UI tablet responsive | ✅ | Parcial | Media |
| Web /finanzas | ✅ | ✅ | — |
| Web /servicios (CRUD) | ✅ | ❌ | Media |
| Web /panel/waba/mensajes | ✅ v2.3 | ❌ | Roadmap |
| Normalización phone_country/phone_normalized | ✅ v2.1 | ❌ | Media |
| buildAppointmentWorkLabel (pack_id en citas) | ✅ v2.3 | ❌ | Media |
| Landing web | ✅ | ✅ | — |
| Sanity CMS | ✅ | ❌ | Baja |

---

## 2. Arquitectura de BD (schema compartido)

Tablas activas en ZM con sus relaciones clave. En SalonPro usar el mismo schema base.

```
profiles           → id = auth.users.id, role (dev|owner|staff), employee_id
employees          → id, name, email, color (hex), commission_percentage, is_active, notes
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
  .select(`*, appointments(*, payments(*), appointment_services(*, services(*)))`);

// ✅ CORRECTO — 3 queries separadas + combinar en memoria
const { data: clients } = await supabase.from('clients').select('*');
const { data: appointments } = await supabase.from('appointments')
  .select('id, client_id, date, status, price')
  .in('client_id', clients.map(c => c.id));
const { data: payments } = await supabase.from('payments')
  .select('appointment_id, amount')
  .in('appointment_id', appointments.map(a => a.id));
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
  total_appointments: number;
  total_spent: number;
  last_visit: string | null;
  favorite_category: string | null;
  favorite_category_color: string | null;
  days_since_last_visit: number | null;
  days_until_next_visit: number | null;
  is_at_risk: boolean;    // sin visita >45 días (y no es nuevo)
  is_new: boolean;        // created_at en los últimos 30 días
  is_vip: boolean;        // ≥3 citas completadas
}

export interface ClientsKPIs {
  total_clients: number;
  vip_count: number;
  new_this_month: number;
  at_risk_count: number;
  top_spender: { name: string; total: number } | null;
}

export type ClientSortKey = 'ultima_visita' | 'nombre' | 'total_gastado' | 'mas_citas';
export type ClientSegmentFilter = 'todos' | 'vip' | 'nuevos' | 'en_riesgo';
```

### Lógica de segmentación (en `useClientsData`)

```typescript
// Pasos: clients → appointments → payments → enriquecer en memoria
const isVip = cApts.length >= 3;
const isNew = createdAt >= thirtyDaysAgo;
const isAtRisk = !isNew && daysUntilNext == null && (daysSince == null || daysSince > 45);
```

### `useClientDetail` — historial individual

```typescript
// Fetch: appointments del cliente con joins de 1 nivel (no encadenar más)
// appointments con employees(name, color) y appointment_services(service_id, services(name, category))
// Luego fetch payments separado con .in('appointment_id', aptIds)
// Calcular: total_paid, pending_amount = price - total_paid
```

### Navegación

- Accesible desde `MoreStackNavigator` → ruta `"Clientes"` (solo admin)
- En ZM también como tab en `MainTabNavigator` (experimental)
- Badge en `MoreHomeScreen` no implementado (item sin badge, a diferencia de ValidacionPagos)

### Adaptación para SalonPro

```typescript
// ✅ Usar siempre:
const { config } = useTenant();
const currencySymbol = config.locale.currency.symbol;
const staffLabel = config.terminology.staff;

// Para formatear moneda en cards:
formatCurrency(client.total_spent, config)   // en vez de fmtSoles()

// Label "X clientes" — usar término neutro, NO "clientas"
```

---

## 4. MoreHomeScreen con badges (ZM v1.6 → SalonPro v1.3)

### Queries de badges (ambas con `refetchInterval: 60_000`, `enabled: isAdmin`)

```typescript
// Badge 1: Validaciones pendientes
const { data: pendingCount = 0 } = useQuery({
  queryKey: ["pending_verifications_count"],
  queryFn: async () => {
    const { count } = await supabase
      .from("appointment_verifications")
      .select("*", { count: "exact", head: true })
      .eq("status", "payment_submitted");
    return count ?? 0;
  },
});

// Badge 2: Citas sin asignar (próximos 7 días, zona horaria Lima UTC-5)
// En SalonPro: usar la zona horaria del tenant desde config.locale.timezone
const { data: unassignedCount = 0 } = useQuery({
  queryKey: ["unassigned_appointments_count", start, end],
  queryFn: async () => {
    const { count } = await supabase
      .from("appointments")
      .select("*", { count: "exact", head: true })
      .gte("date", start)
      .lt("date", end)
      .neq("status", "cancelled")
      .is("employee_id", null);
    return count ?? 0;
  },
});
```

### Orden del menú Más en ZM

```
[ADMINISTRACIÓN] (solo dev/owner):
  1. Enviar promo WA          → PromoMasiva   (sin badge)
  2. Validación de Pagos      → ValidacionPagos  (badge: pendingCount)
  3. Asignar chicas           → AsignarChicas  (badge: unassignedCount)
  4. Finanzas                 → Finanzas
  5. Chicas                   → Chicas (Personal)
  6. Clientas                 → Clientes
  7. Inventario               → Inventario

[CUENTA Y PREFERENCIAS] (todos):
  8. Configuración            → Configuracion
  9. Cerrar sesión            (destructivo)
```

### Adaptación para SalonPro

```typescript
// Terminología dinámica:
label={`Asignar ${config.terminology.staff}`}   // "Asignar Profesionales"
label={config.terminology.staff}                 // "Profesionales"

// Promo WA solo si la feature está activa:
{config.features?.whatsapp && isAdmin && (
  <MenuRow icon="send" label="Enviar promo WA" ... />
)}
```

### Tab bar badge (en `MainTabNavigator`)

```typescript
// El tab "Más" muestra badge con pendingCount
<Tab.Screen
  name="More"
  options={{
    tabBarBadge: pendingCount > 0 ? pendingCount : undefined,
  }}
/>
// La query pendingCount debe vivir en MainTabNavigator o en un hook compartido
```

---

## 5. SettingsScreen modular (ZM → SalonPro v1.3)

### Estructura de archivos

```
apps/mobile/screens/settings/
├── SettingsScreen.tsx
├── hooks/
│   └── useAppInfo.ts          # version, runtimeVersion, channel, OTA status
└── components/
    ├── SettingSection.tsx     # contenedor con título + footer opcional
    ├── SettingRow.tsx         # fila genérica (variant: 'value' | 'navigate' | 'action')
    ├── BuildInfoCard.tsx      # info técnica copiable (solo admin)
    ├── OtaUpdateRow.tsx       # fila con status OTA + botón manual
    ├── ThemeRow.tsx           # segmented control Light/Auto/Dark
    └── TokenWarningBanner.tsx # banner expiración WABA (solo si WABA activo)
```

### `ThemeContext` (implementado en ZM)

```typescript
// apps/mobile/contexts/ThemeContext.tsx
export type ThemePreference = "auto" | "light" | "dark";
const STORAGE_KEY = "@zm_theme_preference";  // → cambiar a "@salonpro/theme_preference"

// En SalonPro: reemplazar STORAGE_KEY y exportar igual
export function ThemeProvider({ children }: { children: React.ReactNode })
export function useThemePreference(): { preference, resolved, setPreference }
```

```typescript
// apps/mobile/hooks/useColorScheme.ts — sobrescribe el hook de Expo
import { useThemePreference } from "@/contexts/ThemeContext";
export function useColorScheme(): "light" | "dark" {
  const { resolved } = useThemePreference();
  return resolved;
}
```

```typescript
// En App.tsx — orden de providers:
<TenantProvider>
  <ThemeProvider>         // ← wrappea todo lo que usa useTheme()
    <QueryClientProvider>
      <AuthProvider>
        ...
```

### `TokenWarningBanner` — adaptación para SalonPro

En ZM la fecha está hardcodeada. En SalonPro debe venir del tenant:

```typescript
// ZM (hardcodeado — NO hacer esto en SalonPro):
const WABA_TOKEN_EXPIRY = new Date("2026-04-30T00:00:00-05:00");

// SalonPro (dinámico desde TenantConfig):
const { config } = useTenant();
const expiryStr = config.integrations?.waba?.tokenExpiry;
if (!expiryStr || !config.features?.whatsapp) return null;
const WABA_TOKEN_EXPIRY = new Date(expiryStr);
```

Lógica de colores del banner:
```
daysLeft > 30  → no mostrar
daysLeft 8–30  → naranja (#FB923C)
daysLeft 1–7   → amarillo urgente (#F59E0B)
daysLeft ≤ 0   → rojo crítico (#EF4444)
```

### `BuildInfoCard` — datos que muestra

```typescript
interface AppInfo {
  appVersion: string;       // Constants.expoConfig.version
  runtimeVersion: string;   // Updates.runtimeVersion
  channel: string;          // Updates.channel ?? "development"
  otaId: string | null;     // Updates.updateId
  otaShort: string | null;  // otaId?.slice(0, 8)
  isEmbedded: boolean;      // !Updates.isEmbeddedLaunch
}
```

### Secciones en SettingsScreen

Para SalonPro, reemplazar sección "Salón" (que en ZM tiene dirección y redes sociales hardcodeadas) por una sección "Negocio" con datos del tenant:

```typescript
// ZM (hardcodeado — NO en SalonPro):
<SettingRow label="Dirección" value="CC. Las Plazuelas, Surco" />

// SalonPro (dinámico):
<SettingRow label="Nombre" value={config.businessName} />
<SettingRow label="Tipo" value={config.businessType} />
<SettingRow label="Moneda" value={config.locale.currency.symbol} />
```

---

## 6. ValidacionPagosScreen (ZM — pendiente en SalonPro)

### Flujo completo

1. Admin ve lista de citas con `status = 'payment_submitted'`
2. Cada fila muestra: cliente, servicio, fecha, screenshot del pago (imagen)
3. Botón "Aprobar" por fila:
   - UPDATE `appointments.status = 'confirmed'`
   - UPDATE `appointment_verifications.status = 'approved'`
   - INSERT en `payments` (monto del abono)
   - Envía 4 mensajes WA al cliente en background (confirmación + políticas + imagen Tardanzas)
4. Badge en tab Más y en item de menú

### Patrón de aprobación (evitar spinner global)

```typescript
// Estado: un ID por fila, no booleano global
const [approvingId, setApprovingId] = useState<string | null>(null);

const handleApprove = async (verificationId: string, appointmentId: string) => {
  setApprovingId(verificationId);
  try {
    // 1. UPDATE BD (rápido ~200ms)
    await supabase.from('appointments').update({ status: 'confirmed' }).eq('id', appointmentId);
    // 2. Envío WA en background (no bloquear UI)
    sendWAMessages(appointmentId, clientPhone).catch(console.error);
    // 3. Invalidar queries
    queryClient.invalidateQueries({ queryKey: ['pending_verifications_count'] });
  } finally {
    setApprovingId(null);
  }
};
```

### Token para llamadas a Edge Functions desde mobile

```typescript
// Usar getSession() (no refreshSession — más rápido, sin riesgo de colgarse)
const { data: { session } } = await supabase.auth.getSession();
const token = session?.access_token;
```

### Tabla `appointment_verifications`

```sql
CREATE TABLE appointment_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid REFERENCES appointments(id),
  screenshot_url text,
  status text DEFAULT 'payment_submitted',  -- payment_submitted | approved | rejected
  submitted_at timestamptz DEFAULT now()
);
```

---

## 7. AsignarProfesionalesScreen (ZM: AsignarChicasScreen)

### Funcionalidad

- Lista de citas sin `employee_id` en los próximos 7 días
- Por cada cita: dropdown de profesionales disponibles (del horario de ese día)
- Al asignar: UPDATE `appointments.employee_id`
- Invalida queries `unassigned_appointments_count` y `agenda_appointments`

### Cálculo del rango (7 días desde hoy en zona horaria del negocio)

```typescript
// En ZM está hardcodeado para Lima (UTC-5):
const limaOffsetMs = -5 * 60 * 60 * 1000;
// En SalonPro: usar config.locale.timezone
// Ejemplo genérico:
const tzOffset = getTimezoneOffset(config.locale.timezone); // en horas
const offsetMs = tzOffset * 60 * 60 * 1000;
```

---

## 8. Módulo Servicios — Packs y Promos por ítems (ZM v1.5)

### Modelo de datos

```
promotions       → metadata de la promo (título, descripción, badge, fechas)
promotion_items  → ítems que componen la promo (service o pack, quantity, precio rebajado)
packs            → agrupaciones de servicios con precio único
```

### Hook `usePromotionItems`

```typescript
// Calcula el total de una promo sumando sus promotion_items
function getPromoTotalFromItems(items: PromotionItem[], promoId: string): number {
  return items
    .filter(i => i.promo_id === promoId)
    .reduce((sum, i) => sum + (i.discounted_price * i.quantity), 0);
}
```

### Límites WABA para títulos/descripciones

```
title (list row title):       máx 24 chars   ← límite real Meta
description (list row desc):  máx 72 chars
```

Implementar contadores visibles en `PromoModal` y `ServicesScreen`.

---

## 9. Finanzas — Desglose por profesional

### Lógica de comisiones

```typescript
// commission_percentage viene de employees.commission_percentage
// Para cada pago:
const empleadoGana = pago.amount * (employee.commission_percentage / 100);
const salonGana    = pago.amount * (1 - employee.commission_percentage / 100);
```

### Vistas por rol

- `dev/owner`: ve todos los profesionales, desglose completo
- `staff`: ve solo "Mis ganancias" (filtrado por `employee_id` del perfil)

### RLS para staff en payments

```sql
-- Staff puede SELECT sus propios pagos:
CREATE POLICY "staff_own_payments" ON payments
  FOR SELECT USING (
    employee_id = (SELECT employee_id FROM profiles WHERE id = auth.uid())
  );
```

---

## 10. Notificaciones Push (FCM v1)

### Flujo

1. Al abrir la app: `getDevicePushTokenAsync()` → guarda token en `profiles.push_token`
2. Al crear/asignar cita: trigger DB `trg_notify_appointment_assigned` → llama Edge Function `send-notification`
3. Edge Function `send-notification`: POST a FCM v1 con `FCM_SERVICE_ACCOUNT` secret

### Edge Function `send-notification`

```typescript
// Body esperado:
{ user_id?: string, user_ids?: string[], title: string, body: string, data?: object }

// Debe deployarse con --no-verify-jwt (la llama el trigger DB, no un usuario):
// supabase functions deploy send-notification --no-verify-jwt
```

### Tokens: FCM vs Expo Push

| Token | Formato | Cuándo usar |
|---|---|---|
| FCM nativo | `fXXXX...` | App actual (Expo SDK 54 con bare workflow o EAS) |
| Expo Push | `ExponentPushToken[...]` | Solo si se usa Expo Go — NO en producción |

---

## 11. Promos Masivas por WhatsApp (ZM v1.8 — roadmap SalonPro)

### Pantalla `PromoMasivaScreen` — stepper 5 pasos

```
Paso 1: Configurar promo (texto + imagen)
Paso 2: Seleccionar clientas (segmento: todas / VIP / nuevas / en riesgo)
Paso 3: Preview (cuántas clientas, imagen, texto)
Paso 4: Enviando (barra de progreso polling)
Paso 5: Resultado (enviadas / fallidas)
```

### Edge Function `send-promo-whatsapp`

```typescript
// Body: { broadcastId: string }
// Lee promo_broadcasts + promo_broadcast_items
// Por cada ítem: POST a WABA con plantilla promo_zm_v1 (en ZM)
// En SalonPro: plantilla configurable desde tenant_settings

// Plantilla WABA esperada:
// Header: image (media_id cacheado en tenant_settings)
// Body: {{1}} nombre cliente, {{2}} texto de promo
```

### Segmentación de clientes para promos

```typescript
// Usar misma lógica de useClientsData pero sin búsqueda ni sort
// Segmento → filtro:
'todas'    → sin filtro
'vip'      → is_vip === true (≥3 citas)
'nuevas'   → is_new === true (<30 días)
'en_riesgo'→ is_at_risk === true (>45 días sin visita)
```

---

## 12. Web Panel `/servicios` (ZM — pendiente en SalonPro)

### CRUD completo desde Next.js

```
/servicios
  ├── Categorías (create, edit, reorder)
  ├── Servicios por categoría (create, edit, toggle active, precio con coma decimal)
  ├── Packs (create, edit, seleccionar servicios)
  └── Promos (create, edit, añadir ítems desde service/pack)
```

### Patrón precio con coma decimal

```typescript
// Input acepta "," como separador decimal (comportamiento LATAM)
// Normalizar antes de guardar:
const normalizedPrice = inputValue.replace(',', '.');
const price = parseFloat(normalizedPrice);
```

---

## 13. Bot WABA con Claude Haiku (ZM v1.9–v2.2 — roadmap SalonPro)

### Arquitectura del asistente IA

El bot WABA tiene dos capas:
1. **Flujo determinístico** — siempre tiene prioridad (agendado, carrito, menú, pagos)
2. **Asistente Haiku** — actúa solo en `session.step === "browsing"` cuando el mensaje es texto libre no reconocido

```
supabase/functions/whatsapp-webhook/handlers/ai-assistant.ts
  ├── detectAITrigger()         # clasifica el mensaje: null | 'recommendation' | 'free_question' | 'fallback'
  ├── buildSystemPrompt()       # construye el prompt desde la BD (categorías, servicios, packs, promos)
  ├── getClientContext()        # últimas 5 citas completadas de la clienta
  ├── callAnthropicAPI()        # POST a Anthropic con timeout 5s
  ├── generateWelcomeGreeting() # saludo personalizado al inicio (timeout 4s, max_tokens=120)
  └── getFallbackGreeting()     # hardcodeado por franja si Haiku falla
```

### `detectAITrigger()` — cuándo NO llamar a IA

```typescript
// Retorna null (no IA) para:
// - Prefijos interactivos: cat-, svc-, pack_, promo_, date_, time_, subcat_
// - Palabras del flujo determinístico: saludos, promos, servicios, agendar, carrito, menú
// - Mensajes ≤3 chars
// - Números solos (selección de lista)

// Retorna tipo cuando:
// 'recommendation'  → "recomiéndame", "primera vez", "cuál es mejor"...
// 'free_question'   → "cómo", "cuánto dura", "embarazada", "cuidados"...
// 'fallback'        → cualquier otro texto libre largo
```

### Saludos de bienvenida Haiku (v2.2)

```typescript
// 6 franjas horarias Lima (getTimeSlot()):
// madrugada  00-06h → tono cómplice
// manana     06-10h → tono energético
// dia        10-13h → tono directo
// tarde      13-18h → tono aspiracional
// noche      18-22h → tono merecimiento
// noche_tarde 22-00h → tono decisivo

// Flujo según tipo de clienta:
// Nueva Meta Ads  → saludo Haiku → lista promos → CTA dudas/agendar
// Nueva orgánica  → saludo Haiku → menú completo → CTA dudas
// Recurrente (saludo detectado) → menú directo (sin Haiku)

// Fallback hardcodeado por franja si Haiku tarda >4s o falla
```

### Configuración del modelo

```typescript
// Modelo: claude-haiku-4-5-20251001
// max_tokens: 350 (respuestas), 120 (saludos)
// Timeout: 5s (respuestas), 4s (saludos)
// Secret: ANTHROPIC_API_KEY en Supabase
// Si falla o timeout → fallback silencioso al menú estático
```

### System prompt dinámico

```typescript
// buildSystemPrompt() carga desde BD:
// - Categorías activas
// - Servicios por categoría
// - Packs activos
// - Promos activas con sus ítems
// + Info hardcodeada: dirección, horarios, Instagram
// IMPORTANTE para SalonPro: toda la info hardcodeada debe venir de TenantConfig
```

### Integración en dispatcher.ts

```typescript
// Un único punto de integración:
if (step === "browsing") {
  const trigger = detectAITrigger(messageText);
  if (trigger) {
    const response = await callAnthropicAPI(systemPrompt, context, messageText);
    if (response) { sendMessage(response); return; }
  }
}
// Si falla o trigger===null → getMenuResponse() (fallback determinístico)
```

---

## 14. buildAppointmentWorkLabel — etiqueta de trabajo por cita (ZM v2.3)

### Propósito

Una línea legible que describe el trabajo de una cita, agrupando por pack o mostrando el servicio individual.

```typescript
// apps/mobile/utils/appointment-work-label.ts
function buildAppointmentWorkLabel(
  appointmentServices: AppointmentService[],
  packs: Pack[]
): string {
  // Si todos los appointment_services tienen el mismo pack_id:
  //   → "Pack · {título del pack}"
  // Si hay mezcla o ningún pack_id:
  //   → nombres de servicios separados por " + "
}
```

### Uso en pantallas

```typescript
// Finanzas → PaymentList → muestra etiqueta junto al pago
// Agenda → CalendarGrid (tablet) → muestra etiqueta en bloque de cita
// ValidacionPagosScreen → texto de confirmación WA cuando hay cita vinculada
```

### pack_id en appointment_services

```typescript
// Al crear cita desde el bot WABA con ítems de carrito tipo "pack":
// → appointment_services se inserta con pack_id = item.item_id
// Al crear cita manualmente desde la app:
// → pack_id = null (las líneas se muestran por nombre de servicio)
```

---

## 15. Normalización de teléfonos — phone_country + phone_normalized (ZM v2.1)

### Problema resuelto

El número de WhatsApp llega como `"51932535512"` (código país + número). Antes se buscaba por `ILIKE '%932535512'` — frágil. Ahora:

```typescript
// Al recibir mensaje de WhatsApp (WABA webhook):
const raw = "51932535512";   // número completo del remitente
const phone_country = "51";
const phone_normalized = "932535512";

// getOrCreateClient() busca por ambos campos (clave única):
const { data: existing } = await supabase
  .from('clients')
  .select('*')
  .eq('phone_country', phone_country)
  .eq('phone_normalized', phone_normalized)
  .single();
```

### `upsertClient` en la app mobile

```typescript
// NewAppointmentModal → al crear cita manual con teléfono del cliente:
// Hint en el campo: incluir código de país (ej. 51 para Perú)
// La lógica parsea el número para separar phone_country + phone_normalized
```

### Adaptación para SalonPro

```typescript
// phone_country viene de config.locale.defaultPhoneCountry (ej. "51" para Perú)
// Si el usuario escribe sin código de país, usar el default del tenant
// Siempre guardar ambos campos para queries eficientes
```

---

## 16. AuthContext web simplificado (ZM v2.1)

### Patrón implementado

```typescript
// apps/web/src/contexts/AuthContext.tsx
// onAuthStateChange como ÚNICA fuente de verdad
// setIsLoading(false) en evento INITIAL_SESSION
// Eliminado: init() con timeout, router.refresh()

supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'INITIAL_SESSION') {
    setSession(session);
    setIsLoading(false);   // ← siempre, aunque session sea null
  }
  if (event === 'SIGNED_IN') setSession(session);
  if (event === 'SIGNED_OUT') setSession(null);
});
```

### Anti-patrón a evitar

```typescript
// ❌ NO hacer esto en páginas web — causa race condition:
router.replace('/finanzas');
router.refresh();  // ← provoca que la página se cargue antes de que AuthContext tenga la sesión

// ✅ Solo router.replace() — AuthContext actualizará el estado vía onAuthStateChange
```

### Fallback en páginas protegidas

```typescript
// Si authLoading no resuelve (edge case), timeout de 6s redirige a /login
// Nunca usar router.refresh() como solución a problemas de auth
```

---

## 17. Patrones y gotchas críticos

### React Query v5 — sintaxis correcta

```typescript
// ✅ v5:
useQuery({ queryKey: ['key'], queryFn: async () => ... })
useMutation({ mutationFn: async (data) => ... })
queryClient.invalidateQueries({ queryKey: ['key'] })

// ❌ v4 (no usar):
useQuery(['key'], async () => ...)
```

### `expo-image-picker` SDK 48+

```typescript
const result = await ImagePicker.launchImageLibraryAsync({ ... });
if (result.canceled) return;                    // NO result.cancelled
const uri = result.assets[0].uri;              // NO result.uri
```

### Picker de servicios en modales

```typescript
// El picker colapsa a cero altura si el modal no tiene flex:1 en su content View
// Patrón ZM:
style={[styles.content, svcPickerVisible && styles.contentWithPicker]}

const styles = StyleSheet.create({
  content: { paddingHorizontal: Spacing.lg },
  contentWithPicker: { flex: 1, paddingHorizontal: 0 },
});
// SvcPickerContent debe tener flex:1 en su raíz
```

### Drizzle ORM vs SQL directo

```typescript
// Si las tablas ya existen via SQL directo, yarn db:push puede intentar
// dropear columnas "no reconocidas". En SalonPro:
// - Migraciones additive → usar SQL directo (scripts/db/)
// - Schema nuevo → usar Drizzle
```

### CORS en Edge Functions

```typescript
// Siempre incluir headers CORS para evitar bloqueos desde web:
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
```

---

## 18. TenantConfig — campos que SalonPro debe tener

Basado en lo que ZM necesita que sea dinámico:

```typescript
interface TenantConfig {
  businessName: string;
  businessType: 'spa-nails' | 'barbershop' | 'hair-salon' | 'full-aesthetic';
  theme: {
    primaryColor: string;    // hex
    accentColor: string;     // hex
  };
  locale: {
    language: string;        // 'es-VE' | 'es-MX' | 'pt-BR' | etc.
    timezone: string;        // 'America/Lima' | 'America/Bogota' | etc.
    currency: {
      symbol: string;        // '$' | 'S/' | 'COP' | etc.
      code: string;          // 'USD' | 'PEN' | 'COP' | etc.
    };
  };
  terminology: {
    staff: string;           // 'Profesionales' | 'Barberos' | 'Estilistas'
  };
  features?: {
    whatsapp?: boolean;      // activa PromoMasiva, TokenWarningBanner, bot WABA
    inventory?: boolean;     // activa módulo Inventario
    commissions?: boolean;   // activa módulo Finanzas con comisiones
  };
  integrations?: {
    waba?: {
      tokenExpiry?: string;  // ISO date — para TokenWarningBanner
    };
  };
  schedule?: {
    weekdays: { open: string; close: string };  // '10:00' | '19:00'
    sunday: { open: string; close: string } | null;
  };
}
```

---

## 19. Formateo de moneda y fechas

### `formatCurrency` (helper a crear/mantener en SalonPro)

```typescript
// apps/mobile/utils/format.ts
export function formatCurrency(amount: number, config: TenantConfig): string {
  return new Intl.NumberFormat(config.locale.language, {
    style: 'currency',
    currency: config.locale.currency.code,
    minimumFractionDigits: 2,
  }).format(amount);
}

// Alternativa simple si Intl da problemas en RN:
export function formatCurrency(amount: number, config: TenantConfig): string {
  const formatted = amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${config.locale.currency.symbol} ${formatted}`;
}
```

### Fechas relativas (patrón ZM)

```typescript
// "Hace X días" / "Hoy" / "Ayer"
function relativeDays(dateStr: string): string {
  const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
  if (days === 0) return 'Hoy';
  if (days === 1) return 'Ayer';
  return `Hace ${days} días`;
}
```

---

## 20. Checklist de port — nuevas pantallas

Al portear cualquier pantalla de ZM a SalonPro, verificar:

- [ ] `fmtSoles()` → `formatCurrency(amount, config)`
- [ ] `"S/"` hardcodeado → `config.locale.currency.symbol`
- [ ] `"chicas"` / `"Chicas"` → `config.terminology.staff`
- [ ] `"ZM Lash"` / nombre del salón → `config.businessName`
- [ ] `"#7B2D8E"` / `"#D4AF37"` → `theme.primary` / `theme.accent`
- [ ] `"es-PE"` → `config.locale.language`
- [ ] Lima UTC-5 hardcodeado → `config.locale.timezone`
- [ ] `@zmlashnails.com` → dominio configurable o eliminado
- [ ] AsyncStorage key `@zm_*` → `@salonpro/*`
- [ ] Canal Android `"ZM Lash & Nails"` → `config.businessName` o genérico
- [ ] Links hardcodeados (WhatsApp, Instagram) → `config.contact.*` si existe

---

*Generado: marzo 2026 — actualizado: abril 2026 — basado en ZM Lash & Nails v2.3*
*Para actualizar: extraer desde el proyecto ZM en claude.ai y reemplazar este archivo*
