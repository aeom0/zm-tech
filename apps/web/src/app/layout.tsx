import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ZM Lash & Nails Beauty | Salón de belleza en Santiago de Surco, Lima",
  description:
    "Salón de belleza en Santiago de Surco, Lima. Extensiones de pestañas, lifting, microblading, uñas en gel y depilación. CC. Las Plazuelas de Surco. Agenda por WhatsApp.",
  keywords: [
    "salón de belleza Santiago de Surco",
    "salón de belleza Lima",
    "extensiones de pestañas Surco",
    "lifting de pestañas Lima",
    "microblading cejas",
    "uñas en gel Surco",
    "manicure Lima",
    "depilación Lima",
    "ZM Lash and Nails",
    "Las Plazuelas de Surco",
  ],
  icons: {
    icon: "/favicon.png",
  },
  openGraph: {
    title: "ZM Lash & Nails Beauty | Tu belleza, nuestra pasión",
    description:
      "Salón de belleza en Lima especializado en pestañas, cejas, uñas y micropigmentación. +500 clientas felices.",
    type: "website",
    locale: "es_PE",
    siteName: "ZM Lash & Nails Beauty",
  },
  twitter: {
    card: "summary_large_image",
    title: "ZM Lash & Nails Beauty",
    description:
      "Salón de belleza en Lima. Pestañas, cejas, uñas y micropigmentación.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Playfair+Display:wght@700;800&display=swap"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "BeautySalon",
              name: "ZM Lash & Nails Beauty",
              description:
                "Salón de belleza especializado en extensiones de pestañas, lifting, microblading, uñas y depilación en Lima, Perú.",
              address: {
                "@type": "PostalAddress",
                streetAddress:
                  "Calle Artesanos 150, Local 205, CC. Las Plazuelas de Surco",
                addressLocality: "Santiago de Surco",
                addressRegion: "Lima",
                addressCountry: "PE",
              },
              openingHoursSpecification: [
                {
                  "@type": "OpeningHoursSpecification",
                  dayOfWeek: [
                    "Monday",
                    "Tuesday",
                    "Wednesday",
                    "Thursday",
                    "Friday",
                    "Saturday",
                  ],
                  opens: "10:00",
                  closes: "19:00",
                },
                {
                  "@type": "OpeningHoursSpecification",
                  dayOfWeek: "Sunday",
                  opens: "10:30",
                  closes: "13:00",
                },
              ],
              priceRange: "S/ 20 - S/ 320",
              aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: "4.9",
                reviewCount: "500",
              },
            }),
          }}
        />
      </head>
      <body className="antialiased font-sans">{children}</body>
    </html>
  );
}
