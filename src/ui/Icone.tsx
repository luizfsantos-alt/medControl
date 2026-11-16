import React from 'react';
import Svg, { Path, Rect } from 'react-native-svg';

export type NomeIcone = 'ajustes' | 'mais' | 'menos' | 'editar' | 'seta';

/** Ícones próprios (BRIEFING §3.5): traço 1,5, pontas quadradas, sem preenchimento. */
export function Icone({ nome, cor, tam = 20, grosso = false }: { nome: NomeIcone; cor: string; tam?: number; grosso?: boolean }) {
  const p = { stroke: cor, strokeWidth: grosso ? 2 : 1.5, strokeLinecap: 'square' as const, strokeLinejoin: 'miter' as const, fill: 'none' };
  return (
    <Svg width={tam} height={tam} viewBox="0 0 24 24">
      {nome === 'ajustes' && (
        <>
          <Path d="M3 7h11M19 7h2M3 17h3M11 17h10" {...p} />
          <Rect x={14} y={4.5} width={5} height={5} {...p} />
          <Rect x={6} y={14.5} width={5} height={5} {...p} />
        </>
      )}
      {nome === 'mais' && <Path d="M12 4v16M4 12h16" {...p} />}
      {nome === 'menos' && <Path d="M4 12h16" {...p} />}
      {nome === 'editar' && <Path d="M4 20v-4L15.5 4.5l4 4L8 20H4zM13 7l4 4" {...p} />}
      {nome === 'seta' && <Path d="M9 5l7 7-7 7" {...p} />}
    </Svg>
  );
}
