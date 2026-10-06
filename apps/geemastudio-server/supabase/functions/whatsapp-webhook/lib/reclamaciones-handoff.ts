/**
 * Libro de Reclamaciones: la clienta pide el libro o quiere dejar un reclamo/queja formal.
 * Es un trámite con respaldo legal (Indecopi), no una charla de Haiku: se le da el
 * enlace al libro, se pausa el bot y se avisa al staff por push para que una persona responda.
 *
 * Aparte de `matchesComplaintIntent` (garantía técnica: "se cayeron", "reclamo" suelto),
 * que deriva al número del equipo sin pausar. Si el mensaje habla de garantía y no pide
 * el libro, esto NO dispara y sigue ese gate.
 */
import { srtaLabel } from "./client-address.ts";

export const LIBRO_RECLAMACIONES_URL =
  "https://zmlashnails.com/libro-de-reclamaciones";

function normalize(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
}

const PIDE_EL_LIBRO =
  /\b(libro|hoja|formulario)\s+de\s+reclam|\bindecopi\b|\bdefensa\s+del\s+consumidor\b/;

const QUIERE_RECLAMAR =
  /\b(poner|presentar|hacer|dejar|registrar|interponer|formular|colocar|ingresar)\s+(un|una|mi|el)\s+(reclamo|queja|reclamacion)\b|\b(quiero|quisiera|deseo|necesito|voy\s+a)\s+(reclamar|quejarme|denunciar)\b|\btengo\s+(un|una)\s+(reclamo|queja|reclamacion)\b/;

export function matchesReclamacionesIntent(text: string): boolean {
  const t = normalize(text);
  if (!t.trim()) return false;
  if (PIDE_EL_LIBRO.test(t)) return true;
  if (!QUIERE_RECLAMAR.test(t)) return false;
  // "quiero reclamar la garantía" sigue el gate de garantía (derivación al equipo).
  return !/\bgarantia\b/.test(t);
}

export function buildReclamacionesMessage(
  contactName: string | null | undefined,
): string {
  const srta = srtaLabel(contactName);
  const hello = srta ? `${srta}, lamentamos` : "Lamentamos";
  return (
    `${hello} que hayas tenido una mala experiencia 💜\n\n` +
    `Puedes registrar tu reclamo en nuestro *Libro de Reclamaciones* aquí:\n${LIBRO_RECLAMACIONES_URL}\n\n` +
    `Además ya avisamos a nuestro equipo para que una persona te escriba por este chat y lo revise contigo.`
  );
}
