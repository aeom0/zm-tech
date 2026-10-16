import { AgendaScreen } from '@geemastudio/mockups'
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from 'remotion'
import { BRAND, FONT } from '../brand'
import { Backdrop } from '../components/Backdrop'
import { Headline } from '../components/Headline'
import { Phone } from '../components/Phone'

/** La cita del chat (Sofía, 12:30 con Valeria) aparece sola en la agenda. */
export const AgendaScene = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <Backdrop accent={BRAND.primary} />
      <Headline text="Y la cita entra sola a tu agenda" highlight="sola" top={140} />
      <Phone glow={BRAND.primary} top={430}>
        <AgendaScreen
          enteringId="a6"
          enterProgress={interpolate(frame, [1.0 * fps, 1.6 * fps], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            easing: Easing.bezier(0.34, 1.56, 0.64, 1),
          })}
        />
      </Phone>
    </AbsoluteFill>
  )
}
