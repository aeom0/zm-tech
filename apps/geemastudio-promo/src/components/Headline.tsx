import { Easing, interpolate, useCurrentFrame, useVideoConfig } from 'remotion'
import { BRAND, FONT } from '../brand'

type Props = {
  /** Texto principal; la parte en `highlight` va con el gradiente de marca. */
  text: string
  highlight?: string
  /** Frame (relativo a la escena) en que empieza a entrar. */
  delay?: number
  top?: number
  fontSize?: number
}

/** Titular de escena, centrado arriba, dentro del área segura. */
export const Headline = ({ text, highlight, delay = 0, top = 150, fontSize = 84 }: Props) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const [before, after] = highlight ? text.split(highlight) : [text, '']

  return (
    <div
      style={{
        position: 'absolute',
        top,
        left: 80,
        right: 80,
        textAlign: 'center',
        fontFamily: FONT,
        fontSize,
        fontWeight: 800,
        lineHeight: 1.08,
        letterSpacing: -1.5,
        color: BRAND.text,
        opacity: interpolate(frame, [delay, delay + 0.4 * fps], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        }),
        translate: interpolate(frame, [delay, delay + 0.6 * fps], ['0px 40px', '0px 0px'], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: Easing.bezier(0.16, 1, 0.3, 1),
        }),
      }}
    >
      {before}
      {highlight ? (
        <span
          style={{
            backgroundImage: BRAND.gradient,
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
          }}
        >
          {highlight}
        </span>
      ) : null}
      {after}
    </div>
  )
}
