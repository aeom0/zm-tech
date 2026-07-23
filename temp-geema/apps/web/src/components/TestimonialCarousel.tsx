"use client";

import { useCallback, useEffect } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";

interface Testimonial {
  name: string;
  service: string;
  rating: number;
  text: string;
  image?: string;
}

const testimonials: Testimonial[] = [
  {
    name: "María García",
    service: "Extensiones de Pestañas",
    rating: 5,
    text: "Increíble trabajo, mis pestañas quedaron hermosas y naturales. El ambiente del salón es muy acogedor. ¡100% recomendado!",
  },
  {
    name: "Carolina Méndez",
    service: "Uñas en Gel",
    rating: 5,
    text: "Las mejores uñas que me han hecho. Duran semanas sin levantarse. Las chicas son muy profesionales y detallistas.",
  },
  {
    name: "Lucia Fernández",
    service: "Microblading de Cejas",
    rating: 5,
    text: "Tenía miedo del microblading pero Vanessa me dio mucha confianza. El resultado es tan natural que parecen mis cejas reales.",
  },
  {
    name: "Alejandra Torres",
    service: "Lifting de Pestañas",
    rating: 5,
    text: "Me encanta el lifting, es práctico y se ve espectacular. Ya no necesito rímel. Siempre salgo feliz de ZM.",
  },
  {
    name: "Valentina Ruiz",
    service: "Depilación + Cejas",
    rating: 5,
    text: "Fui por una depilación y salí con las cejas perfectas también. Excelente atención y precios justos. Mi salón de confianza.",
  },
];

export function TestimonialCarousel() {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: "start",
    slidesToScroll: 1,
  });

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    const interval = setInterval(() => emblaApi.scrollNext(), 5000);
    return () => clearInterval(interval);
  }, [emblaApi]);

  return (
    <div className="relative">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex gap-6">
          {testimonials.map((t, i) => (
            <div
              key={i}
              className="flex-[0_0_100%] sm:flex-[0_0_50%] lg:flex-[0_0_33.333%] min-w-0 px-2"
            >
              <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm h-full flex flex-col">
                {/* Stars */}
                <div className="flex gap-1 mb-3">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-accent text-accent" />
                  ))}
                </div>

                {/* Quote */}
                <p className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed flex-1">
                  &ldquo;{t.text}&rdquo;
                </p>

                {/* Author */}
                <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                    {t.name[0]}
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                      {t.name}
                    </p>
                    <p className="text-xs text-zinc-500">{t.service}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-center gap-3 mt-8">
        <button
          onClick={scrollPrev}
          className="w-10 h-10 rounded-full border border-zinc-300 dark:border-zinc-700 flex items-center justify-center hover:bg-primary hover:text-white hover:border-primary transition-colors"
          aria-label="Anterior"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={scrollNext}
          className="w-10 h-10 rounded-full border border-zinc-300 dark:border-zinc-700 flex items-center justify-center hover:bg-primary hover:text-white hover:border-primary transition-colors"
          aria-label="Siguiente"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
