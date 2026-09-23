/**
 * Ref global del NavigationContainer para navegar desde fuera del árbol
 * (p. ej. tap en push → `useNotifications`, que vive en AppContent).
 *
 * Cold start / login pendiente: la ruta Agenda aún no está montada. Se encola el
 * destino y se reintenta en `onReady` / `onStateChange` hasta que exista.
 */
import type { NavigationState, PartialState } from '@react-navigation/native'
import { createNavigationContainerRef } from '@react-navigation/native'

export const navigationRef = createNavigationContainerRef()

let pendingAgendaAppointmentId: string | null = null

type AnyState = NavigationState | PartialState<NavigationState> | undefined

function hasRoute(state: AnyState, name: string): boolean {
  if (!state?.routes) return false
  return state.routes.some((r) => r.name === name || hasRoute(r.state as AnyState, name))
}

function agendaMounted(): boolean {
  return navigationRef.isReady() && hasRoute(navigationRef.getRootState() as AnyState, 'Agenda')
}

/** Abre Agenda con el detalle de la cita (`AgendaScreen` lee `route.params.appointmentId`). */
export function openAgendaAppointment(appointmentId: string): void {
  pendingAgendaAppointmentId = appointmentId
  flushPendingNavigation()
}

export function flushPendingNavigation(): void {
  if (!pendingAgendaAppointmentId || !agendaMounted()) return
  const appointmentId = pendingAgendaAppointmentId
  pendingAgendaAppointmentId = null
  ;(navigationRef.navigate as (name: string, params?: object) => void)('Agenda', {
    appointmentId,
  })
}
