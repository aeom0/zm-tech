// Checklist vitrina / ML — paridad con mobile (plan 05 E5)

import type { MlListingStatus } from "@repmax/repmax-schema/mlListing";

export type MlBadgeKind =
  | "none"
  | "incompleto"
  | "listo"
  | "exportado"
  | "en_ml"
  | "actualizar";

export type FiltroMlWeb =
  | ""
  | "para_ml"
  | "listo"
  | "incompleto"
  | "exportado"
  | "en_ml"
  | "listo_vitrina";

export interface DatosListoMl {
  title: string;
  partNumber: string;
  description?: string;
  priceUsd: number;
  stock: number;
  portadaUri?: string | null;
}

export interface DatosListoVitrina {
  title: string;
  priceUsd: number;
  stock: number;
  portadaUri?: string | null;
  isActive: boolean;
}

const PATRON_TELEFONO = /(\+?\d[\d\s\-().]{7,}\d|whatsapp|wa\.me)/i;

export function evaluarListoMl(datos: DatosListoMl): boolean {
  const tituloOk = datos.title.trim().length >= 8;
  const parteOk = datos.partNumber.trim().length >= 2;
  const precioOk = datos.priceUsd > 0;
  const stockOk = datos.stock >= 0;
  const portadaOk = Boolean(datos.portadaUri);
  const descOk = !datos.description?.trim() || !PATRON_TELEFONO.test(datos.description);
  return tituloOk && parteOk && precioOk && stockOk && portadaOk && descOk;
}

export function evaluarListoVitrina(datos: DatosListoVitrina): boolean {
  return (
    datos.isActive &&
    datos.title.trim().length >= 3 &&
    datos.priceUsd > 0 &&
    datos.stock > 0 &&
    Boolean(datos.portadaUri)
  );
}

export function resolverBadgeMl(
  mlPublishIntent: boolean,
  listingStatus?: MlListingStatus | null,
  listoMl?: boolean,
): MlBadgeKind {
  if (!mlPublishIntent) return "none";
  if (listingStatus === "exported") return "exportado";
  if (listingStatus === "published_manual" || listingStatus === "published") return "en_ml";
  if (listingStatus === "needs_update") return "actualizar";
  if (!listoMl) return "incompleto";
  return "listo";
}

export function etiquetaBadgeMl(kind: MlBadgeKind): string {
  switch (kind) {
    case "incompleto":
      return "ML incompleto";
    case "listo":
      return "Listo ML";
    case "exportado":
      return "Exportado";
    case "en_ml":
      return "En ML";
    case "actualizar":
      return "Actualizar ML";
    default:
      return "";
  }
}

export function productoPasaFiltroMl(
  filtro: FiltroMlWeb,
  mlPublishIntent: boolean,
  mlBadge: MlBadgeKind,
  vitrinaLista: boolean,
): boolean {
  if (!filtro) return true;
  if (filtro === "para_ml") return mlPublishIntent;
  if (filtro === "listo_vitrina") return vitrinaLista;
  return mlBadge === filtro;
}
