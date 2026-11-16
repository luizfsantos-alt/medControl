import React from 'react';
import Svg, { G, Rect } from 'react-native-svg';

export function Marca({ cor, tam = 30 }: { cor: string; tam?: number }) {
  return (
    <Svg width={tam} height={tam} viewBox="-38 -38 76 76">
      <G rotation={-45}>
        <Rect x={-34} y={-17} width={68} height={34} fill="none" stroke={cor} strokeWidth={2} />
        <Rect x={-1} y={-17} width={2} height={34} fill={cor} />
        <Rect x={-31} y={-14} width={28} height={28} fill="#C8F031" />
        <Rect x={3} y={-14} width={28} height={28} fill={cor} />
      </G>
    </Svg>
  );
}
