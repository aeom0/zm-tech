import type { TenantLandingData, WebReview } from '@/types/tenant-landing'
import type { LandingTheme } from '../theme/types'
import { ReviewStars } from '../shared/ReviewStars'

interface TestimonialsSectionProps {
  data: TenantLandingData
  theme: LandingTheme
}

export function TestimonialsSection({ data, theme }: TestimonialsSectionProps) {
  const { reviews } = data
  if (reviews.length === 0) return null

  const hasPhotos = reviews.some((r) => !!r.photoUrl)

  const heading =
    theme.id === 'elegant'
      ? 'Lo que dicen nuestras clientas'
      : theme.id === 'warm'
        ? 'Lo que dicen'
        : 'Ellas confían en nosotras.'

  function ReviewCard({ review }: { review: WebReview }) {
    return (
      <div
        className={`rounded-2xl border p-5 ${hasPhotos ? 'w-[260px] flex-shrink-0 snap-center' : 'mb-2.5 last:mb-0'}`}
        style={{ borderColor: theme.colors.cardBorder, background: theme.colors.cardBg }}
      >
        <ReviewStars color={theme.colors.secondaryAccent} />
        <p className="text-sm leading-relaxed" style={{ color: theme.colors.textMuted }}>
          &ldquo;{review.text}&rdquo;
        </p>
        <div className="mt-3.5 flex items-center gap-2.5">
          {review.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={review.photoUrl} alt={review.author} className="h-8 w-8 flex-shrink-0 rounded-full object-cover" />
          ) : (
            <div
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[13px] font-bold"
              style={{ background: theme.accentBackground, color: theme.colors.accentOn }}
            >
              {review.initial}
            </div>
          )}
          <div>
            <div className="text-[13px] font-semibold" style={{ color: theme.colors.text }}>
              {review.author}
            </div>
            <div className="text-[11px]" style={{ color: theme.colors.textFaint }}>
              {review.role}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <section className="border-t px-5 py-14" style={{ background: theme.colors.bgAlt, borderColor: theme.colors.divider }}>
      <p className="mb-1 text-[11px] uppercase tracking-[0.2em]" style={{ color: theme.colors.textFaint }}>
        Reseñas
      </p>
      <h2 className="mb-5 text-[26px] font-bold tracking-tight" style={{ color: theme.colors.text }}>
        {heading}
      </h2>
      {hasPhotos ? (
        <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2">
          {reviews.map((review, i) => (
            <ReviewCard key={i} review={review} />
          ))}
        </div>
      ) : (
        <div>
          {reviews.map((review, i) => (
            <ReviewCard key={i} review={review} />
          ))}
        </div>
      )}
    </section>
  )
}
