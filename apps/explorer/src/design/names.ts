/**
 * Text scanning shared by the generator tests and walkeros-design-check: one
 * definition of "a custom property is declared here".
 */

/** `--x: v` (CSS), `'--x': v` (TS style keys), `[--x:v]` (Tailwind arbitrary properties). */
const DECLARATION = /(?<![A-Za-z0-9_-])--([A-Za-z0-9_-]+)['"]?\s*:/g;
/** `el.style.setProperty('--x', v)`. */
const SET_PROPERTY = /setProperty\(\s*['"`]--([A-Za-z0-9_-]+)/g;

/** Visit every match of `pattern`; a fresh global RegExp per call, so shared patterns keep no state. */
export function forEachMatch(
  pattern: RegExp,
  text: string,
  visit: (match: RegExpExecArray) => void,
): void {
  const flags = pattern.flags.includes('g')
    ? pattern.flags
    : `${pattern.flags}g`;
  const re = new RegExp(pattern.source, flags);
  for (let match = re.exec(text); match !== null; match = re.exec(text))
    visit(match);
}

export function collectDeclaredNames(text: string): Set<string> {
  const names = new Set<string>();
  forEachMatch(DECLARATION, text, (match) => names.add(match[1]));
  forEachMatch(SET_PROPERTY, text, (match) => names.add(match[1]));
  return names;
}
