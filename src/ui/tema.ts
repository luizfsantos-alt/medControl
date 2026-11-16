// Tokens "Rótulo de Farmácia" (docs/redesign/BRIEFING.md §3), iguais aos do PWA.
import { useColorScheme } from 'react-native';
import { Easing } from 'react-native-reanimated';

export interface Cores {
  paper: string;
  paper2: string;
  surface: string;
  ink: string;
  ink2: string;
  rule: string;
  hatch: string;
  lime: string;
  red: string;
  onSignal: string;
  scrim: string;
  escuro: boolean;
}

const CLARO: Cores = {
  paper: '#EFEBE3',
  paper2: '#E4DFD4',
  surface: '#F8F6F1',
  ink: '#121210',
  ink2: '#5C5850',
  rule: '#CBC4B6',
  hatch: '#B3AA99',
  lime: '#C8F031',
  red: '#FF3B1F',
  onSignal: '#121210',
  scrim: 'rgba(18,18,16,0.45)',
  escuro: false,
};

const ESCURO: Cores = {
  ...CLARO,
  paper: '#121210',
  paper2: '#1C1B18',
  surface: '#191815',
  ink: '#EFEBE3',
  ink2: '#9A958B',
  rule: '#34322D',
  hatch: '#45423B',
  scrim: 'rgba(0,0,0,0.6)',
  escuro: true,
};

export function useCores(): Cores {
  return useColorScheme() === 'dark' ? ESCURO : CLARO;
}

/** Famílias estáticas geradas do Archivo variável (largura/peso exatos do PWA). */
export const F = {
  relogio: 'Archivo-w66-850', // stretch 66%, 850: horários grandes, números
  titulo: 'Archivo-w70-850', // stretch 70%, 850: títulos de sheet, telas vazias
  marca: 'Archivo-w70-900', // stretch 70%, 900: marca no topo
  botao: 'Archivo-w82-800', // stretch 82%, 800: botões
  nome: 'Archivo-w88-750', // stretch 88%, 750: nome do remédio
  sans: 'Archivo-w100-400',
  sans500: 'Archivo-w100-500',
  sans600: 'Archivo-w100-600',
  sans700: 'Archivo-w100-700',
  mono: 'PlexMono-400',
  mono500: 'PlexMono-500',
  mono600: 'PlexMono-600',
  mono700: 'PlexMono-700',
} as const;

export const FONTES = {
  'Archivo-w66-850': require('../../assets/fonts/static/Archivo-w66-850.ttf'),
  'Archivo-w70-850': require('../../assets/fonts/static/Archivo-w70-850.ttf'),
  'Archivo-w70-900': require('../../assets/fonts/static/Archivo-w70-900.ttf'),
  'Archivo-w82-800': require('../../assets/fonts/static/Archivo-w82-800.ttf'),
  'Archivo-w88-750': require('../../assets/fonts/static/Archivo-w88-750.ttf'),
  'Archivo-w100-400': require('../../assets/fonts/static/Archivo-w100-400.ttf'),
  'Archivo-w100-500': require('../../assets/fonts/static/Archivo-w100-500.ttf'),
  'Archivo-w100-600': require('../../assets/fonts/static/Archivo-w100-600.ttf'),
  'Archivo-w100-700': require('../../assets/fonts/static/Archivo-w100-700.ttf'),
  'PlexMono-400': require('../../assets/fonts/static/PlexMono-400.ttf'),
  'PlexMono-500': require('../../assets/fonts/static/PlexMono-500.ttf'),
  'PlexMono-600': require('../../assets/fonts/static/PlexMono-600.ttf'),
  'PlexMono-700': require('../../assets/fonts/static/PlexMono-700.ttf'),
};

/** Sistema de movimento "Mecânica de Precisão" (BRIEFING §7, js/motion.js do PWA). */
export const EASE = {
  std: Easing.bezier(0.2, 0, 0, 1),
  stamp: Easing.bezier(0.3, 1.4, 0.5, 1),
  heavy: Easing.bezier(0.7, 0, 0.2, 1),
  exit: Easing.bezier(0.4, 0, 1, 1),
};

export const DUR = {
  press: 80,
  fast: 200,
  print: 240,
  roll: 280,
  base: 320,
  release: 600,
  hold: 2000,
};

export const RAIO = 2;
export const GUTTER = 16;
export const BBAR_H = 64;

/** letter-spacing em `em` do CSS convertido para px. */
export const ls = (em: number, size: number) => em * size;
