'use client'

/** Emojis rápidos (también se usan en las listas WABA). Mismo set que el panel de ZM Lash. */
export const PACK_QUICK_EMOJIS = [
  '✨',
  '💅',
  '👁️',
  '🪷',
  '🎨',
  '🌿',
  '💜',
  '🌟',
  '🎁',
  '👑',
  '💝',
  '🔥',
] as const

/** Promos: igual que ZM Lash, con la calabaza de temporada al inicio. */
export const PROMO_QUICK_EMOJIS = ['🎃', ...PACK_QUICK_EMOJIS] as const

export const DEFAULT_CATALOG_EMOJI = '✨'

interface Props {
  emojis: readonly string[]
  value: string
  onChange: (emoji: string) => void
}

export function EmojiPicker({ emojis, value, onChange }: Props) {
  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-1.5">
        {emojis.map((e) => (
          <button
            key={e}
            type="button"
            title={e}
            onClick={() => onChange(e)}
            className={`h-9 min-w-[36px] rounded-lg border text-lg transition-colors ${
              value === e
                ? 'bg-[var(--tenant-primary)]/15 border-[var(--tenant-primary)]'
                : 'border-fg/10 bg-fg/5 hover:bg-fg/10'
            }`}
          >
            {e}
          </button>
        ))}
      </div>
      <input
        type="text"
        maxLength={8}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-fg/10 bg-fg/5 px-3 py-2 text-base text-fg focus:border-[var(--tenant-primary)] focus:outline-none md:text-sm"
        placeholder="Otro emoji (opcional)"
        aria-label="Emoji personalizado"
      />
    </div>
  )
}
