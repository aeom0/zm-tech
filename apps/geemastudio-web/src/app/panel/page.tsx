import { redirect } from 'next/navigation'

/** `/panel` sin subruta → catálogo (ruta histórica post-login). */
export default function PanelIndexPage() {
  redirect('/panel/servicios')
}
