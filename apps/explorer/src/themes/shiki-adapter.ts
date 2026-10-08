/**
 * Monaco → Shiki theme adapter
 *
 * Converts a Monaco IStandaloneThemeData into Shiki's TextMate-format
 * ThemeRegistrationRaw so CodeStatic (Shiki) and Code (Monaco) use the
 * same walkerOS token colors (`elbTheme-dark`).
 *
 * Monaco token names are already TextMate-compatible scopes (e.g.
 * `string.quoted`, `entity.name.function`). The main differences:
 * - Shiki colors need a leading `#` prefix
 * - Shiki uses `tokenColors[]` instead of `rules[]`
 * - Shiki needs a `name` and `type`
 */
import type { editor } from 'monaco-editor';
import type { ThemeRegistrationRaw } from 'shiki';
import { codeBg, codeFg } from '../design';

function normalizeColor(hex: string | undefined): string | undefined {
  if (!hex) return undefined;
  return hex.startsWith('#') ? hex : `#${hex}`;
}

function normalizeColors(
  colors: Record<string, string> | undefined,
): Record<string, string> {
  if (!colors) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(colors)) {
    const normalized = normalizeColor(v);
    if (normalized) out[k] = normalized;
  }
  return out;
}

export interface MonacoToShikiOptions {
  name: string;
}

/**
 * Convert the dark Monaco code theme to a Shiki ThemeRegistrationRaw.
 */
export function monacoThemeToShiki(
  monaco: editor.IStandaloneThemeData,
  options: MonacoToShikiOptions,
): ThemeRegistrationRaw {
  const tokenColors = monaco.rules.map((rule) => {
    const settings: { foreground?: string; fontStyle?: string } = {};
    const fg = normalizeColor(rule.foreground);
    if (fg) settings.foreground = fg;
    if (rule.fontStyle) settings.fontStyle = rule.fontStyle;
    return {
      scope: rule.token,
      settings,
    };
  });

  const colors = normalizeColors(monaco.colors);

  // Shiki requires a background and a foreground; the code panel colours
  // apply when the Monaco theme leaves either out.
  const bg = colors['editor.background'] ?? codeBg;
  const fg = colors['editor.foreground'] ?? codeFg;

  // Shiki's ThemeRegistrationRaw requires a `settings` array (TextMate format).
  // First entry sets global defaults; remaining entries are the token rules.
  const settings = [
    { settings: { foreground: fg, background: bg } },
    ...tokenColors,
  ];

  return {
    name: options.name,
    type: 'dark',
    bg,
    fg,
    colors: {
      ...colors,
      'editor.background': bg,
      'editor.foreground': fg,
    },
    settings,
    tokenColors,
  };
}
