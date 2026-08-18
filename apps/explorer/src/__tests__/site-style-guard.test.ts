import * as fs from 'fs';
import * as path from 'path';

/**
 * Open Air site layer: no raw colour values outside the token file.
 *
 * The design language is only enforceable if colour lives in exactly one
 * place. A hex in a component is how a design system quietly stops being one,
 * and it is invisible in review, so it is checked mechanically instead.
 */

const SITE_STYLES = path.resolve(__dirname, '../styles/site');
const SITE_COMPONENTS = path.resolve(__dirname, '../site');

/** The one file allowed to name colours. */
const TOKEN_FILE = '_variables.scss';

const HEX = /#[0-9a-fA-F]{3,8}\b/;
const COLOR_FN = /\b(rgb|rgba|hsl|hsla)\(/;
const INLINE_STYLE = /\sstyle=\{/;

function walk(dir: string, extensions: string[]): string[] {
  if (!fs.existsSync(dir)) return [];

  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full, extensions);
    return extensions.some((ext) => entry.name.endsWith(ext)) ? [full] : [];
  });
}

function offendingLines(file: string, pattern: RegExp): string[] {
  return fs
    .readFileSync(file, 'utf8')
    .split('\n')
    .map((line, index) => ({ line, number: index + 1 }))
    .filter(({ line }) => pattern.test(line) && !line.trim().startsWith('//'))
    .map(
      ({ line, number }) => `${path.basename(file)}:${number} ${line.trim()}`,
    );
}

describe('site style guard', () => {
  const styleFiles = walk(SITE_STYLES, ['.scss']).filter(
    (file) => path.basename(file) !== TOKEN_FILE,
  );
  const componentFiles = walk(SITE_COMPONENTS, ['.tsx', '.ts']);

  it('finds the site layer to check', () => {
    expect(styleFiles.length).toBeGreaterThan(0);
    expect(componentFiles.length).toBeGreaterThan(0);
  });

  it.each([
    ['hex colours', HEX],
    ['colour functions', COLOR_FN],
  ])('site SCSS contains no %s outside the token file', (_label, pattern) => {
    const offenders = styleFiles.flatMap((file) =>
      offendingLines(file, pattern),
    );
    expect(offenders).toEqual([]);
  });

  it('site components contain no hex colours', () => {
    const offenders = componentFiles.flatMap((file) =>
      offendingLines(file, HEX),
    );
    expect(offenders).toEqual([]);
  });

  it('site components contain no inline style props', () => {
    const offenders = componentFiles.flatMap((file) =>
      offendingLines(file, INLINE_STYLE),
    );
    expect(offenders).toEqual([]);
  });
});
