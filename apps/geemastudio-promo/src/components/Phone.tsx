import type { ReactNode } from 'react'
import { PhoneFrame } from '@geemastudio/mockups'
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from 'remotion'
import { FONT, PHONE_WIDTH } from '../brand'

type Props = {
  children: ReactNode
  /** Color del halo detrás del teléfono. */
  glow: string
  top?: number
  statusBarColor?: string
  screenBackground?: string
}

/** Teléfono centrado que sube al entrar y hace un zoom lento durante la escena. */
export const Phone = ({ children, glow, top = 470, statusBarColor, screenBackground }: Props) => {
  const frame = useCurrentFrame()
  const { fps, durationInFrames } = useVideoConfig()

  return (
    <div
      style={{
        position: 'absolute',
        top,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        translate: interpolate(frame, [0, 0.7 * fps], ['0px 120px', '0px 0px'], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: Easing.bezier(0.16, 1, 0.3, 1),
        }),
        scale: interpolate(frame, [0, durationInFrames], [1, 1.035]),
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 120,
          width: PHONE_WIDTH * 1.25,
          height: PHONE_WIDTH * 1.6,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${glow}40 0%, transparent 68%)`,
        }}
      />
      <PhoneFrame
        width={PHONE_WIDTH}
        fontFamily={FONT}
        statusBarColor={statusBarColor}
        screenBackground={screenBackground}
        style={{ boxShadow: '0 60px 120px rgba(0,0,0,0.55)' }}
      >
        {children}
      </PhoneFrame>
    </div>
  )
}
