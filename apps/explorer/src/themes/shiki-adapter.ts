/**
 * Monaco → Shiki theme adapter
 *
 * Converts a Monaco IStandaloneThemeData into Shiki's TextMate-format
 * ThemeRegistrationRaw so CodeStatic (Shiki) and Code (Monaco) use the
 * same walkerOS token colors (`elbTheme-dark` / `elbTheme-light`).
 *
 * Monaco token names are already TextMate-compatible scopes (e.g.
 * `string.quoted`, `entity.name.function`). The main differences:
 * - Shiki colors need a leading `#` prefix
 * - Shiki uses `tokenColors[]` instead of `rules[]`
 * - Shiki needs a `name` and `type` ('light' | 'dark')
 */
import type { editor } from 'monaco-editor';
import type { ThemeRegistrationRaw } from 'shiki';

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
  type: 'light' | 'dark';
  /** Fallback foreground if the Monaco theme didn't set editor.foreground. */
  defaultForeground?: string;
  /** Fallback background if the Monaco theme uses a transparent one. */
  defaultBackground?: string;
}

/**
 * Convert a Monaco theme to a Shiki ThemeRegistrationRaw.
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

  // Shiki requires an opaque background and a foreground. Monaco themes use
  // transparent backgrounds (`#00000000`) so CSS can theme the box — replace
  // those with the caller-provided fallback.
  const isTransparent = (c: string | undefined) =>
    !c || c === '#00000000' || /^#[0-9a-f]{6}00$/i.test(c);

  const bg = isTransparent(colors['editor.background'])
    ? (options.defaultBackground ??
      (options.type === 'dark' ? '#292d3e' : '#ffffff'))
    : colors['editor.background'];

  const fg =
    colors['editor.foreground'] ??
    options.defaultForeground ??
    (options.type === 'dark' ? '#bfc7d5' : '#24292E');

  // Shiki's ThemeRegistrationRaw requires a `settings` array (TextMate format).
  // First entry sets global defaults; remaining entries are the token rules.
  const settings = [
    { settings: { foreground: fg, background: bg } },
    ...tokenColors,
  ];

  return {
    name: options.name,
    type: options.type,
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
