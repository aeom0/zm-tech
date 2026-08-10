import { cn } from "@/lib/utils";

const SRC = {
  wordmark: "/brand/wordmark-repmax.svg",
  tagline: "/brand/wordmark-repmax-tagline.svg",
  icon: "/brand/icon-rm.svg",
  app: "/brand/icon-rm-app.svg",
} as const;

export type BrandLogoVariant = keyof typeof SRC;

type BrandLogoProps = {
  variant?: BrandLogoVariant;
  className?: string;
  /** Altura en px (el ancho escala con el SVG). */
  height?: number;
  priority?: boolean;
};

/**
 * Logo oficial RepMAX (SVG en /public/brand).
 * Preferir `wordmark` en chrome; `icon` en espacios chicos; `tagline` en hero/splash.
 */
export function BrandLogo({
  variant = "wordmark",
  className,
  height,
  priority = false,
}: BrandLogoProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- SVG de marca, sin optimización raster
    <img
      src={SRC[variant]}
      alt="RepMAX"
      width={variant === "icon" || variant === "app" ? height ?? 32 : undefined}
      height={height}
      className={cn("block w-auto", className)}
      style={height ? { height, width: "auto" } : undefined}
      decoding="async"
      fetchPriority={priority ? "high" : "auto"}
      draggable={false}
    />
  );
}
