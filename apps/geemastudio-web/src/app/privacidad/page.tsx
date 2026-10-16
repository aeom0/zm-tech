import type { Metadata } from 'next'

import { LegalDocument } from '@/components/legal/LegalDocument'
import { privacyPage } from '@/content/legal'
import { getSiteUrl } from '@/lib/site-url'

export const metadata: Metadata = {
  title: `${privacyPage.title} — GeemaStudio`,
  description: privacyPage.metaDescription,
  alternates: {
    canonical: `${getSiteUrl()}/privacidad`,
  },
}

export default function PrivacidadPage() {
  return <LegalDocument path="privacidad" document={privacyPage} />
}
