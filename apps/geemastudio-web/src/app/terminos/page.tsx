import type { Metadata } from 'next'

import { LegalDocument } from '@/components/legal/LegalDocument'
import { termsPage } from '@/content/legal'
import { getSiteUrl } from '@/lib/site-url'

export const metadata: Metadata = {
  title: `${termsPage.title} — GeemaStudio`,
  description: termsPage.metaDescription,
  alternates: {
    canonical: `${getSiteUrl()}/terminos`,
  },
}

export default function TerminosPage() {
  return <LegalDocument path="terminos" document={termsPage} />
}
