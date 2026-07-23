"use client";

import { useReveal } from "@/hooks/useReveal";

type Variant = "up" | "fade" | "left" | "right";

type Props = {
  children: React.ReactNode;
  variant?: Variant;
  delay?: number;
  className?: string;
};

/**
 * Envuelve cualquier contenido con una animación de scroll reveal.
 * Usa IntersectionObserver — sin dependencias externas.
 */
export function RevealWrapper({
  children,
  variant = "up",
  delay = 0,
  className = "",
}: Props) {
  const ref = useReveal({ delay });

  return (
    <div ref={ref} className={`reveal-${variant} ${className}`}>
      {children}
    </div>
  );
}
