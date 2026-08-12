import { cn } from "@/lib/utils";

type MercadoLibreLogoProps = {
  className?: string;
  /** Alto en px; el SVG es 1:1. */
  size?: number;
};

/**
 * Logo oficial MercadoLibre (mismo asset que landing ZM Tech).
 * Fuente: /public/brands/mercadolibre.svg
 */
export function MercadoLibreLogo({ className, size = 32 }: MercadoLibreLogoProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- SVG de marca, sin optimización raster
    <img
      src="/brands/mercadolibre.svg"
      alt="MercadoLibre"
      width={size}
      height={size}
      className={cn("block shrink-0", className)}
      decoding="async"
      draggable={false}
    />
  );
}
