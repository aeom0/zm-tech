import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getTenantLandingByDomain } from '@/lib/tenant-landing-service'
import { buildTenantLandingMetadata, TENANT_LANDING_TEMPLATES } from '@/lib/tenant-landing-render'

interface Props {
  params: Promise<{ domain: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { domain } = await params
  const data = await getTenantLandingByDomain(domain)
  return buildTenantLandingMetadata(data)
}

export const revalidate = 300

export default async function TenantCustomDomainPage({ params }: Props) {
  const { domain } = await params
  const data = await getTenantLandingByDomain(domain)

  if (!data) notFound()

  const Template = TENANT_LANDING_TEMPLATES[data.webTemplate] ?? TENANT_LANDING_TEMPLATES.elegant
  return <Template data={data} />
}
