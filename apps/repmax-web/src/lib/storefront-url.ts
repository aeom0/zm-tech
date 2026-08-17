// URLs y mensajes WhatsApp para la vitrina pública

export function urlProductoVitrina(
  baseUrl: string,
  storeSlug: string,
  productId: string,
): string {
  const base = baseUrl.replace(/\/$/, "");
  return `${base}/${storeSlug}/p/${productId}`;
}

export function mensajeWhatsAppProducto(params: {
  storeName: string;
  productTitle: string;
  partNumber?: string | null;
  productUrl: string;
}): string {
  const ref = params.partNumber ? ` (ref ${params.partNumber})` : "";
  return `Hola ${params.storeName}, me interesa ${params.productTitle}${ref}. Vi este link: ${params.productUrl}`;
}

export function enlaceWhatsApp(phone: string, texto: string): string | null {
  const digitos = phone.replace(/\D/g, "");
  if (!digitos) return null;
  return `https://wa.me/${digitos}?text=${encodeURIComponent(texto)}`;
}
