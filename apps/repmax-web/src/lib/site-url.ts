/** URL base del sitio RepMAX (vitrina pública). */

export function getSiteUrl(): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.VERCEL_URL;
  if (env?.startsWith("http")) return env.replace(/\/$/, "");
  if (env) return `https://${env}`;
  if (typeof window !== "undefined") return window.location.origin;
  return "http://localhost:3003";
}

export function urlVitrinaTienda(slug: string, siteUrl?: string): string {
  const base = (siteUrl ?? getSiteUrl()).replace(/\/$/, "");
  return `${base}/${slug}`;
}
