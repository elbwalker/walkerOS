import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  loadDesignTokens,
  renderConstants,
  renderTailwindCss,
  renderTokensCss,
} from '../generate';
import * as constants from '../index';
import { collectDeclaredNames } from '../names';
import { camelName, parseDesignTokens, THEMES } from '../tokens';
import { fixture } from './fixture';

const packageDir = resolve(__dirname, '../../..');

it('renders tokens.css, tailwind.css and the constants for the fixture', () => {
  const tokens = parseDesignTokens(fixture());
  expect(
    [
      renderTokensCss(tokens),
      renderTailwindCss(tokens),
      renderConstants(tokens),
    ].join('\n/* ---- */\n'),
  ).toMatchSnapshot();
});

it('declares every colour and shadow of design/tokens.json in both themes', () => {
  const tokens = loadDesignTokens(packageDir);
  // header, invariant block, one block per theme, then the reduced-motion override
  const [, invariant, ...rest] = renderTokensCss(tokens)
    .trimEnd()
    .split('\n\n');
  const themeBlocks = rest.slice(0, THEMES.length);
  const invariantNames = collectDeclaredNames(invariant);
  const missing = THEMES.flatMap((theme, i) => {
    const declared = collectDeclaredNames(themeBlocks[i]);
    return [...tokens.colors, ...tokens.shadows]
      .map((token) => token.name)
      .filter((name) => !declared.has(name) && !invariantNames.has(name))
      .map((name) => `${theme}: ${name}`);
  });
  expect(rest).toHaveLength(THEMES.length + 1);
  expect(missing).toEqual([]);
});

it('declares --motion and --ease in tokens.css, with the reduced-motion override as the last, unlayered block', () => {
  const css = renderTokensCss(loadDesignTokens(packageDir));
  const blocks = css.trimEnd().split('\n\n');
  expect(blocks[1]).toContain('--motion: 180ms;');
  expect(blocks[1]).toContain('--ease: cubic-bezier(0.2, 0, 0, 1);');
  expect(blocks[blocks.length - 1]).toBe(
    '@media (prefers-reduced-motion: reduce) {\n  :root, :host, [data-theme] {\n    --motion: 0ms;\n  }\n}',
  );
  expect(css.indexOf('--motion: 0ms;')).toBeGreaterThan(
    css.indexOf('--motion: 180ms;'),
  );
  expect(css).not.toContain('@layer');
});

it('tailwind.css carries --motion and --ease through its tokens.css import', () => {
  const tokens = loadDesignTokens(packageDir);
  expect(renderTailwindCss(tokens)).toContain('@import "./tokens.css";');
  const declared = collectDeclaredNames(renderTokensCss(tokens));
  expect(declared.has('motion')).toBe(true);
  expect(declared.has('ease')).toBe(true);
});

it('exports motion, ease and one constant per type style of design/tokens.json, with its values', () => {
  const tokens = loadDesignTokens(packageDir);
  const exported = new Map<string, unknown>(Object.entries(constants));
  for (const token of tokens.motion)
    expect(exported.get(camelName(token.name))).toBe(token.value);
  for (const style of tokens.groups.flatMap((group) => group.styles)) {
    expect(exported.get(camelName(`type-${style.name}`))).toStrictEqual({
      size: style.fontSize,
      lineHeight: style.lineHeight,
      weight: style.fontWeight,
      ...(style.letterSpacing === undefined
        ? {}
        : { tracking: style.letterSpacing }),
      family: tokens.families[style.family],
    });
  }
});

it('declares size, line height, weight, family and (only when set) tracking for every type style of design/tokens.json', () => {
  const tokens = loadDesignTokens(packageDir);
  const [, invariant] = renderTokensCss(tokens).split('\n\n');
  const styles = tokens.groups.flatMap((group) => group.styles);
  const expected = styles.flatMap((style) =>
    [
      'size',
      'line-height',
      'weight',
      ...(style.letterSpacing === undefined ? [] : ['tracking']),
      'family',
    ].map((property) => `type-${style.name}-${property}`),
  );
  const declared = [...collectDeclaredNames(invariant)].filter((name) =>
    name.startsWith('type-'),
  );
  expect(declared).toEqual(expected);
  // Both tracking branches occur in the real tokens.
  expect(styles.some((style) => style.letterSpacing === undefined)).toBe(true);
  expect(styles.some((style) => style.letterSpacing !== undefined)).toBe(true);
  for (const style of styles)
    expect(invariant).toContain(
      `--type-${style.name}-family: var(--font-${style.family});`,
    );
});

it('declares the product-micro type style in tokens.css and tailwind.css', () => {
  const tokens = loadDesignTokens(packageDir);
  const css = renderTokensCss(tokens);
  const tailwind = renderTailwindCss(tokens);
  expect(css).toContain('--type-product-micro-size: 11px;');
  expect(css).toContain('--type-product-micro-line-height: 1.3;');
  expect(css).toContain('--type-product-micro-weight: 500;');
  expect(tailwind).toContain('--text-product-micro: 11px;');
  expect(tailwind).toContain('--text-product-micro--line-height: 1.3;');
  expect(tailwind).toContain('--text-product-micro--font-weight: 500;');
});

describe('container widths', () => {
  const tokens = loadDesignTokens(packageDir);
  const [, invariant] = renderTokensCss(tokens).split('\n\n');
  const tailwind = renderTailwindCss(tokens);

  // Tailwind 4.3's default --container-* scale, in rem.
  it.each<readonly [string, number]>([
    ['3xs', 16],
    ['2xs', 18],
    ['xs', 20],
    ['sm', 24],
    ['md', 28],
    ['lg', 32],
    ['xl', 36],
    ['2xl', 42],
    ['3xl', 48],
    ['4xl', 56],
    ['5xl', 64],
    ['6xl', 72],
    ['7xl', 80],
  ])('container-%s is Tailwind default %srem in px', (name, rem) => {
    const declaration = `--container-${name}: ${rem * 16}px;`;
    expect(invariant).toContain(declaration);
    expect(tailwind).toContain(declaration);
  });

  it('declares exactly the 13 containers, after resetting the Tailwind defaults', () => {
    expect(tokens.containers).toHaveLength(13);
    const reset = tailwind.indexOf('--container-*: initial;');
    expect(reset).toBeGreaterThan(-1);
    expect(reset).toBeLessThan(tailwind.indexOf('--container-3xs:'));
  });
});

it('runs Tailwind transitions on the design motion and easing', () => {
  const inline = /@theme inline \{[^}]*\}/.exec(
    renderTailwindCss(loadDesignTokens(packageDir)),
  );
  expect(inline?.[0]).toContain(
    '--default-transition-duration: var(--motion);',
  );
  expect(inline?.[0]).toContain(
    '--default-transition-timing-function: var(--ease);',
  );
});

it('stops animations, vendor transitions and smooth scrolling when the viewer prefers reduced motion', () => {
  const base = readFileSync(resolve(packageDir, 'src/design/base.css'), 'utf8');
  const reduced =
    /@media \(prefers-reduced-motion: reduce\) \{([\s\S]*?)\n {2}\}/.exec(base);
  expect(reduced?.[1].replace(/\s+/g, ' ')).toContain(
    '*, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; }',
  );
  // tokens.css owns --motion and its override; a layered copy here would always lose.
  expect(base).not.toContain('--motion:');
  expect(base).not.toContain('--ease:');
});

it('src/design/index.ts is the generator output for design/tokens.json (run `npm run build` in apps/explorer to refresh it)', () => {
  expect(readFileSync(resolve(packageDir, 'src/design/index.ts'), 'utf8')).toBe(
    renderConstants(loadDesignTokens(packageDir)),
  );
});
