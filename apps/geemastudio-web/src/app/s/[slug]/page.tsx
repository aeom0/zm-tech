import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTenantLandingBySlug } from "@/lib/tenant-landing-service";
import { TenantLandingElegant } from "@/components/tenant-landing/TenantLandingElegant";
import { TenantLandingWarm } from "@/components/tenant-landing/TenantLandingWarm";
import { TenantLandingModern } from "@/components/tenant-landing/TenantLandingModern";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await getTenantLandingBySlug(slug);

  if (!data) {
    return { title: "Salón no encontrado — GeemaStudio" };
  }

  const description =
    data.heroTagline ??
    data.tagline ??
    `Reserva tu cita en ${data.businessName}. Servicio profesional en ${data.city ?? "tu ciudad"}.`;

  return {
    title: `${data.businessName} — Reserva tu cita`,
    description,
    openGraph: {
      title: data.businessName,
      description,
      type: "website",
    },
  };
}

export const revalidate = 300;

export default async function TenantLandingPage({ params }: Props) {
  const { slug } = await params;
  const data = await getTenantLandingBySlug(slug);

  if (!data) notFound();

  const templateMap = {
    elegant: TenantLandingElegant,
    warm: TenantLandingWarm,
    modern: TenantLandingModern,
  } as const;

  const Template = templateMap[data.webTemplate] ?? TenantLandingElegant;

  return <Template data={data} />;
}
