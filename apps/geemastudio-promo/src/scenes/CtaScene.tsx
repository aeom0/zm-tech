import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion'
import { BRAND, FONT } from '../brand'
import { Backdrop } from '../components/Backdrop'

/** Cierre con marca y llamada a la acción. */
export const CtaScene = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const enter = (delay: number) => ({
    opacity: interpolate(frame, [delay * fps, (delay + 0.4) * fps], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }),
    translate: interpolate(frame, [delay * fps, (delay + 0.6) * fps], ['0px 40px', '0px 0px'], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.bezier(0.16, 1, 0.3, 1),
    }),
  })

  return (
    <AbsoluteFill
      style={{
        fontFamily: FONT,
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '0 80px',
      }}
    >
      <Backdrop accent={BRAND.primary} />
      <Img
        src={staticFile('logo-diamondSparkle.svg')}
        style={{
          width: 300,
          height: 335,
          scale: interpolate(frame, [0, 0.7 * fps], [0.6, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            easing: Easing.bezier(0.34, 1.56, 0.64, 1),
          }),
          opacity: interpolate(frame, [0, 0.3 * fps], [0, 1], { extrapolateRight: 'clamp' }),
        }}
      />
      <div style={{ ...enter(0.25), marginTop: 40, fontSize: 120, fontWeight: 800, letterSpacing: -3 }}>
        <span style={{ color: BRAND.text }}>Geema</span>
        <span
          style={{
            backgroundImage: BRAND.gradient,
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
          }}
        >
          Studio
        </span>
      </div>
      <div
        style={{
          ...enter(0.45),
          marginTop: 24,
          fontSize: 48,
          lineHeight: 1.25,
          color: BRAND.textSecondary,
        }}
      >
        Agenda, WhatsApp y finanzas
        <br />
        para tu salón, en un solo lugar
      </div>
      <div
        style={{
          ...enter(0.75),
          marginTop: 80,
          padding: '34px 70px',
          borderRadius: 999,
          backgroundImage: BRAND.gradient,
          color: '#FFFFFF',
          fontSize: 54,
          fontWeight: 800,
          boxShadow: `0 24px 70px ${BRAND.primary}55`,
        }}
      >
        Prueba gratis 14 días
      </div>
      <div style={{ ...enter(1.0), marginTop: 36, fontSize: 40, color: BRAND.textSecondary }}>
        Link en la bio
      </div>
    </AbsoluteFill>
  )
}
