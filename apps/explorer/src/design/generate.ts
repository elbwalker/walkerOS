import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import * as sass from 'sass';
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
const PREVIEW_HEADER =
  '/* walkerOS preview design CSS, generated from design/tokens.json, src/design/base.css and the styles of the design components a preview page uses by src/design/generate.ts. Edit those and run the explorer build, never this file. */';

/**
 * The design components a preview page is built from, by their style partials
 * in src/styles/components/design, in the order the design atoms stylesheet
 * uses them.
 */
const PREVIEW_COMPONENTS = [
  'button',
  'text',
  'card',
  'photo-placeholder',
] as const;

const declaration = (name: string, value: string): string =>
  `--${name}: ${value};`;

/** The invariant block's selectors: an island re-declares what it lists. */
const INVARIANT_SELECTOR = ':root, :host, [data-theme]';
const CONSTANT_SCOPE =
  'Only for places CSS variables cannot reach, such as email HTML, styles injected by script and editor options.';

const indent = (lines: readonly string[]): string =>
  lines.map((line) => `  ${line}`).join('\n');

function block(selector: string, declarations: readonly string[]): string {
  return `${selector} {\n${indent(declarations)}\n}`;
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
  for (const token of [
    ...tokens.spacing,
    ...tokens.radius,
    ...tokens.containers,
    ...tokens.zIndex,
    ...tokens.motion,
  ]) {
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
  // Unlayered and last: at equal specificity the later declaration wins, in
  // every island the invariant block reaches.
  const reducedMotion = `@media (prefers-reduced-motion: reduce) {\n${indent(
    block(INVARIANT_SELECTOR, [declaration('motion', '0ms')]).split('\n'),
  )}\n}`;
  return `${[CSS_HEADER, block(INVARIANT_SELECTOR, invariant), ...themeBlocks, reducedMotion].join('\n\n')}\n`;
}

export function renderTailwindCss(tokens: DesignTokens): string {
  const theme = [
    ...TAILWIND_RESET_NAMESPACES.map(
      (namespace) => `--${namespace}-*: initial;`,
    ),
    '--spacing: 4px;',
  ];
  for (const token of [...tokens.radius, ...tokens.containers])
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
  // Tailwind's transition utilities read the design motion (tokens.css).
  const inline = [
    declaration('default-transition-duration', 'var(--motion)'),
    declaration('default-transition-timing-function', 'var(--ease)'),
    ...tokens.colors.map((token) =>
      declaration(`color-${token.name}`, `var(--${token.name})`),
    ),
  ];
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
  for (const token of tokens.motion) {
    lines.push(
      '',
      `/** ${comment(token.usage)} ${CONSTANT_SCOPE} */`,
      `export const ${camelName(token.name)} = ${JSON.stringify(token.value)};`,
    );
  }
  for (const style of tokens.groups.flatMap((group) => group.styles)) {
    const fields = [
      `size: ${JSON.stringify(style.fontSize)}`,
      `lineHeight: ${JSON.stringify(style.lineHeight)}`,
      `weight: ${style.fontWeight}`,
      ...(style.letterSpacing === undefined
        ? []
        : [`tracking: ${JSON.stringify(style.letterSpacing)}`]),
      `family: ${camelName(`font-${style.family}`)}`,
    ];
    lines.push(
      '',
      `/** Type style \`${style.name}\`: ${comment(style.usage)} ${CONSTANT_SCOPE} */`,
      `export const ${camelName(`${TYPE_VARIABLE_PREFIX}${style.name}`)} = { ${fields.join(', ')} } as const;`,
    );
  }
  return `${lines.join('\n')}\n`;
}

/** The styles of the design components a preview page uses, compiled from their partials. */
export function compilePreviewComponents(packageDir: string): string {
  return PREVIEW_COMPONENTS.map(
    (name) =>
      sass.compile(
        join(
          packageDir,
          'src',
          'styles',
          'components',
          'design',
          `_${name}.scss`,
        ),
      ).css,
  ).join('\n');
}

/**
 * The module a preview document's design CSS comes from: the tokens, the base
 * rules and the styles of the design components a preview page uses, so a
 * demo page in the preview iframe, which loads no stylesheet, is built from
 * the design components.
 */
export function renderPreviewModule(
  tokens: DesignTokens,
  base: string,
  components: string,
): string {
  const css = [renderTokensCss(tokens), base, components].join('\n');
  return `${[
    PREVIEW_HEADER,
    `/** Tokens, base rules and design component styles for the preview document. */\nexport const previewDesignCss = ${JSON.stringify(css)};`,
  ].join('\n\n')}\n`;
}

/**
 * Parse design/tokens.json and write every output. Renders everything before
 * writing anything, so a failure leaves no partial output; rewrites a file only
 * when its content changed.
 */
export function writeDesign(packageDir: string): void {
  const tokens = loadDesignTokens(packageDir);
  const dist = join(packageDir, 'dist', 'design');
  const base = readFileSync(
    join(packageDir, 'src', 'design', 'base.css'),
    'utf8',
  );
  const outputs: ReadonlyArray<readonly [string, string]> = [
    [join(dist, 'tokens.css'), renderTokensCss(tokens)],
    [join(dist, 'tailwind.css'), renderTailwindCss(tokens)],
    [join(dist, 'base.css'), base],
    [join(packageDir, 'src', 'design', 'index.ts'), renderConstants(tokens)],
    [
      join(packageDir, 'src', 'design', 'preview-css.ts'),
      renderPreviewModule(tokens, base, compilePreviewComponents(packageDir)),
    ],
  ];
  mkdirSync(dist, { recursive: true });
  for (const [file, content] of outputs) {
    if (!existsSync(file) || readFileSync(file, 'utf8') !== content)
      writeFileSync(file, content);
  }
}
