import { Github, Linkedin, Twitter } from 'lucide-react'
import Link from 'next/link'
import LogoZMTech from '@/components/brand/LogoZMTech'
import type { Locale } from '@/content/locales'
import type { FooterMessages } from '@/content/messages'

type Props = {
  locale: Locale
  messages: FooterMessages
}

const solutionIds = ['ZM Industrial Core', 'ZM Beauty Engine', 'ZM Workshop & Parts'] as const

export default function Footer({ locale, messages }: Props) {
  return (
    <footer className="border-t border-white/10 bg-black pt-16 pb-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 grid grid-cols-1 gap-12 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="mb-4 flex items-center gap-2">
              <LogoZMTech className="items-center" href={`/${locale}`} ariaLabel={messages.homeAria} />
            </div>
            <p className="max-w-sm text-sm leading-relaxed text-gray-500">{messages.blurb}</p>
          </div>

          <div>
            <h3 className="mb-4 font-mono text-xs tracking-widest text-white/60 uppercase">
              {messages.solutionsTitle}
            </h3>
            <ul className="space-y-2">
              {solutionIds.map((item) => (
                <li key={item}>
                  <Link
                    href={`/${locale}#verticales`}
                    className="text-sm text-gray-500 transition-colors hover:text-white"
                  >
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-4 font-mono text-xs tracking-widest text-white/60 uppercase">
              {messages.followTitle}
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

        <div className="flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-8 text-xs text-gray-600 sm:flex-row sm:gap-2">
          <span>
            © {new Date().getFullYear()} ZM Tech. {messages.rights}
          </span>
          <div className="flex items-center gap-4">
            <Link
              href={`/${locale}/privacidad`}
              className="transition-colors hover:text-white"
            >
              {messages.privacy}
            </Link>
            <Link href={`/${locale}/terminos`} className="transition-colors hover:text-white">
              {messages.terms}
            </Link>
            <span className="hidden sm:inline">{messages.madeIn}</span>
          </div>
        </div>
        <p className="mt-3 text-center text-xs text-gray-600 sm:hidden">{messages.madeIn}</p>      </div>
    </footer>
  )
}
