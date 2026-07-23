import type { CSSProperties } from "react";
import { Calendar, MapPin } from "lucide-react";
import { LUNARIS } from "@/lib/theme";
import type { TenantLandingProps } from "@/types/tenant-landing";
import { BookingButton } from "./shared/BookingButton";
import { WhatsAppFAB } from "./shared/WhatsAppFAB";
import { formatBusinessHours } from "./shared/format-hours";
import { ReviewStars } from "./shared/ReviewStars";
import { ServiceGlyph } from "./shared/ServiceGlyph";

const grad = LUNARIS.gradient.css;

const gradTextStyle: CSSProperties = {
  backgroundImage: grad,
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  backgroundClip: "text",
};

export function TenantLandingElegant({ data }: TenantLandingProps) {
  const {
    businessName,
    heroTagline,
    tagline,
    about,
    services,
    reviews,
    whatsapp,
    instagram,
    address,
    city,
    statClients,
    statRating,
    statYears,
    businessHours,
  } = data;

  const subtitle =
    heroTagline ??
    tagline ??
    `Reserva tu cita en segundos. Atención profesional en ${city ?? "tu ciudad"}.`;

  const dias = formatBusinessHours(businessHours);
  const showHours = dias.some((d) => d.enabled);

  return (
    <div
      className="min-h-screen text-[#f0ede8]"
      style={{ background: "#0d0f14", fontFamily: "system-ui, sans-serif" }}
    >
      <nav
        className="sticky top-0 z-50 flex items-center justify-between border-b border-white/[0.06] px-6 py-4 backdrop-blur-md"
        style={{ background: "rgba(13,15,20,0.92)" }}
      >
        <div className="text-xl font-extrabold tracking-tight text-[#f0ede8]">
          {businessName}
        </div>
        <BookingButton
          phone={whatsapp}
          businessName={businessName}
          label="Reservar"
          className="inline-block rounded-full px-5 py-2.5 text-[13px] font-semibold text-white no-underline"
          style={{ background: grad }}
        />
      </nav>

      <section className="px-6 pb-16 pt-16 text-center">
        <div
          className="mb-5 inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium"
          style={{
            borderColor: LUNARIS.badge.border,
            background: LUNARIS.badge.bg,
            color: LUNARIS.badge.text,
          }}
        >
          <span
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{ background: LUNARIS.primary }}
            aria-hidden
          />
          Agenda abierta
        </div>
        <h1 className="mb-4 text-4xl font-extrabold leading-tight tracking-tight">
          Tu belleza,
          <br />
          <span style={gradTextStyle}>sin esperar</span>
        </h1>
        <p className="mx-auto mb-7 max-w-[340px] text-base leading-relaxed text-[rgba(240,237,232,0.6)]">
          {subtitle}
        </p>
        <BookingButton
          phone={whatsapp}
          businessName={businessName}
          label="Reservar cita ahora"
          className="mb-3 block rounded-full py-4 text-center text-[15px] font-semibold text-white no-underline"
          style={{ background: grad }}
        />
        {instagram && (
          <a
            href={`https://instagram.com/${instagram.replace("@", "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-full border border-[rgba(240,237,232,0.2)] py-3.5 text-center text-[14px] font-semibold text-[#f0ede8] no-underline"
          >
            Ver nuestro trabajo
          </a>
        )}

        <div className="mt-10 flex flex-wrap justify-center gap-6">
          {[
            { value: statClients, label: "Clientes felices" },
            { value: statRating, label: "Calificación" },
            { value: statYears, label: "Años contigo" },
          ].map((stat, i) => (
            <div key={i} className="text-center">
              <div className="text-[28px] font-extrabold" style={gradTextStyle}>
                {stat.value}
              </div>
              <div className="mt-1 text-xs text-[rgba(240,237,232,0.5)]">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="mx-6 h-px bg-white/[0.07]" />

      {about && (
        <>
          <section className="px-6 py-14">
            <p className="mb-1 text-[11px] uppercase tracking-[0.2em] text-[rgba(240,237,232,0.4)]">
              Nosotros
            </p>
            <h2 className="mb-4 text-[26px] font-bold tracking-tight">
              Conócenos
            </h2>
            <p className="whitespace-pre-line text-sm leading-relaxed text-[rgba(240,237,232,0.72)]">
              {about}
            </p>
          </section>
          <div className="mx-6 h-px bg-white/[0.07]" />
        </>
      )}

      {showHours && (
        <>
          <section className="px-6 py-14">
            <p className="mb-1 text-[11px] uppercase tracking-[0.2em] text-[rgba(240,237,232,0.4)]">
              Horario
            </p>
            <h2 className="mb-5 text-[26px] font-bold tracking-tight">
              Cuándo atendemos
            </h2>
            <div className="space-y-2">
              {dias.map((d) => (
                <div
                  key={d.label}
                  className="flex items-center justify-between rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm"
                >
                  <span className="text-[rgba(240,237,232,0.85)]">
                    {d.label}
                  </span>
                  <span
                    className={
                      d.enabled
                        ? "text-[rgba(240,237,232,0.55)]"
                        : "text-[rgba(240,237,232,0.35)]"
                    }
                  >
                    {d.hours}
                  </span>
                </div>
              ))}
            </div>
          </section>
          <div className="mx-6 h-px bg-white/[0.07]" />
        </>
      )}

      {services.length > 0 && (
        <>
          <section className="px-6 py-14">
            <p className="mb-1 text-[11px] uppercase tracking-[0.2em] text-[rgba(240,237,232,0.4)]">
              Servicios
            </p>
            <h2 className="mb-5 text-[26px] font-bold tracking-tight">
              Lo que hacemos por ti
            </h2>
            <div className="flex flex-col gap-2.5">
              {services.map((service, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3.5 rounded-[20px] border border-white/[0.08] bg-white/[0.04] p-5"
                >
                  <div
                    className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[14px] text-white"
                    style={{ background: grad }}
                  >
                    <ServiceGlyph iconName={service.icon} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-0.5 font-semibold">{service.name}</div>
                    <div className="text-[13px] text-[rgba(240,237,232,0.5)]">
                      {service.description}
                    </div>
                    {!!service.duration && (
                      <div className="mt-1 text-[11px] text-[rgba(240,237,232,0.35)]">
                        {service.duration}
                      </div>
                    )}
                  </div>
                  <div
                    className="flex-shrink-0 whitespace-nowrap text-[15px] font-bold"
                    style={gradTextStyle}
                  >
                    {service.price}
                  </div>
                </div>
              ))}
            </div>
          </section>
          <div className="mx-6 h-px bg-white/[0.07]" />
        </>
      )}

      {reviews.length > 0 && (
        <>
          <section className="px-6 py-14">
            <p className="mb-1 text-[11px] uppercase tracking-[0.2em] text-[rgba(240,237,232,0.4)]">
              Reseñas
            </p>
            <h2 className="mb-5 text-[26px] font-bold tracking-tight">
              Lo que dicen nuestras clientas
            </h2>
            {reviews.map((review, i) => (
              <div
                key={i}
                className="mb-2.5 rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5 last:mb-0"
              >
                <ReviewStars color={LUNARIS.primary} />
                <p className="text-[14px] leading-relaxed text-[rgba(240,237,232,0.75)]">
                  &ldquo;{review.text}&rdquo;
                </p>
                <div className="mt-3.5 flex items-center gap-2.5">
                  <div
                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-white"
                    style={{ background: grad }}
                  >
                    {review.initial}
                  </div>
                  <div>
                    <div className="text-[13px] font-semibold">
                      {review.author}
                    </div>
                    <div className="text-[11px] text-[rgba(240,237,232,0.4)]">
                      {review.role}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </section>
          <div className="mx-6 h-px bg-white/[0.07]" />
        </>
      )}

      <section className="px-6 py-14">
        <div
          className="rounded-3xl border px-6 py-8 text-center"
          style={{
            borderColor: LUNARIS.badge.border,
            background: `linear-gradient(135deg, ${LUNARIS.badge.bg} 0%, rgba(30,136,229,0.08) 100%)`,
          }}
        >
          <Calendar
            className="mx-auto mb-3 text-[#f0ede8]"
            size={36}
            strokeWidth={1.5}
            aria-hidden
          />
          <h2 className="mb-2.5 text-2xl font-extrabold tracking-tight">
            ¿Lista para tu cita?
          </h2>
          <p className="mb-6 text-sm leading-relaxed text-[rgba(240,237,232,0.6)]">
            Reserva en segundos. Sin llamadas, sin cola.
          </p>
          <BookingButton
            phone={whatsapp}
            businessName={businessName}
            label="Reservar por WhatsApp"
            className="block rounded-full py-4 text-center text-[15px] font-bold text-white no-underline"
            style={{ background: grad }}
          />
        </div>
      </section>

      <footer className="border-t border-white/[0.06] bg-[#080a0e] px-6 py-10">
        <div className="mb-3.5 text-xl font-extrabold text-[#f0ede8]">
          {businessName}
        </div>
        {(city || address) && (
          <p className="mb-3.5 flex items-start gap-2 text-[13px] text-[rgba(240,237,232,0.4)]">
            <MapPin className="mt-0.5 flex-shrink-0 opacity-60" size={14} />
            <span>{[address, city].filter(Boolean).join(" · ")}</span>
          </p>
        )}
        <div className="mb-6 flex flex-wrap gap-1">
          {whatsapp && (
            <span className="inline-block rounded-full border border-white/10 bg-white/[0.06] px-4 py-1.5 text-xs text-[rgba(240,237,232,0.65)]">
              WhatsApp
            </span>
          )}
          {instagram && (
            <span className="inline-block rounded-full border border-white/10 bg-white/[0.06] px-4 py-1.5 text-xs text-[rgba(240,237,232,0.65)]">
              Instagram
            </span>
          )}
          {address && (
            <span className="inline-block rounded-full border border-white/10 bg-white/[0.06] px-4 py-1.5 text-xs text-[rgba(240,237,232,0.65)]">
              Ubicación
            </span>
          )}
        </div>
        <p className="border-t border-white/[0.06] pt-4 text-[11px] text-[rgba(240,237,232,0.2)]">
          Creado con{" "}
          <a
            href="/"
            className="text-[rgba(240,237,232,0.35)] no-underline hover:underline"
          >
            GeemaStudio
          </a>{" "}
          · Gestión profesional para salones de belleza
        </p>
      </footer>

      <WhatsAppFAB phone={whatsapp} businessName={businessName} />
    </div>
  );
}
