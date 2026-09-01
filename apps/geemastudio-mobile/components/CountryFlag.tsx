import React from 'react'
import { View, StyleSheet } from 'react-native'

import type { CountryCode } from '@zmtech/tenant-config'

import VE from 'country-flag-icons/3x2/VE.svg'
import PE from 'country-flag-icons/3x2/PE.svg'
import CO from 'country-flag-icons/3x2/CO.svg'
import EC from 'country-flag-icons/3x2/EC.svg'
import AR from 'country-flag-icons/3x2/AR.svg'
import CL from 'country-flag-icons/3x2/CL.svg'
import MX from 'country-flag-icons/3x2/MX.svg'
import BO from 'country-flag-icons/3x2/BO.svg'
import PY from 'country-flag-icons/3x2/PY.svg'
import UY from 'country-flag-icons/3x2/UY.svg'
import PA from 'country-flag-icons/3x2/PA.svg'
import DO from 'country-flag-icons/3x2/DO.svg'
import CR from 'country-flag-icons/3x2/CR.svg'
import GT from 'country-flag-icons/3x2/GT.svg'
import HN from 'country-flag-icons/3x2/HN.svg'
import NI from 'country-flag-icons/3x2/NI.svg'
import SV from 'country-flag-icons/3x2/SV.svg'
import CU from 'country-flag-icons/3x2/CU.svg'

const FLAGS: Record<CountryCode, React.FC<{ width?: number; height?: number }>> = {
  VE,
  PE,
  CO,
  EC,
  AR,
  CL,
  MX,
  BO,
  PY,
  UY,
  PA,
  DO,
  CR,
  GT,
  HN,
  NI,
  SV,
  CU,
}

interface CountryFlagProps {
  code: CountryCode
  width: number
  borderRadius?: number
  borderColor?: string
}

export function CountryFlag({ code, width, borderRadius = 6, borderColor }: CountryFlagProps) {
  const Flag = FLAGS[code]
  const height = width * (2 / 3)

  if (!Flag) return null

  return (
    <View
      style={[
        styles.clip,
        {
          width,
          height,
          borderRadius,
          borderColor,
          borderWidth: borderColor ? StyleSheet.hairlineWidth : 0,
        },
      ]}
    >
      <Flag width={width} height={height} />
    </View>
  )
}

const styles = StyleSheet.create({
  clip: {
    overflow: 'hidden',
  },
})
