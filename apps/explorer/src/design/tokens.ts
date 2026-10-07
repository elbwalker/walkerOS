/**
 * The walkerOS design tokens: the types of design/tokens.json and the guard
 * that parses it. The guard accepts a strict subset of the Claude Design token
 * grammar (lowercase names, hex or rgb()/rgba() colours, {alias} references,
 * exactly the themes dark and light, no font files, no meta). Anything else
 * throws a DesignTokenError naming its JSON path, so the explorer build fails
 * instead of shipping a broken or silently dropped token.
 */
import { tailwindNamespace } from './tailwind-namespaces';

export const THEMES = ['dark', 'light'] as const;
export type ThemeId = (typeof THEMES)[number];

export interface ThemedValue {
  readonly dark: string;
  readonly light: string;
}

export interface ColorToken {
  readonly name: string;
  /** A literal colour or an {alias}, one value or one per theme. */
  readonly value: string | ThemedValue;
  readonly usage: string;
}

export interface ShadowToken {
  readonly name: string;
  readonly value: string | ThemedValue;
  readonly usage: string;
}

export interface ValueToken {
  readonly name: string;
  readonly value: string;
  readonly usage: string;
}

export interface TypeStyle {
  readonly name: string;
  /** The family key: the style's own, else its group's. */
  readonly family: string;
  readonly fontSize: string;
  readonly lineHeight: number | string;
  readonly fontWeight: number;
  readonly letterSpacing?: string;
  readonly usage: string;
}

export interface TypeGroup {
  readonly name: string;
  readonly styles: readonly TypeStyle[];
}

export interface DesignTokens {
  readonly name: string;
  readonly version: number;
  readonly colors: readonly ColorToken[];
  readonly families: Readonly<Record<string, string>>;
  readonly groups: readonly TypeGroup[];
  readonly spacing: readonly ValueToken[];
  readonly radius: readonly ValueToken[];
  readonly shadows: readonly ShadowToken[];
  readonly zIndex: readonly ValueToken[];
}

export interface Rgba {
  readonly r: number;
  readonly g: number;
  readonly b: number;
  readonly a: number;
}

export class DesignTokenError extends Error {
  readonly path: string;

  constructor(path: string, message: string) {
    super(`design/tokens.json ${path}: ${message}`);
    this.name = 'DesignTokenError';
    this.path = path;
  }
}

type JsonObject = Record<string, unknown>;

interface Entry {
  readonly entry: JsonObject;
  readonly path: string;
}

/** Lowercase words of letters and digits joined by single hyphens: `bg-2`, `on-primary`, `space-3-5`. */
const NAME_PATTERN = '[a-z][a-z0-9]*(?:-[a-z0-9]+)*';
const NAME = new RegExp(`^${NAME_PATTERN}$`);
const MAX_NAME_LENGTH = 64;
const NAME_RULE = `must start with a lowercase letter and use only lowercase letters, digits and single hyphens between words, at most ${MAX_NAME_LENGTH} characters`;
const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/;
const RGB =
  /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*(0|1|0?\.\d+)\s*)?\)$/;
const ALIAS = new RegExp(`^\\{(${NAME_PATTERN})\\}$`);
const LENGTH = /^(?:0|-?\d+(?:\.\d+)?(?:px|rem|em|%))$/;
const INTEGER = /^-?\d+$/;
const SHADOW = /^[A-Za-z0-9 #%(),./+-]{1,400}$/;
const FONT_STACK_FORBIDDEN = /[;{}<>\\()]/;
const TOP_LEVEL = [
  'name',
  'version',
  'color',
  'type',
  'spacing',
  'radius',
  'shadow',
  'zIndex',
];
const MAX_ALIAS_DEPTH = 16;
/** Identifiers a generated `export const` cannot take: reserved words, strict-mode bindings, undefined. */
const RESERVED = new Set([
  'arguments',
  'await',
  'break',
  'case',
  'catch',
  'class',
  'const',
  'continue',
  'debugger',
  'default',
  'delete',
  'do',
  'else',
  'enum',
  'eval',
  'export',
  'extends',
  'false',
  'finally',
  'for',
  'function',
  'if',
  'implements',
  'import',
  'in',
  'instanceof',
  'interface',
  'let',
  'new',
  'null',
  'package',
  'private',
  'protected',
  'public',
  'return',
  'static',
  'super',
  'switch',
  'this',
  'throw',
  'true',
  'try',
  'typeof',
  'undefined',
  'var',
  'void',
  'while',
  'with',
  'yield',
]);

export function isRecord(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function fail(path: string, message: string): never {
  throw new DesignTokenError(path, message);
}

function object(value: unknown, path: string): JsonObject {
  return isRecord(value) ? value : fail(path, 'must be an object');
}

function array(value: unknown, path: string): readonly unknown[] {
  return Array.isArray(value) ? value : fail(path, 'must be an array');
}

function text(value: unknown, path: string): string {
  return typeof value === 'string' && value.length > 0
    ? value
    : fail(path, 'must be a non-empty string');
}

function matching(
  value: unknown,
  path: string,
  pattern: RegExp,
  what: string,
): string {
  const v = text(value, path);
  return pattern.test(v) ? v : fail(path, `"${v}" is not ${what}`);
}

function onlyKeys(
  value: JsonObject,
  allowed: readonly string[],
  path: string,
): void {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key))
      fail(path ? `${path}.${key}` : key, 'is not part of the token grammar');
  }
}

function isTokenName(value: string): boolean {
  return value.length <= MAX_NAME_LENGTH && NAME.test(value);
}

function tokenName(value: unknown, path: string): string {
  const name = text(value, path);
  return isTokenName(name)
    ? name
    : fail(path, `"${name}" is not a token name: a name ${NAME_RULE}`);
}

/** Parse a literal colour (lowercase hex, rgb() or rgba()); undefined for anything else. */
export function parseColor(value: string): Rgba | undefined {
  if (HEX.test(value)) {
    const hex = value.slice(1);
    const full =
      hex.length <= 4
        ? hex
            .split('')
            .map((digit) => digit + digit)
            .join('')
        : hex;
    const byte = (index: number): number =>
      parseInt(full.slice(index, index + 2), 16);
    return {
      r: byte(0),
      g: byte(2),
      b: byte(4),
      a: full.length === 8 ? byte(6) / 255 : 1,
    };
  }
  const match = RGB.exec(value);
  if (match === null) return undefined;
  const [r, g, b] = [Number(match[1]), Number(match[2]), Number(match[3])];
  if (r > 255 || g > 255 || b > 255) return undefined;
  return { r, g, b, a: match[4] === undefined ? 1 : Number(match[4]) };
}

/** The token an `{alias}` value points at; undefined for a literal. */
export function aliasTarget(value: string): string | undefined {
  const match = ALIAS.exec(value);
  return match === null ? undefined : match[1];
}

/** `bg-2` -> `bg2`, `on-primary` -> `onPrimary`: the constant name of a token. */
export function camelName(name: string): string {
  return name.replace(/-([a-z0-9])/g, (_match: string, next: string) =>
    next.toUpperCase(),
  );
}

function colorValue(value: unknown, path: string): string {
  const v = text(value, path);
  if (aliasTarget(v) !== undefined || parseColor(v) !== undefined) return v;
  return fail(
    path,
    `"${v}" is not a lowercase hex, rgb() or rgba() colour, or an {alias}`,
  );
}

function balanced(value: string): boolean {
  let depth = 0;
  for (const char of value) {
    if (char === '(') depth++;
    if (char === ')') depth--;
    if (depth < 0) return false;
  }
  return depth === 0;
}

function shadowValue(value: unknown, path: string): string {
  const v = text(value, path);
  if (SHADOW.test(v) && !/\b(?:var|url)\(/.test(v) && balanced(v)) return v;
  return fail(path, `"${v}" is not a box-shadow without var() or url()`);
}

function perTheme(
  value: unknown,
  path: string,
  leaf: (value: unknown, path: string) => string,
): string | ThemedValue {
  if (typeof value === 'string') return leaf(value, path);
  const themed = object(value, path);
  onlyKeys(themed, THEMES, path);
  return {
    dark: leaf(themed.dark, `${path}.dark`),
    light: leaf(themed.light, `${path}.light`),
  };
}

function tokenEntries(value: unknown, path: string): Entry[] {
  return array(value, path).map((item, index) => {
    const itemPath = `${path}[${index}]`;
    const entry = object(item, itemPath);
    onlyKeys(entry, ['name', 'value', 'usage'], itemPath);
    return { entry, path: itemPath };
  });
}

function familyEntries(value: unknown, path: string): Entry[] {
  if (value === undefined) return [];
  const family = object(value, path);
  onlyKeys(family, ['note', 'tokens'], path);
  if (family.note !== undefined) text(family.note, `${path}.note`);
  return tokenEntries(family.tokens, `${path}.tokens`);
}

function valueTokens(
  value: unknown,
  path: string,
  pattern: RegExp,
  what: string,
): ValueToken[] {
  return familyEntries(value, path).map(({ entry, path: itemPath }) => ({
    name: tokenName(entry.name, `${itemPath}.name`),
    value: matching(entry.value, `${itemPath}.value`, pattern, what),
    usage: text(entry.usage, `${itemPath}.usage`),
  }));
}

function fontStack(value: unknown, path: string): string {
  const stack = text(value, path);
  const count = (quote: string): number => stack.split(quote).length - 1;
  if (stack.length > 200 || FONT_STACK_FORBIDDEN.test(stack)) {
    return fail(
      path,
      'must be a font stack of at most 200 characters without ; { } < > \\ ( )',
    );
  }
  if (count("'") % 2 !== 0 || count('"') % 2 !== 0)
    return fail(path, 'has unbalanced quotes');
  return stack;
}

function typeStyle(
  value: unknown,
  path: string,
  groupFamily: string,
  family: (value: unknown, path: string) => string,
): TypeStyle {
  const style = object(value, path);
  onlyKeys(
    style,
    [
      'name',
      'family',
      'fontSize',
      'lineHeight',
      'fontWeight',
      'letterSpacing',
      'usage',
      'sample',
    ],
    path,
  );
  if (style.sample !== undefined) text(style.sample, `${path}.sample`);
  const fontWeight = style.fontWeight;
  if (
    typeof fontWeight !== 'number' ||
    !Number.isInteger(fontWeight) ||
    fontWeight < 1 ||
    fontWeight > 1000
  ) {
    fail(`${path}.fontWeight`, 'must be an integer from 1 to 1000');
  }
  const lineHeight = style.lineHeight;
  const parsed: TypeStyle = {
    name: tokenName(style.name, `${path}.name`),
    family:
      style.family === undefined
        ? groupFamily
        : family(style.family, `${path}.family`),
    fontSize: matching(style.fontSize, `${path}.fontSize`, LENGTH, 'a length'),
    lineHeight:
      typeof lineHeight === 'number' && lineHeight > 0 && lineHeight < 10
        ? lineHeight
        : matching(
            lineHeight,
            `${path}.lineHeight`,
            LENGTH,
            'a unitless number below 10 or a length',
          ),
    fontWeight,
    usage: text(style.usage, `${path}.usage`),
  };
  return style.letterSpacing === undefined
    ? parsed
    : {
        ...parsed,
        letterSpacing: matching(
          style.letterSpacing,
          `${path}.letterSpacing`,
          LENGTH,
          'a length',
        ),
      };
}

function parseType(value: unknown): Pick<DesignTokens, 'families' | 'groups'> {
  const type = object(value, 'type');
  onlyKeys(type, ['fonts', 'families', 'groups'], 'type');
  if (array(type.fonts, 'type.fonts').length > 0) {
    fail(
      'type.fonts',
      'font files need @font-face output in src/design/generate.ts first',
    );
  }
  const families: Record<string, string> = {};
  for (const [key, stack] of Object.entries(
    object(type.families, 'type.families'),
  )) {
    if (!isTokenName(key))
      fail(
        `type.families.${key}`,
        `"${key}" is not a family key: a key ${NAME_RULE}`,
      );
    families[key] = fontStack(stack, `type.families.${key}`);
  }
  const family = (v: unknown, path: string): string => {
    const key = text(v, path);
    return Object.prototype.hasOwnProperty.call(families, key)
      ? key
      : fail(path, `"${key}" is not a key of type.families`);
  };
  const groups = array(type.groups, 'type.groups').map((item, i): TypeGroup => {
    const path = `type.groups[${i}]`;
    const group = object(item, path);
    onlyKeys(group, ['name', 'family', 'styles'], path);
    const groupFamily = family(group.family, `${path}.family`);
    return {
      name: text(group.name, `${path}.name`),
      styles: array(group.styles, `${path}.styles`).map((style, j) =>
        typeStyle(style, `${path}.styles[${j}]`, groupFamily, family),
      ),
    };
  });
  return { families, groups };
}

/** Follow an alias chain to its literal for one theme; `themed` is true when any link is declared per theme. */
function follow(
  colors: readonly ColorToken[],
  start: string,
  theme: ThemeId,
  path: string,
): { readonly value: string; readonly themed: boolean } {
  const chain = [start];
  let themed = false;
  for (;;) {
    const current = chain[chain.length - 1];
    const token = colors.find((color) => color.name === current);
    if (token === undefined)
      return fail(
        path,
        `"${current}" is not a colour token (${chain.join(' -> ')})`,
      );
    themed = themed || typeof token.value !== 'string';
    const value =
      typeof token.value === 'string' ? token.value : token.value[theme];
    const target = aliasTarget(value);
    if (target === undefined) return { value, themed };
    if (chain.includes(target))
      return fail(path, `alias cycle ${[...chain, target].join(' -> ')}`);
    if (chain.length > MAX_ALIAS_DEPTH)
      return fail(path, `alias chain deeper than ${MAX_ALIAS_DEPTH}`);
    chain.push(target);
  }
}

/** The literal colour a token resolves to in one theme. */
export function resolveColor(
  tokens: Pick<DesignTokens, 'colors'>,
  name: string,
  theme: ThemeId,
): string {
  return follow(tokens.colors, name, theme, `color "${name}"`).value;
}

/** True when the token is declared per theme, or is an alias whose chain reaches one. */
export function isThemedColor(
  tokens: Pick<DesignTokens, 'colors'>,
  name: string,
): boolean {
  return follow(tokens.colors, name, THEMES[0], `color "${name}"`).themed;
}

function checkNamespace(tokens: DesignTokens): void {
  const claim = (
    scope: Map<string, string>,
    key: string,
    path: string,
    what: string,
  ): void => {
    const previous = scope.get(key);
    if (previous !== undefined)
      fail(path, `${what} "${key}" is already declared at ${previous}`);
    scope.set(key, path);
  };
  // Every family but type shares one --name namespace (format.md), outside
  // Tailwind's own: tokens.css is unlayered, so a token such as container-xl
  // would override Tailwind's --container-xl and re-size max-w-xl. Radius
  // tokens and font families sit in --radius-* and --font-* on purpose.
  const names = new Map<string, string>();
  const claimName = (name: string, path: string, own?: string): void => {
    const namespace = tailwindNamespace(name);
    if (namespace !== undefined && namespace !== own) {
      fail(
        path,
        `"${name}" collides with Tailwind's own --${namespace} variables`,
      );
    }
    claim(names, name, path, 'name');
  };
  tokens.colors.forEach((t, i) => claimName(t.name, `color.tokens[${i}].name`));
  tokens.shadows.forEach((t, i) =>
    claimName(t.name, `shadow.tokens[${i}].name`),
  );
  tokens.spacing.forEach((t, i) =>
    claimName(t.name, `spacing.tokens[${i}].name`),
  );
  tokens.radius.forEach((t, i) =>
    claimName(t.name, `radius.tokens[${i}].name`, 'radius'),
  );
  tokens.zIndex.forEach((t, i) =>
    claimName(t.name, `zIndex.tokens[${i}].name`),
  );
  Object.keys(tokens.families).forEach((key) =>
    claimName(`font-${key}`, `type.families.${key}`, 'font'),
  );
  // The constants module needs one valid identifier per colour and family.
  const constants = new Map<string, string>();
  tokens.colors.forEach((t, i) => {
    const path = `color.tokens[${i}].name`;
    const constant = camelName(t.name);
    if (RESERVED.has(constant))
      fail(path, `"${t.name}" would export the reserved word ${constant}`);
    claim(constants, constant, path, 'constant');
  });
  Object.keys(tokens.families).forEach((key) =>
    claim(
      constants,
      camelName(`font-${key}`),
      `type.families.${key}`,
      'constant',
    ),
  );
  // Tailwind serves text-<style> and text-<colour> from one utility, and a
  // style's --text-<style> must not land in a namespace nested under --text-*
  // (shadow-x would emit --text-shadow-x, a Tailwind text-shadow value).
  const colorNames = new Set(tokens.colors.map((t) => t.name));
  const styles = new Map<string, string>();
  tokens.groups.forEach((group, i) =>
    group.styles.forEach((style, j) => {
      const path = `type.groups[${i}].styles[${j}].name`;
      if (colorNames.has(style.name)) {
        fail(
          path,
          `"${style.name}" is also a colour, so Tailwind text-${style.name} would be ambiguous`,
        );
      }
      const namespace = tailwindNamespace(`text-${style.name}`);
      if (namespace !== 'text') {
        fail(
          path,
          `"${style.name}" would emit --text-${style.name} into Tailwind's own --${namespace} variables`,
        );
      }
      claim(styles, style.name, path, 'style');
    }),
  );
}

export function parseDesignTokens(input: unknown): DesignTokens {
  const root = object(input, '(root)');
  if (root.meta !== undefined)
    fail(
      'meta',
      'is written by the Claude Design sync; the repo file carries none',
    );
  onlyKeys(root, TOP_LEVEL, '');
  const version = root.version;
  if (typeof version !== 'number' || !Number.isInteger(version))
    fail('version', 'must be an integer');

  const color = object(root.color, 'color');
  onlyKeys(color, ['themes', 'tokens'], 'color');
  const themeIds = array(color.themes, 'color.themes').map((item, i) => {
    const theme = object(item, `color.themes[${i}]`);
    onlyKeys(theme, ['id', 'name'], `color.themes[${i}]`);
    text(theme.name, `color.themes[${i}].name`);
    return text(theme.id, `color.themes[${i}].id`);
  });
  if (themeIds.join() !== THEMES.join())
    fail(
      'color.themes',
      `must list exactly ${THEMES.join(', ')}, in that order`,
    );

  const colors = tokenEntries(color.tokens, 'color.tokens').map(
    ({ entry, path }): ColorToken => ({
      name: tokenName(entry.name, `${path}.name`),
      value: perTheme(entry.value, `${path}.value`, colorValue),
      usage: text(entry.usage, `${path}.usage`),
    }),
  );
  const shadows = familyEntries(root.shadow, 'shadow').map(
    ({ entry, path }): ShadowToken => ({
      name: tokenName(entry.name, `${path}.name`),
      value: perTheme(entry.value, `${path}.value`, shadowValue),
      usage: text(entry.usage, `${path}.usage`),
    }),
  );
  const radius = valueTokens(root.radius, 'radius', LENGTH, 'a length');
  radius.forEach((token, i) => {
    if (!token.name.startsWith('radius-')) {
      fail(
        `radius.tokens[${i}].name`,
        'radius names start with radius-, the Tailwind --radius-* namespace',
      );
    }
  });

  const tokens: DesignTokens = {
    name: text(root.name, 'name'),
    version,
    colors,
    ...parseType(root.type),
    spacing: valueTokens(root.spacing, 'spacing', LENGTH, 'a length'),
    radius,
    shadows,
    zIndex: valueTokens(root.zIndex, 'zIndex', INTEGER, 'an integer'),
  };
  checkNamespace(tokens);
  colors.forEach((token, i) => {
    for (const theme of THEMES)
      follow(colors, token.name, theme, `color.tokens[${i}].value`);
  });
  return tokens;
}
