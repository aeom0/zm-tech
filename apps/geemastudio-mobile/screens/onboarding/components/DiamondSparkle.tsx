import React from "react";
import { SvgXml } from "react-native-svg";

const SVG_SOURCE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -8 260 290">
  <defs>
    <linearGradient id="g-tabla" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="#FFFFFF" stop-opacity="1.0"/>
      <stop offset="100%" stop-color="#AAAAAA" stop-opacity="1.0"/>
    </linearGradient>
    <linearGradient id="sp-up" x1="130" y1="94" x2="130" y2="-4" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0.0"/>
    </linearGradient>
    <linearGradient id="sp-down" x1="130" y1="94" x2="130" y2="192" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0.0"/>
    </linearGradient>
    <linearGradient id="sp-diag-ul" x1="130" y1="94" x2="55" y2="12" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0.0"/>
    </linearGradient>
    <linearGradient id="sp-diag-ur" x1="130" y1="94" x2="205" y2="12" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0.0"/>
    </linearGradient>
    <linearGradient id="sp-diag-dl" x1="130" y1="94" x2="55" y2="177" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0.0"/>
    </linearGradient>
    <linearGradient id="sp-diag-dr" x1="130" y1="94" x2="205" y2="177" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0.0"/>
    </linearGradient>
    <linearGradient id="border-grad" x1="0" y1="85" x2="0" y2="270" gradientUnits="userSpaceOnUse">
      <stop offset="0%"   stop-color="#FFFFFF" stop-opacity="0.2"/>
      <stop offset="40%"  stop-color="#FFFFFF" stop-opacity="0.06"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0.0"/>
    </linearGradient>
    <radialGradient id="rg-center" cx="130" cy="94" r="73" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0.0"/>
    </radialGradient>
    <linearGradient id="outer-grad" x1="0" y1="85" x2="0" y2="270" gradientUnits="userSpaceOnUse">
      <stop offset="0%"   stop-color="#FFFFFF" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0.12"/>
    </linearGradient>
  </defs>
  <polygon points="74,85  101,85  95,128"       fill="#888888"/>
  <polygon points="74,85  95,128  26,128"        fill="#444444"/>
  <polygon points="101,85 159,85 165,128 95,128" fill="url(#g-tabla)"/>
  <polygon points="159,85 186,85 165,128"        fill="#2A2A2A"/>
  <polygon points="186,85 234,128 165,128"       fill="#111111"/>
  <polygon points="26,132  95,132  130,270"  fill="#909090"/>
  <polygon points="95,132  165,132 130,270"  fill="#1A1A1A"/>
  <polygon points="165,132 234,132 130,270"  fill="#606060"/>
  <polygon points="74,85  186,85  234,130  130,270  26,130" fill="none" stroke="url(#outer-grad)" stroke-width="3"/>
  <polygon points="74,85  101,85  95,128"       fill="none" stroke="url(#border-grad)" stroke-width="0.7"/>
  <polygon points="74,85  95,128  26,128"        fill="none" stroke="url(#border-grad)" stroke-width="0.7"/>
  <polygon points="101,85 159,85 165,128 95,128" fill="none" stroke="url(#border-grad)" stroke-width="0.7"/>
  <polygon points="159,85 186,85 165,128"        fill="none" stroke="url(#border-grad)" stroke-width="0.7"/>
  <polygon points="186,85 234,128 165,128"       fill="none" stroke="url(#border-grad)" stroke-width="0.7"/>
  <polygon points="26,132  95,132  130,270"      fill="none" stroke="url(#border-grad)" stroke-width="0.7"/>
  <polygon points="95,132  165,132 130,270"      fill="none" stroke="url(#border-grad)" stroke-width="0.7"/>
  <polygon points="165,132 234,132 130,270"      fill="none" stroke="url(#border-grad)" stroke-width="0.7"/>
  <polygon points="127.5,94  132.5,94  130,-4"          fill="url(#sp-up)"/>
  <polygon points="127.5,94  132.5,94  130,192"         fill="url(#sp-down)"/>
  <polygon points="128.16,95.68  131.84,92.32  55,12"   fill="url(#sp-diag-ul)"/>
  <polygon points="128.16,92.32  131.84,95.68  205,12"  fill="url(#sp-diag-ur)"/>
  <polygon points="128.14,92.32  131.86,95.68  55,177"  fill="url(#sp-diag-dl)"/>
  <polygon points="128.14,95.68  131.86,92.32  205,177" fill="url(#sp-diag-dr)"/>
  <circle cx="130" cy="94" r="73" fill="url(#rg-center)"/>
</svg>`;

interface DiamondSparkleProps {
  size?: number;
}

// viewBox es 260×290 → ratio alto/ancho = 290/260 ≈ 1.115
const ASPECT = 290 / 260;

export function DiamondSparkle({ size = 64 }: DiamondSparkleProps) {
  return <SvgXml xml={SVG_SOURCE} width={size} height={size * ASPECT} />;
}
