import React, { useId } from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Defs, Pattern, Rect } from 'react-native-svg';

/**
 * repeating-linear-gradient(-45deg, hatch 0 1.5px, transparent 1.5px 8px), fundo.
 * O período de 8px do CSS é medido ao longo da diagonal.
 */
export function Hachura({ linha, fundo, periodo = 8, espessura = 1.5 }: { linha: string; fundo?: string; periodo?: number; espessura?: number }) {
  const id = `h${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
      <Defs>
        <Pattern id={id} patternUnits="userSpaceOnUse" width={periodo} height={periodo} patternTransform="rotate(45)">
          <Rect x={0} y={0} width={espessura} height={periodo} fill={linha} />
        </Pattern>
      </Defs>
      {fundo ? <Rect x={0} y={0} width="100%" height="100%" fill={fundo} /> : null}
      <Rect x={0} y={0} width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}
