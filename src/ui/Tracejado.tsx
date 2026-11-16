import React from 'react';
import Svg, { Line } from 'react-native-svg';

/** Linha tracejada horizontal (o Android não desenha borda tracejada de um lado só). */
export function Tracejado({ cor, espessura = 1, traco = 3, vao = 3 }: { cor: string; espessura?: number; traco?: number; vao?: number }) {
  return (
    <Svg height={espessura} width="100%">
      <Line x1={0} y1={espessura / 2} x2="100%" y2={espessura / 2} stroke={cor} strokeWidth={espessura} strokeDasharray={[traco, vao]} />
    </Svg>
  );
}
