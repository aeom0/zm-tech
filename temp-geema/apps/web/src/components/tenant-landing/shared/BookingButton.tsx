import type { CSSProperties } from "react";

interface BookingButtonProps {
  phone: string | null;
  businessName: string;
  label?: string;
  style?: CSSProperties;
  className?: string;
}

export function BookingButton({
  phone,
  businessName,
  label = "Reservar cita ahora",
  style,
  className,
}: BookingButtonProps) {
  const cleanPhone = phone?.replace(/\D/g, "") ?? "";
  const message = encodeURIComponent(
    `Hola ${businessName}, quiero reservar una cita`,
  );
  const href = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${message}`
    : undefined;

  if (!href) {
    return (
      <span
        className={className}
        style={{ ...style, opacity: 0.55, pointerEvents: "none" }}
        role="text"
      >
        {label}
      </span>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={style}
      className={className}
    >
      {label}
    </a>
  );
}
