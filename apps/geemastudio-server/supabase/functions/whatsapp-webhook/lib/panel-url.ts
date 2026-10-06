/**
 * Base del panel de mensajes WABA al que apuntan los push al staff.
 * Desde oct 2026 el panel interno es el de Geema (zm-tech); el panel de
 * zmlashnails.com ya no se usa. Override: secret `WABA_PANEL_BASE_URL`.
 */
export const WABA_PANEL_BASE =
  Deno.env.get("WABA_PANEL_BASE_URL") ??
  "https://geema.zmtechdev.com/panel/waba/mensajes";
