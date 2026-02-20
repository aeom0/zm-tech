"use client";

import {
  MessageCircle,
  Eye,
  Star,
  Smile,
  Scissors,
  Feather,
  Droplet,
  Clock,
  MapPin,
  Phone,
  Instagram,
  Facebook,
  Award,
  Heart,
  Sparkles,
  Play,
  Gift,
  Percent,
  Crown,
  ChevronRight,
  Music2,
} from "lucide-react";
import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { AnimatedSection } from "@/components/AnimatedSection";
import { TestimonialCarousel } from "@/components/TestimonialCarousel";
import { BeforeAfterGallery } from "@/components/BeforeAfterGallery";

const WHATSAPP_URL =
  "https://wa.me/51932535512?text=Hola,%20me%20gustaría%20agendar%20una%20cita";

const services = [
  {
    icon: Eye,
    title: "Extensiones de Pestañas",
    description: "Clásicas, Volumen Ruso, Baby Volumen, Mega Volumen",
    priceRange: "S/ 100 - S/ 200",
    duration: "2 hrs",
    popular: true,
  },
  {
    icon: Star,
    title: "Lifting de Pestañas",
    description:
      "Lifting, tinturado y diseño. Se puede combinar con otro servicio",
    priceRange: "S/ 60 - S/ 160",
    duration: "45 min",
    popular: false,
  },
  {
    icon: Smile,
    title: "Cejas y Rostro",
    description:
      "Diseño de cejas, laminado, bozo. Se puede combinar con otro servicio",
    priceRange: "S/ 20 - S/ 90",
    duration: "20 - 45 min",
    popular: false,
  },
  {
    icon: Scissors,
    title: "Uñas",
    description:
      "Manos gel, pedicure gel, rubber + polygel, pedicure especial con masajes y velas aromáticas",
    priceRange: "S/ 20 - S/ 120",
    duration: "1:30 - 2 hrs",
    popular: true,
  },
  {
    icon: Feather,
    title: "Microblading",
    description: "Cejas, labios e Hidra Lips con micropigmentación",
    priceRange: "S/ 130 - S/ 320",
    duration: "1:30 - 2 hrs",
    popular: false,
  },
  {
    icon: Droplet,
    title: "Depilación Corporal",
    description: "Axilas, bikini, piernas, packs completos",
    priceRange: "S/ 25 - S/ 75",
    duration: "20 - 60 min",
    popular: false,
  },
];

const teamMembers = [
  {
    name: "Vanessa",
    role: "Fundadora & Lashista",
    color: "#D4AF37",
    speciality: "Extensiones de pestañas",
    phrase: "Tu mirada es mi lienzo",
  },
  {
    name: "Stephani",
    role: "Lashista",
    color: "#9B59B6",
    speciality:
      "Diseño de cejas, extensiones de pestañas, bozo, microblading, microlips y depilación de cuerpo",
    phrase: "Cada detalle cuenta",
  },
  {
    name: "Yosaida",
    role: "Pedicure & Nail Artist",
    color: "#00BCD4",
    speciality:
      "Uñas en gel, rubber y polygel, pedicure en gel y pedicure especial",
    phrase: "Tus manos y pies en las mejores manos",
  },
  {
    name: "Romina",
    role: "Nail Artist",
    color: "#E91E63",
    speciality: "Uñas en gel, rubber y polygel, pedicure en gel",
    phrase: "Cada uña es una obra de arte",
  },
];

const promos = [
  {
    icon: Gift,
    title: "Primera Vez",
    description: "15% de descuento en tu primera visita en cualquier servicio",
    badge: "NUEVO",
    color: "from-primary to-purple-700",
  },
  {
    icon: Percent,
    title: "Combo Mirada",
    description:
      "Extensiones + Laminado de cejas con precio especial. Ahorra hasta S/ 30",
    badge: "POPULAR",
    color: "from-accent to-yellow-600",
  },
  {
    icon: Crown,
    title: "Refiere una Amiga",
    description:
      "Trae a una amiga y ambas reciben 10% de descuento en su próxima cita",
    badge: "REFIERE",
    color: "from-pink-500 to-rose-600",
  },
];

const stats = [
  { number: "500+", label: "Clientas Felices", icon: Heart },
  { number: "3+", label: "Años de Experiencia", icon: Award },
  { number: "4.9", label: "Calificación Google", icon: Star },
  { number: "58", label: "Servicios Disponibles", icon: Sparkles },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-hidden">
      <Navbar />

      {/* ═══════════════════════════════════════════════════════════════
          1. HERO CON VIDEO DE FONDO
      ═══════════════════════════════════════════════════════════════ */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Video / Gradient background */}
        <div className="absolute inset-0 z-0">
          {/* TODO: Reemplazar con video real del salón.
               Descomenta el <video> y comenta el div de gradient.
               Formato recomendado: MP4, 1080p, 15-30 seg, loop */}
          {/* <video
            autoPlay
            muted
            loop
            playsInline
            className="w-full h-full object-cover"
          >
            <source src="/videos/hero-salon.mp4" type="video/mp4" />
          </video> */}
          <div className="w-full h-full bg-gradient-to-br from-primary via-purple-800 to-primary/90" />
          <div className="absolute inset-0 bg-black/30" />
        </div>

        {/* Decorative elements */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-accent/10 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-primary/20 blur-3xl" />
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-5xl mx-auto px-4 text-center space-y-8 pt-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <img
              src="/logo-positivo.png"
              alt="ZM Lash & Nails Beauty"
              className="w-72 h-auto md:w-96 mx-auto drop-shadow-2xl"
            />
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-2xl md:text-4xl font-bold text-white tracking-tight"
          >
            Tu belleza, nuestra pasión
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto"
          >
            Salón de belleza especializado en pestañas, cejas, uñas y
            micropigmentación en Santiago de Surco, Lima
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-3 bg-accent text-black font-bold px-8 py-4 rounded-full text-lg hover:scale-105 hover:shadow-xl hover:shadow-accent/25 transition-all duration-300"
            >
              <MessageCircle className="w-5 h-5" />
              Agendar por WhatsApp
            </a>
            <a
              href="#servicios"
              className="inline-flex items-center justify-center gap-2 border-2 border-white/40 text-white font-semibold px-8 py-4 rounded-full text-lg hover:bg-white/10 transition-all duration-300"
            >
              Ver Servicios
              <ChevronRight className="w-5 h-5" />
            </a>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10"
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          <div className="w-6 h-10 rounded-full border-2 border-white/40 flex items-start justify-center p-1.5">
            <div className="w-1.5 h-3 rounded-full bg-white/60" />
          </div>
        </motion.div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          2. BARRA DE CONFIANZA
      ═══════════════════════════════════════════════════════════════ */}
      <section className="py-12 md:py-16 bg-white dark:bg-zinc-950 border-b border-zinc-100 dark:border-zinc-900">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <AnimatedSection key={stat.label} delay={i * 0.1}>
                <div className="text-center">
                  <stat.icon className="w-8 h-8 text-accent mx-auto mb-2" />
                  <p className="text-3xl md:text-4xl font-bold text-primary">
                    {stat.number}
                  </p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                    {stat.label}
                  </p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          3. SERVICIOS DESTACADOS
      ═══════════════════════════════════════════════════════════════ */}
      <section
        id="servicios"
        className="px-4 py-20 md:py-28 bg-zinc-50 dark:bg-zinc-900/30"
      >
        <div className="max-w-6xl mx-auto">
          <AnimatedSection>
            <div className="text-center mb-14">
              <span className="text-accent font-semibold text-sm uppercase tracking-widest">
                Nuestro catálogo
              </span>
              <h2 className="text-3xl md:text-5xl font-bold mt-3 text-zinc-900 dark:text-zinc-100">
                Servicios de Belleza
              </h2>
              <p className="text-zinc-600 dark:text-zinc-400 mt-4 max-w-xl mx-auto text-lg">
                Tratamientos profesionales con las mejores técnicas y productos
                premium
              </p>
            </div>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((s, i) => (
              <AnimatedSection key={s.title} delay={i * 0.08}>
                <div className="group relative p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full">
                  {s.popular && (
                    <span className="absolute -top-3 right-4 bg-accent text-black text-xs font-bold px-3 py-1 rounded-full">
                      POPULAR
                    </span>
                  )}
                  <div className="w-14 h-14 rounded-xl bg-primary/10 group-hover:bg-primary group-hover:text-white flex items-center justify-center mb-4 transition-colors duration-300">
                    <s.icon className="w-7 h-7 text-primary group-hover:text-white transition-colors duration-300" />
                  </div>
                  <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                    {s.title}
                  </h3>
                  <p className="text-zinc-600 dark:text-zinc-400 mt-2 text-sm leading-relaxed">
                    {s.description}
                  </p>
                  <div className="flex items-center gap-1.5 mt-3 text-zinc-500 text-xs">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{s.duration}</span>
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                    <p className="text-accent font-bold text-lg">
                      {s.priceRange}
                    </p>
                    <a
                      href={WHATSAPP_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary text-sm font-semibold hover:underline"
                    >
                      Reservar →
                    </a>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          4. ANTES Y DESPUÉS / GALERÍA
      ═══════════════════════════════════════════════════════════════ */}
      <section
        id="resultados"
        className="px-4 py-20 md:py-28 bg-white dark:bg-zinc-950"
      >
        <div className="max-w-6xl mx-auto">
          <AnimatedSection>
            <div className="text-center mb-14">
              <span className="text-accent font-semibold text-sm uppercase tracking-widest">
                Nuestro trabajo
              </span>
              <h2 className="text-3xl md:text-5xl font-bold mt-3 text-zinc-900 dark:text-zinc-100">
                Resultados Reales
              </h2>
              <p className="text-zinc-600 dark:text-zinc-400 mt-4 max-w-xl mx-auto text-lg">
                Mira las transformaciones de nuestras clientas
              </p>
            </div>
          </AnimatedSection>

          <AnimatedSection delay={0.2}>
            <BeforeAfterGallery />
          </AnimatedSection>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          5. VIDEO PROMOCIONAL
      ═══════════════════════════════════════════════════════════════ */}
      <section className="px-4 py-20 md:py-28 bg-zinc-50 dark:bg-zinc-900/30">
        <div className="max-w-4xl mx-auto">
          <AnimatedSection>
            <div className="text-center mb-14">
              <span className="text-accent font-semibold text-sm uppercase tracking-widest">
                Conócenos
              </span>
              <h2 className="text-3xl md:text-5xl font-bold mt-3 text-zinc-900 dark:text-zinc-100">
                Nuestro Salón
              </h2>
            </div>
          </AnimatedSection>

          <AnimatedSection delay={0.2}>
            <div className="relative aspect-video rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-xl">
              {/* TODO: Reemplazar con video real de YouTube o Instagram.
                   Opción 1: Embed de YouTube
                   <iframe src="https://www.youtube.com/embed/VIDEO_ID" ... />
                   Opción 2: Video directo
                   <video src="/videos/salon-tour.mp4" controls ... /> */}
              <div className="w-full h-full bg-gradient-to-br from-primary/20 via-primaryLight/40 to-accent/20 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary/90 flex items-center justify-center cursor-pointer hover:scale-110 transition-transform shadow-lg shadow-primary/30">
                    <Play className="w-8 h-8 text-white ml-1" />
                  </div>
                  <p className="text-zinc-600 dark:text-zinc-400 font-medium">
                    Video del salón próximamente
                  </p>
                  <p className="text-sm text-zinc-500 mt-1">
                    Reemplaza este placeholder con tu video de YouTube o
                    Instagram
                  </p>
                </div>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          6. TESTIMONIOS
      ═══════════════════════════════════════════════════════════════ */}
      <section
        id="testimonios"
        className="px-4 py-20 md:py-28 bg-white dark:bg-zinc-950"
      >
        <div className="max-w-6xl mx-auto">
          <AnimatedSection>
            <div className="text-center mb-14">
              <span className="text-accent font-semibold text-sm uppercase tracking-widest">
                Reseñas
              </span>
              <h2 className="text-3xl md:text-5xl font-bold mt-3 text-zinc-900 dark:text-zinc-100">
                Lo que Dicen Nuestras Clientas
              </h2>
              <p className="text-zinc-600 dark:text-zinc-400 mt-4 max-w-xl mx-auto text-lg">
                La satisfacción de nuestras clientas es nuestra mejor carta de
                presentación
              </p>
            </div>
          </AnimatedSection>

          <AnimatedSection delay={0.2}>
            <TestimonialCarousel />
          </AnimatedSection>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          7. PROMOCIONES
      ═══════════════════════════════════════════════════════════════ */}
      <section
        id="promos"
        className="px-4 py-20 md:py-28 bg-zinc-50 dark:bg-zinc-900/30"
      >
        <div className="max-w-6xl mx-auto">
          <AnimatedSection>
            <div className="text-center mb-14">
              <span className="text-accent font-semibold text-sm uppercase tracking-widest">
                Ofertas especiales
              </span>
              <h2 className="text-3xl md:text-5xl font-bold mt-3 text-zinc-900 dark:text-zinc-100">
                Promociones
              </h2>
              <p className="text-zinc-600 dark:text-zinc-400 mt-4 max-w-xl mx-auto text-lg">
                Aprovecha nuestras ofertas exclusivas
              </p>
            </div>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {promos.map((promo, i) => (
              <AnimatedSection key={promo.title} delay={i * 0.1}>
                <div className="relative overflow-hidden rounded-2xl h-full">
                  <div
                    className={`bg-gradient-to-br ${promo.color} p-8 text-white h-full flex flex-col`}
                  >
                    <span className="inline-block self-start bg-white/20 backdrop-blur-sm text-white text-xs font-bold px-3 py-1 rounded-full mb-4">
                      {promo.badge}
                    </span>
                    <promo.icon className="w-10 h-10 mb-4 opacity-90" />
                    <h3 className="text-2xl font-bold mb-2">{promo.title}</h3>
                    <p className="text-white/85 leading-relaxed flex-1">
                      {promo.description}
                    </p>
                    <a
                      href={WHATSAPP_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 bg-white text-zinc-900 font-bold px-6 py-3 rounded-full text-sm mt-6 self-start hover:scale-105 transition-transform"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Quiero esta promo
                    </a>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          8. NUESTRO EQUIPO
      ═══════════════════════════════════════════════════════════════ */}
      <section
        id="equipo"
        className="px-4 py-20 md:py-28 bg-white dark:bg-zinc-950"
      >
        <div className="max-w-6xl mx-auto">
          <AnimatedSection>
            <div className="text-center mb-14">
              <span className="text-accent font-semibold text-sm uppercase tracking-widest">
                Las chicas
              </span>
              <h2 className="text-3xl md:text-5xl font-bold mt-3 text-zinc-900 dark:text-zinc-100">
                Nuestro Equipo
              </h2>
              <p className="text-zinc-600 dark:text-zinc-400 mt-4 max-w-xl mx-auto text-lg">
                Profesionales apasionadas por la belleza
              </p>
            </div>
          </AnimatedSection>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {teamMembers.map((member, i) => (
              <AnimatedSection key={member.name} delay={i * 0.1}>
                <div className="group text-center">
                  {/* Avatar placeholder */}
                  <div className="relative w-36 h-36 mx-auto mb-5">
                    {/* TODO: Reemplazar con <Image src="/team/nombre.jpg" /> */}
                    <div
                      className="w-full h-full rounded-full flex items-center justify-center text-white text-5xl font-bold shadow-lg group-hover:scale-105 transition-transform duration-300"
                      style={{ backgroundColor: member.color }}
                    >
                      {member.name[0]}
                    </div>
                    <div
                      className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full border-4 border-white dark:border-zinc-950 flex items-center justify-center"
                      style={{ backgroundColor: member.color }}
                    >
                      <Sparkles className="w-3.5 h-3.5 text-white" />
                    </div>
                  </div>

                  <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                    {member.name}
                  </h3>
                  <p
                    className="font-semibold text-sm mt-1"
                    style={{ color: member.color }}
                  >
                    {member.role}
                  </p>
                  <p className="text-zinc-600 dark:text-zinc-400 text-sm mt-2">
                    {member.speciality}
                  </p>
                  <p className="text-zinc-500 italic text-sm mt-2">
                    &ldquo;{member.phrase}&rdquo;
                  </p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          9. UBICACIÓN Y HORARIOS
      ═══════════════════════════════════════════════════════════════ */}
      <section
        id="contacto"
        className="px-4 py-20 md:py-28 bg-zinc-50 dark:bg-zinc-900/30"
      >
        <div className="max-w-6xl mx-auto">
          <AnimatedSection>
            <div className="text-center mb-14">
              <span className="text-accent font-semibold text-sm uppercase tracking-widest">
                Encuéntranos
              </span>
              <h2 className="text-3xl md:text-5xl font-bold mt-3 text-zinc-900 dark:text-zinc-100">
                Ubicación y Horarios
              </h2>
            </div>
          </AnimatedSection>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Map placeholder */}
            <AnimatedSection>
              <div className="rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-sm h-80 lg:h-full min-h-[320px]">
                {/* TODO: Reemplazar con Google Maps embed real:
                     <iframe
                       src="https://www.google.com/maps/embed?pb=DIRECCION_REAL"
                       width="100%" height="100%" style={{ border: 0 }}
                       loading="lazy"
                     /> */}
                <div className="w-full h-full bg-gradient-to-br from-primary/5 to-accent/5 flex items-center justify-center">
                  <div className="text-center px-4">
                    <MapPin className="w-12 h-12 text-primary mx-auto mb-3" />
                    <p className="text-zinc-600 dark:text-zinc-400 font-medium">
                      Mapa de Google próximamente
                    </p>
                    <p className="text-sm text-zinc-500 mt-1">
                      Reemplaza con el embed de Google Maps
                    </p>
                  </div>
                </div>
              </div>
            </AnimatedSection>

            {/* Info cards */}
            <AnimatedSection delay={0.2}>
              <div className="space-y-6">
                {/* Horario */}
                <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                      Horario de Atención
                    </h3>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between py-2 border-b border-zinc-100 dark:border-zinc-800">
                      <span className="text-zinc-600 dark:text-zinc-400">
                        Lunes a Sábado
                      </span>
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                        10:00 AM - 7:00 PM
                      </span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-zinc-600 dark:text-zinc-400">
                        Domingos
                      </span>
                      <span className="font-semibold text-accent">
                        Previa cita: 10:30 AM - 1:00 PM
                      </span>
                    </div>
                  </div>
                </div>

                {/* Ubicación */}
                <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                      Dirección
                    </h3>
                  </div>
                  <p className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed">
                    Calle Artesanos 150, Local 205
                    <br />
                    CC. Las Plazuelas de Surco
                    <br />
                    Santiago de Surco, Lima
                  </p>
                </div>

                {/* Contacto rápido */}
                <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Phone className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                      Contacto Directo
                    </h3>
                  </div>
                  <a
                    href={WHATSAPP_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-green-500 text-white font-semibold px-5 py-2.5 rounded-full text-sm hover:bg-green-600 transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Escribir por WhatsApp
                  </a>
                </div>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          10. CTA FINAL
      ═══════════════════════════════════════════════════════════════ */}
      <section className="relative px-4 py-24 md:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-purple-800 to-primary" />
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-accent/10 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-white/5 blur-3xl" />
        </div>

        <div className="relative z-10 max-w-3xl mx-auto text-center space-y-8">
          <AnimatedSection>
            <h2 className="text-3xl md:text-5xl font-bold text-white leading-tight">
              Tu transformación
              <br />
              <span className="text-accent">empieza hoy</span>
            </h2>
          </AnimatedSection>

          <AnimatedSection delay={0.1}>
            <p className="text-lg text-white/80 max-w-xl mx-auto">
              Agenda tu cita ahora y descubre por qué más de 500 clientas
              confían en nosotras para lucir su mejor versión
            </p>
          </AnimatedSection>

          <AnimatedSection delay={0.2}>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 bg-accent text-black font-bold px-10 py-5 rounded-full text-lg hover:scale-105 hover:shadow-xl hover:shadow-accent/25 transition-all duration-300"
            >
              <MessageCircle className="w-6 h-6" />
              Agendar mi Cita Ahora
            </a>
          </AnimatedSection>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          11. FOOTER
      ═══════════════════════════════════════════════════════════════ */}
      <footer className="bg-zinc-900 dark:bg-black text-white">
        <div className="max-w-6xl mx-auto px-4 py-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {/* Brand */}
            <div>
              <img
                src="/logo-positivo.png"
                alt="ZM Lash & Nails Beauty"
                className="h-14 w-auto object-contain mb-4"
              />
              <p className="text-zinc-400 text-sm leading-relaxed">
                Salón de belleza especializado en realzar tu belleza natural con
                tratamientos profesionales de primer nivel.
              </p>
            </div>

            {/* Links rápidos */}
            <div>
              <h4 className="font-bold text-lg mb-4">Links Rápidos</h4>
              <ul className="space-y-2">
                {[
                  { label: "Servicios", href: "#servicios" },
                  { label: "Resultados", href: "#resultados" },
                  { label: "Testimonios", href: "#testimonios" },
                  { label: "Promociones", href: "#promos" },
                  { label: "Equipo", href: "#equipo" },
                  { label: "Contacto", href: "#contacto" },
                ].map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      className="text-zinc-400 hover:text-accent transition-colors text-sm"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
                <li>
                  <a
                    href="/finanzas"
                    className="inline-flex items-center gap-1.5 text-zinc-500 hover:text-accent transition-colors text-xs mt-2"
                  >
                    <Crown className="w-3 h-3" />
                    Panel Interno
                  </a>
                </li>
              </ul>
            </div>

            {/* Redes sociales */}
            <div>
              <h4 className="font-bold text-lg mb-4">Síguenos</h4>
              <div className="flex gap-3">
                <a
                  href="https://wa.me/51932535512"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center hover:bg-green-600 transition-colors"
                  aria-label="WhatsApp"
                >
                  <Phone className="w-5 h-5" />
                </a>
                <a
                  href="https://instagram.com/zmlashandnails"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center hover:bg-pink-600 transition-colors"
                  aria-label="Instagram"
                >
                  <Instagram className="w-5 h-5" />
                </a>
                <a
                  href="https://facebook.com/ZMLashAndNailsBeauty"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center hover:bg-blue-600 transition-colors"
                  aria-label="Facebook"
                >
                  <Facebook className="w-5 h-5" />
                </a>
                <a
                  href="https://tiktok.com/@zm.lash.and.nails"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center hover:bg-zinc-700 transition-colors"
                  aria-label="TikTok"
                >
                  <Music2 className="w-5 h-5" />
                </a>
              </div>
              <div className="mt-6">
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-accent hover:text-accent/80 transition-colors text-sm font-semibold"
                >
                  <MessageCircle className="w-4 h-4" />
                  +51 932 535 512
                </a>
              </div>
            </div>
          </div>

          <div className="border-t border-zinc-800 mt-12 pt-8 text-center">
            <p className="text-sm text-zinc-500">
              © 2026 ZM Lash & Nails Beauty. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
