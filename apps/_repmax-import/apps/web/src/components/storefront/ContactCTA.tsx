// ============================================================
// Botón flotante WhatsApp — contacto rápido (Client Component)
// ============================================================

"use client";

function soloDigitos(phone: string): string {
  return phone.replace(/\D/g, "");
}

interface ContactCTAProps {
  storeName: string;
  phone: string;
}

export function ContactCTA({ storeName, phone }: ContactCTAProps) {
  const digitos = soloDigitos(phone);
  if (!digitos) {
    return null;
  }

  const texto = `Hola ${storeName}, vi tu catálogo en RepMAX`;
  const href = `https://wa.me/${digitos}?text=${encodeURIComponent(texto)}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-3 text-sm font-semibold text-white shadow-lg transition-opacity hover:opacity-90 md:px-5"
    >
      <svg
        className="h-6 w-6 shrink-0"
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden
      >
        <path d="M12.031 6.172c-3.181 0-5.969 2.789-5.969 6.031 0 1.063.28 2.109.813 3.031L6 18l2.844-.875c.906.5 1.922.781 3.031.781 3.181 0 5.969-2.781 5.969-6.031 0-3.219-2.781-6.031-5.969-6.031zm.031 10.969c-.875 0-1.734-.234-2.5-.688l-.188-.109-1.969.625.656-1.922-.125-.188A4.97 4.97 0 017 12.203c0-2.75 2.25-5 5-5s5 2.25 5 5-2.25 5-5 5zm2.781-6.781c-.156-.078-1.016-.5-1.172-.563-.156-.047-.266-.078-.375.078-.109.172-.422.563-.516.672-.094.125-.203.141-.359.047-.156-.094-.656-.242-1.25-.766-.461-.406-.773-.906-.859-1.063-.094-.156-.01-.234.07-.313.078-.078.172-.203.25-.297.078-.109.109-.188.172-.313.063-.125.031-.234-.016-.313-.047-.078-.375-.922-.516-1.266-.141-.328-.281-.281-.375-.281-.094 0-.203-.016-.313-.016-.109 0-.281.047-.422.234-.141.188-.547.531-.547 1.297 0 .766.563 1.5.641 1.609.078.109 1.109 1.688 2.688 2.297.375.164.672.266.906.344.375.125.719.109.984.063.297-.047.922-.375 1.047-.734.141-.359.141-.672.094-.734-.047-.063-.141-.109-.297-.172z" />
      </svg>
      <span className="hidden md:inline">WhatsApp</span>
    </a>
  );
}
