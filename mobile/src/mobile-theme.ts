import { createContext, useContext } from 'react';

import type { MobileThemeName } from './mobile-storage';

export interface MobileThemeToken {
  hex: string;
  label: string;
  light: string;
  selection: string;
}

export const DEFAULT_MOBILE_THEME: MobileThemeName = 'green';

export const MOBILE_THEME_TOKENS: Record<MobileThemeName, MobileThemeToken> = {
  blue: { hex: '#60a5fa', label: '蓝', light: '#93c5fd', selection: '#bfdbfe' },
  cyan: { hex: '#22d3ee', label: '青', light: '#67e8f9', selection: '#a5f3fc' },
  gray: { hex: '#64748b', label: '灰', light: '#94a3b8', selection: '#e2e8f0' },
  green: { hex: '#10b981', label: '绿', light: '#34d399', selection: '#a7f3d0' },
  indigo: { hex: '#818cf8', label: '靛', light: '#a5b4fc', selection: '#c7d2fe' },
  orange: { hex: '#fb923c', label: '橙', light: '#fdba74', selection: '#fed7aa' },
  pink: { hex: '#f472b6', label: '粉', light: '#f9a8d4', selection: '#fbcfe8' },
  purple: { hex: '#a78bfa', label: '紫', light: '#c4b5fd', selection: '#ddd6fe' },
  red: { hex: '#f87171', label: '红', light: '#fca5a5', selection: '#fecaca' },
  rose: { hex: '#fb7185', label: '玫', light: '#fda4af', selection: '#fecdd3' },
  teal: { hex: '#2dd4bf', label: '蓝绿', light: '#5eead4', selection: '#99f6e4' },
  yellow: { hex: '#fbbf24', label: '黄', light: '#fcd34d', selection: '#fde68a' },
};

export const MOBILE_THEME_NAMES = Object.keys(MOBILE_THEME_TOKENS) as MobileThemeName[];

export const MobileThemeContext = createContext<MobileThemeToken>(MOBILE_THEME_TOKENS[DEFAULT_MOBILE_THEME]);

export const MOBILE_SAGE_NEUTRALS = {
  border: 'rgb(229, 229, 229)',
  borderSoft: 'rgb(241, 245, 249)',
  control: 'rgb(246, 246, 246)',
  controlActive: 'rgb(239, 239, 239)',
  controlHover: 'rgb(242, 242, 242)',
  pageBg: 'rgb(249, 249, 249)',
  panel: '#fff',
  panelAlt: 'rgb(251, 251, 251)',
  sheetOverlay: 'rgba(15, 23, 42, 0.18)',
} as const;

export const MOBILE_SAGE_SLATE = {
  body: '#475569',
  ghost: '#cbd5e1',
  muted: '#64748b',
  strong: '#0f172a',
  subtle: '#94a3b8',
  title: '#1e293b',
} as const;

export const MOBILE_SAGE_SHADOWS = {
  floating: {
    elevation: 8,
    shadowColor: '#0f172a',
    shadowOffset: { height: 12, width: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 22,
  },
  panel: {
    elevation: 2,
    shadowColor: '#0f172a',
    shadowOffset: { height: 8, width: 0 },
    shadowOpacity: 0.05,
    shadowRadius: 18,
  },
} as const;

/**
 * Reads the active native workspace theme token.
 */
export const useMobileTheme = (): MobileThemeToken => {
  return useContext(MobileThemeContext);
};
