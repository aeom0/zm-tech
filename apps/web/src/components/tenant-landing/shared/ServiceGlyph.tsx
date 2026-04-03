import * as LucideIcons from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Sparkles } from "lucide-react";

const LucideMap = LucideIcons as unknown as Record<string, LucideIcon>;

interface ServiceGlyphProps {
  iconName: string;
  size?: number;
  className?: string;
}

/** Resuelve `icon` del JSON como componente Lucide; si no coincide, usa Sparkles. */
export function ServiceGlyph({
  iconName,
  size = 22,
  className,
}: ServiceGlyphProps) {
  const trimmed = iconName.trim();
  const Icon = LucideMap[trimmed];
  if (Icon) {
    return (
      <Icon className={className} size={size} strokeWidth={1.75} aria-hidden />
    );
  }
  return (
    <Sparkles
      className={className}
      size={size}
      strokeWidth={1.75}
      aria-hidden
    />
  );
}
