import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion'
import { BRAND } from '../brand'

/** Fondo oscuro con dos halos de la paleta que se desplazan lento. */
export const Backdrop = ({ accent = BRAND.primary }: { accent?: string }) => {
  const frame = useCurrentFrame()
  const { durationInFrames } = useVideoConfig()

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bg, overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute',
          width: 1100,
          height: 1100,
          left: -380,
          top: -260,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${accent}55 0%, transparent 65%)`,
          translate: interpolate(frame, [0, durationInFrames], ['0px 0px', '60px 90px']),
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: 1200,
          height: 1200,
          right: -520,
          bottom: -360,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${BRAND.indigo}66 0%, transparent 65%)`,
          translate: interpolate(frame, [0, durationInFrames], ['0px 0px', '-50px -70px']),
        }}
      />
    </AbsoluteFill>
  )
}
