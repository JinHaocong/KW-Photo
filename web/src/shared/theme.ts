import type { ThemeName, ThemeToken } from './types';

export const THEME_TOKENS: Record<ThemeName, ThemeToken> = {
  blue: { hex: '#60a5fa', light: '#93c5fd', selection: '#bfdbfe' },
  green: { hex: '#10b981', light: '#34d399', selection: '#a7f3d0' },
  yellow: { hex: '#fbbf24', light: '#fcd34d', selection: '#fde68a' },
  pink: { hex: '#f472b6', light: '#f9a8d4', selection: '#fbcfe8' },
  orange: { hex: '#fb923c', light: '#fdba74', selection: '#fed7aa' },
  gray: { hex: '#64748b', light: '#94a3b8', selection: '#e2e8f0' },
  purple: { hex: '#a78bfa', light: '#c4b5fd', selection: '#ddd6fe' },
  red: { hex: '#f87171', light: '#fca5a5', selection: '#fecaca' },
  indigo: { hex: '#818cf8', light: '#a5b4fc', selection: '#c7d2fe' },
  teal: { hex: '#2dd4bf', light: '#5eead4', selection: '#99f6e4' },
  cyan: { hex: '#22d3ee', light: '#67e8f9', selection: '#a5f3fc' },
  rose: { hex: '#fb7185', light: '#fda4af', selection: '#fecdd3' },
};

export const THEME_NAMES = Object.keys(THEME_TOKENS) as ThemeName[];

/**
 * Writes the active theme to document-level CSS variables.
 * @param themeName Active theme key.
 */
export const applyTheme = (themeName: ThemeName): void => {
  const theme = THEME_TOKENS[themeName];
  const root = document.documentElement;

  root.style.setProperty('--theme', theme.hex);
  root.style.setProperty('--theme-light', theme.light);
  root.style.setProperty('--theme-selection', theme.selection);
};
