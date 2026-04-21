/**
 * Token groups — unified scope → color mapping for Monaco + Shiki
 *
 * Each `TokenGroup` defines ONE semantic color (foreground + optional fontStyle)
 * and a list of `scopes` that should receive it. The list pools both Monaco's
 * Monarch-style token names (e.g. `string.value.json`, `identifier.ts`) AND
 * TextMate scopes that Shiki grammars emit (e.g. `string.quoted.double.json`,
 * `variable.other.object.ts`). Because the same list drives both engines via
 * `tokenGroupsToMonacoRules` + `monacoThemeToShiki`, a single edit here updates
 * CodeBox (Monaco) and CodeView (Shiki) together.
 */

import type { editor } from 'monaco-editor';

export interface TokenGroup {
  /** Foreground hex WITHOUT leading `#` (Monaco convention). Omit for font-style-only rules. */
  foreground?: string;
  /** Monaco / TextMate fontStyle string, e.g. 'italic', 'bold', 'italic bold'. */
  fontStyle?: string;
  /**
   * Monarch token names (Monaco) AND TextMate scopes (Shiki), pooled into one list.
   * Every scope in this list gets the same foreground + fontStyle, so both engines
   * render the same color for every token they emit under any of these names.
   */
  scopes: string[];
}

/**
 * Expand `TokenGroup[]` into the flat `editor.ITokenThemeRule[]` Monaco wants.
 * Each scope becomes one rule with the group's shared foreground + fontStyle.
 */
export function tokenGroupsToMonacoRules(
  groups: TokenGroup[],
): editor.ITokenThemeRule[] {
  return groups.flatMap((g) =>
    g.scopes.map((token) => {
      const rule: editor.ITokenThemeRule = { token };
      if (g.foreground !== undefined) rule.foreground = g.foreground;
      if (g.fontStyle !== undefined) rule.fontStyle = g.fontStyle;
      return rule;
    }),
  );
}
