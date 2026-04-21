/**
 * Monaco Editor Themes for walkerOS Explorer
 *
 * Custom Monaco themes that integrate seamlessly with the CSS-based theme system.
 * Theme switching is handled via CSS `data-theme` attribute on document root.
 */

// Import registration functions for use in registerAllThemes
import { registerPalenightTheme } from './palenight';
import { registerLighthouseTheme } from './lighthouse';

// Monaco Editor themes
export { palenightTheme, registerPalenightTheme } from './palenight';
export { lighthouseTheme, registerLighthouseTheme } from './lighthouse';

// Theme name constants — use these instead of hard-coded string literals
export { ELB_THEME_DARK, ELB_THEME_LIGHT } from './names';
export type { ElbThemeName } from './names';

// Unified scope → color grouping (drives Monaco + Shiki from one source)
export type { TokenGroup } from './token-groups';

// Theme types (for documentation and TypeScript support)
export type { ExplorerTheme } from './types';

/**
 * Register all Monaco themes
 * Convenience function for registering both themes at once
 *
 * @example
 * ```typescript
 * import { registerAllThemes } from '@walkeros/explorer';
 * import * as monaco from 'monaco-editor';
 *
 * registerAllThemes(monaco);
 * ```
 */
export function registerAllThemes(
  monaco: typeof import('monaco-editor'),
): void {
  registerPalenightTheme(monaco);
  registerLighthouseTheme(monaco);
}
