import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  aliasTarget,
  camelName,
  DesignTokenError,
  isThemedColor,
  parseDesignTokens,
  resolveColor,
  THEMES,
  TYPE_VARIABLE_PREFIX,
  type DesignTokens,
  type ThemedValue,
  type ThemeId,
} from './tokens';
import { TAILWIND_RESET_NAMESPACES } from './tailwind-namespaces';

const CSS_HEADER =
  '/* walkerOS design tokens, generated from design/tokens.json by src/design/generate.ts. Edit the JSON, never this file. */';
const TS_HEADER =
  '/* walkerOS design constants, generated from design/tokens.json by src/design/generate.ts. Edit the JSON and run the explorer build, never this file. */';

const declaration = (name: string, value: string): string =>
  `--${name}: ${value};`;

function block(selector: string, declarations: readonly string[]): string {
  return `${selector} {\n${declarations.map((line) => `  ${line}`).join('\n')}\n}`;
}

function themeValue(value: string | ThemedValue, theme: ThemeId): string {
  const v = typeof value === 'string' ? value : value[theme];
  const target = aliasTarget(v);
  return target === undefined ? v : `var(--${target})`;
}

/** The literal of a single-valued, non-alias token: declared once, the same in every theme and island. */
function invariantValue(value: string | ThemedValue): string | undefined {
  return typeof value === 'string' && aliasTarget(value) === undefined
    ? value
    : undefined;
}

export function loadDesignTokens(packageDir: string): DesignTokens {
  const file = join(packageDir, 'design', 'tokens.json');
  let json: unknown;
  try {
    json = JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    throw new DesignTokenError(
      '(file)',
      error instanceof Error ? error.message : String(error),
    );
  }
  return parseDesignTokens(json);
}

export function renderTokensCss(tokens: DesignTokens): string {
  const invariant: string[] = [];
  const themed: Record<ThemeId, string[]> = { dark: [], light: [] };
  for (const token of [...tokens.colors, ...tokens.shadows]) {
    const literal = invariantValue(token.value);
    if (literal !== undefined) {
      invariant.push(declaration(token.name, literal));
    } else {
      // Aliases are re-declared per theme: var() resolves where it is declared,
      // so an island of the other theme must re-declare them to follow it.
      for (const theme of THEMES)
        themed[theme].push(
          declaration(token.name, themeValue(token.value, theme)),
        );
    }
  }
  for (const token of [...tokens.spacing, ...tokens.radius, ...tokens.zIndex]) {
    invariant.push(declaration(token.name, token.value));
  }
  for (const [key, stack] of Object.entries(tokens.families))
    invariant.push(declaration(`font-${key}`, stack));
  for (const style of tokens.groups.flatMap((group) => group.styles)) {
    const name = (property: string): string =>
      `${TYPE_VARIABLE_PREFIX}${style.name}-${property}`;
    invariant.push(
      declaration(name('size'), style.fontSize),
      declaration(name('line-height'), String(style.lineHeight)),
      declaration(name('weight'), String(style.fontWeight)),
    );
    if (style.letterSpacing !== undefined)
      invariant.push(declaration(name('tracking'), style.letterSpacing));
    invariant.push(declaration(name('family'), `var(--font-${style.family})`));
  }
  const themeBlocks = THEMES.map((theme, index) =>
    block(
      index === 0
        ? `:root, :host, [data-theme="${theme}"]`
        : `[data-theme="${theme}"]`,
      themed[theme],
    ),
  );
  return `${[CSS_HEADER, block(':root, :host, [data-theme]', invariant), ...themeBlocks].join('\n\n')}\n`;
}

export function renderTailwindCss(tokens: DesignTokens): string {
  const theme = [
    ...TAILWIND_RESET_NAMESPACES.map(
      (namespace) => `--${namespace}-*: initial;`,
    ),
    '--spacing: 4px;',
  ];
  for (const token of tokens.radius)
    theme.push(declaration(token.name, token.value));
  for (const [key, stack] of Object.entries(tokens.families))
    theme.push(declaration(`font-${key}`, stack));
  for (const style of tokens.groups.flatMap((group) => group.styles)) {
    theme.push(declaration(`text-${style.name}`, style.fontSize));
    theme.push(
      declaration(`text-${style.name}--line-height`, String(style.lineHeight)),
    );
    theme.push(
      declaration(`text-${style.name}--font-weight`, String(style.fontWeight)),
    );
    if (style.letterSpacing !== undefined) {
      theme.push(
        declaration(`text-${style.name}--letter-spacing`, style.letterSpacing),
      );
    }
  }
  const inline = tokens.colors.map((token) =>
    declaration(`color-${token.name}`, `var(--${token.name})`),
  );
  for (const shadow of tokens.shadows) {
    if (typeof shadow.value === 'string')
      theme.push(declaration(`shadow-${shadow.name}`, shadow.value));
    else
      inline.push(
        declaration(`shadow-${shadow.name}`, `var(--${shadow.name})`),
      );
  }
  return `${[CSS_HEADER, '@import "./tokens.css";', block('@theme', theme), block('@theme inline', inline)].join('\n\n')}\n`;
}

const comment = (usage: string): string =>
  usage.replace(/\s+/g, ' ').replace(/\*\//g, '* /');

export function renderConstants(tokens: DesignTokens): string {
  const lines = [
    TS_HEADER,
    '',
    `export type Theme = ${THEMES.map((theme) => `'${theme}'`).join(' | ')};`,
  ];
  for (const token of tokens.colors) {
    const value = isThemedColor(tokens, token.name)
      ? `{ ${THEMES.map((theme) => `${theme}: ${JSON.stringify(resolveColor(tokens, token.name, theme))}`).join(', ')} } as const`
      : JSON.stringify(resolveColor(tokens, token.name, THEMES[0]));
    lines.push(
      '',
      `/** ${comment(token.usage)} */`,
      `export const ${camelName(token.name)} = ${value};`,
    );
  }
  for (const [key, stack] of Object.entries(tokens.families)) {
    lines.push(
      '',
      `/** Font family \`${key}\`. */`,
      `export const ${camelName(`font-${key}`)} = ${JSON.stringify(stack)};`,
    );
  }
  return `${lines.join('\n')}\n`;
}

/**
 * Parse design/tokens.json and write every output. Renders everything before
 * writing anything, so a failure leaves no partial output; rewrites a file only
 * when its content changed.
 */
export function writeDesign(packageDir: string): void {
  const tokens = loadDesignTokens(packageDir);
  const dist = join(packageDir, 'dist', 'design');
  const outputs: ReadonlyArray<readonly [string, string]> = [
    [join(dist, 'tokens.css'), renderTokensCss(tokens)],
    [join(dist, 'tailwind.css'), renderTailwindCss(tokens)],
    [
      join(dist, 'base.css'),
      readFileSync(join(packageDir, 'src', 'design', 'base.css'), 'utf8'),
    ],
    [join(packageDir, 'src', 'design', 'index.ts'), renderConstants(tokens)],
  ];
  mkdirSync(dist, { recursive: true });
  for (const [file, content] of outputs) {
    if (!existsSync(file) || readFileSync(file, 'utf8') !== content)
      writeFileSync(file, content);
  }
}
