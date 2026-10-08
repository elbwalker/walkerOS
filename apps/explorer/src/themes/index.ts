/**
 * The one code theme of walkerOS Explorer
 *
 * Code surfaces are dark in both page themes, so Monaco (CodeBox) and Shiki
 * (CodeView) share one theme, built from the design constants.
 */
import type { editor } from 'monaco-editor';
import { palenightTheme } from './palenight';

/** Monaco `defineTheme` key and Shiki theme name of the code theme. */
export const ELB_THEME_DARK = 'elbTheme-dark';

/** The part of the Monaco API that registering a theme needs. */
export interface MonacoThemeRegistry {
  editor: {
    defineTheme(
      themeName: string,
      themeData: editor.IStandaloneThemeData,
    ): void;
  };
}

/**
 * Register the code theme with Monaco. Call it before the first editor
 * mounts; Code and CodeDiff do so in their `beforeMount`.
 *
 * @example
 * ```typescript
 * import { registerTheme, ELB_THEME_DARK } from '@walkeros/explorer';
 *
 * registerTheme(monaco);
 * monaco.editor.setTheme(ELB_THEME_DARK);
 * ```
 */
export function registerTheme(monaco: MonacoThemeRegistry): void {
  monaco.editor.defineTheme(ELB_THEME_DARK, palenightTheme);
}

// Unified scope to colour grouping (drives Monaco and Shiki from one source)
export type { TokenGroup } from './token-groups';
