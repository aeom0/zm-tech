import { Github, Linkedin, Twitter } from 'lucide-react'
import Link from 'next/link'
import LogoZMTech from '@/components/brand/LogoZMTech'

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-black pt-16 pb-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 grid grid-cols-1 gap-12 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="mb-4 flex items-center gap-2">
              <LogoZMTech className="items-center" />
            </div>
            <p className="max-w-sm text-sm leading-relaxed text-gray-500">
              Hacemos realidad las ideas de negocios que necesitan software a medida. Rápido, robusto y con soporte real.
            </p>
          </div>

          {/* Módulos */}
          <div>
            <h3 className="mb-4 font-mono text-xs tracking-widest text-white/60 uppercase">
              Nuestras soluciones
            </h3>
            <ul className="space-y-2">
              {['ZM Industrial Core', 'ZM Beauty Engine', 'ZM Workshop & Parts'].map((item) => (
                <li key={item}>
                  <Link
                    href="#verticales"
                    className="text-sm text-gray-500 transition-colors hover:text-white"
                  >
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Social */}
          <div>
            <h3 className="mb-4 font-mono text-xs tracking-widest text-white/60 uppercase">
              Síguenos
            </h3>
            <div className="flex gap-3">
              {[
                { icon: Github, label: 'GitHub' },
                { icon: Linkedin, label: 'LinkedIn' },
                { icon: Twitter, label: 'Twitter' },
              ].map(({ icon: Icon, label }) => (
                <Link
                  key={label}
                  href="#"
                  aria-label={label}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-gray-400 transition-all duration-200 hover:border-violet-500/50 hover:bg-violet-500/20 hover:text-white"
                >
                  <Icon className="h-4 w-4" />
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col items-center justify-between gap-2 border-t border-white/10 pt-8 text-xs text-gray-600 sm:flex-row">
          <span>© {new Date().getFullYear()} ZM Tech. Todos los derechos reservados.</span>
          <span>Hecho con ⚡ en Venezuela</span>
        </div>
      </div>
    </footer>
  )
}
