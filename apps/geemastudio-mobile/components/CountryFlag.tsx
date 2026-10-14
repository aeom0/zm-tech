import React from 'react'
import { View, StyleSheet } from 'react-native'
import { SvgXml } from 'react-native-svg'

import type { CountryCode } from '@zmtech/tenant-config'

import {
  AR,
  BO,
  CL,
  CO,
  CR,
  CU,
  DO,
  EC,
  GT,
  HN,
  MX,
  NI,
  PA,
  PE,
  PY,
  SV,
  UY,
  VE,
} from './country-flag-svgs'

const FLAGS: Record<CountryCode, string> = {
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
  const xml = FLAGS[code]
  const height = width * (2 / 3)

  if (!xml) return null

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
      <SvgXml xml={xml} width={width} height={height} />
    </View>
  )
}

const styles = StyleSheet.create({
  clip: {
    overflow: 'hidden',
  },
})
