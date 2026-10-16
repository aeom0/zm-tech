import { FinanzasScreen } from '@geemastudio/mockups'
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from 'remotion'
import { BRAND, FONT } from '../brand'
import { Backdrop } from '../components/Backdrop'
import { Headline } from '../components/Headline'
import { Phone } from '../components/Phone'

/** Ingresos y comisiones calculados, con el gráfico dibujándose. */
export const FinanzasScene = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <Backdrop accent="#C7A84D" />
      <Headline text="Y sabes cuánto ganas, sin Excel" highlight="cuánto ganas" top={140} />
      <Phone glow="#C7A84D" top={430}>
        <FinanzasScreen
          chartProgress={interpolate(frame, [0.5 * fps, 2.3 * fps], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            easing: Easing.bezier(0.45, 0, 0.2, 1),
          })}
        />
      </Phone>
    </AbsoluteFill>
  )
}
