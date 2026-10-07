import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  loadDesignTokens,
  renderConstants,
  renderTailwindCss,
  renderTokensCss,
} from '../generate';
import { collectDeclaredNames } from '../names';
import { parseDesignTokens, THEMES } from '../tokens';
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
  // header, invariant block, then one block per theme
  const [, invariant, ...themeBlocks] = renderTokensCss(tokens)
    .trimEnd()
    .split('\n\n');
  const invariantNames = collectDeclaredNames(invariant);
  const missing = THEMES.flatMap((theme, i) => {
    const declared = collectDeclaredNames(themeBlocks[i]);
    return [...tokens.colors, ...tokens.shadows]
      .map((token) => token.name)
      .filter((name) => !declared.has(name) && !invariantNames.has(name))
      .map((name) => `${theme}: ${name}`);
  });
  expect(themeBlocks).toHaveLength(THEMES.length);
  expect(missing).toEqual([]);
});

it('src/design/index.ts is the generator output for design/tokens.json (run `npm run build` in apps/explorer to refresh it)', () => {
  expect(readFileSync(resolve(packageDir, 'src/design/index.ts'), 'utf8')).toBe(
    renderConstants(loadDesignTokens(packageDir)),
  );
});
