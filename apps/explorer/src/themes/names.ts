/**
 * Theme name constants
 *
 * Single source of truth for Monaco `defineTheme` keys and Shiki theme names.
 * Import these instead of hard-coding the string literals — renaming a theme
 * then only changes one place and both engines stay in sync.
 */

export const ELB_THEME_DARK = 'elbTheme-dark';
export const ELB_THEME_LIGHT = 'elbTheme-light';

export type ElbThemeName = typeof ELB_THEME_DARK | typeof ELB_THEME_LIGHT;
