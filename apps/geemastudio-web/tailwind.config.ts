import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#00897B',
        primaryLight: '#B2DFDB',
        accent: '#D4AF37',
        accentLight: '#F5E6D3',
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        // Tokens semánticos del shell (claro/oscuro vía clase `dark`)
        app: 'rgb(var(--app-rgb) / <alpha-value>)',
        surface: 'rgb(var(--surface-rgb) / <alpha-value>)',
        fg: 'rgb(var(--fg-rgb) / <alpha-value>)',
        'fg-soft': 'rgb(var(--fg-soft-rgb) / <alpha-value>)',
        'fg-muted': 'rgb(var(--fg-muted-rgb) / <alpha-value>)',
        'fg-subtle': 'rgb(var(--fg-subtle-rgb) / <alpha-value>)',
        'tenant-text': 'var(--tenant-text)',
        elevated: 'rgb(var(--elevated-rgb) / <alpha-value>)',
        'elevated-2': 'rgb(var(--elevated-2-rgb) / <alpha-value>)',
        sunken: 'rgb(var(--sunken-rgb) / <alpha-value>)',
        line: 'rgb(var(--line-rgb) / <alpha-value>)',
        'line-strong': 'rgb(var(--line-strong-rgb) / <alpha-value>)',
        card: 'var(--card)',
        scrim: 'rgb(var(--scrim-rgb) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Playfair Display', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
}

export default config
