import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { main } from '../check/cli';
import { globToRegExp } from '../check/glob';
import { scanFile, type RuleId } from '../check/rules';
import {
  loadDesignTokens,
  renderTailwindCss,
  renderTokensCss,
} from '../generate';
import { collectDeclaredNames } from '../names';

const packageDir = resolve(__dirname, '../../..');
const tokens = loadDesignTokens(packageDir);
const designCss = {
  'tokens.css': renderTokensCss(tokens),
  'tailwind.css': renderTailwindCss(tokens),
  'base.css': readFileSync(resolve(packageDir, 'src/design/base.css'), 'utf8'),
};
const designNames = collectDeclaredNames(Object.values(designCss).join('\n'));

describe('globToRegExp', () => {
  it.each<readonly [string, string, boolean]>([
    ['**/*.svg', 'src/icons/logo.svg', true],
    ['**/*.svg', 'logo.svg', true],
    ['src/*.ts', 'src/a.ts', true],
    ['src/*.ts', 'src/a/b.ts', false],
    ['src/**/brand-svgs.ts', 'src/brand-svgs.ts', true],
    ['src/**/brand-svgs.ts', 'src/icons/deep/brand-svgs.ts', true],
    ['**/*.{svg,png}', 'a/b.png', true],
    ['a?.ts', 'ab.ts', true],
    ['src/lib/z-band.ts', 'src/lib/zXband.ts', false],
    ['src/graphify-out/**', 'src/graphify-out/x/y.json', true],
  ])('%s matches %s: %s', (glob, path, expected) => {
    expect(globToRegExp(glob)?.test(path)).toBe(expected);
  });

  it('refuses an unclosed brace', () => {
    expect(globToRegExp('src/{a')).toBeUndefined();
  });
});

describe('scanFile', () => {
  it.each<readonly [RuleId, string, string, readonly string[]]>([
    ['color-literal', 'a.tsx', "const c = '#01b5e2';", ['#01b5e2']],
    [
      'color-literal',
      'a.css',
      '.a { background: rgba(0, 0, 0, 0.5); }',
      ['rgba(0, 0, 0, 0.5)'],
    ],
    ['color-literal', 'a.tsx', '<a href="#top">&#123;</a>', []],
    // Tailwind arbitrary values write spaces as _.
    ['color-literal', 'a.tsx', "const c = 'shadow-[0_0_4px_#000]';", ['#000']],
    [
      'color-literal',
      'a.tsx',
      "const c = '[box-shadow:0_0_0_1px_rgba(0,0,0,0.1)]';",
      ['rgba(0,0,0,0.1)'],
    ],
    [
      'color-literal',
      'a.tsx',
      "const c = 'shadow-[0_0_0_1px_var(--border-strong)] bg-[color:var(--surface)]';",
      [],
    ],
    ['named-color', 'a.css', '.a { color: white; }', ['white']],
    [
      'named-color',
      'a.css',
      '.a { border: 1px solid currentColor; background: url(img/red.png); }',
      [],
    ],
    ['named-color', 'a.tsx', '<path fill="white" />', ['white']],
    ['named-color', 'a.tsx', '<Badge color="danger" />', []],
    [
      'palette-class',
      'a.tsx',
      '<p className="hover:bg-zinc-500/50 p-2" />',
      ['bg-zinc-500/50'],
    ],
    ['palette-class', 'a.css', '.a { @apply text-sky-600; }', ['text-sky-600']],
    ['palette-class', 'a.tsx', '// bg-zinc-500 stays a comment', []],
    [
      'white-black-class',
      'a.tsx',
      "cn('text-white', 'bg-black/40')",
      ['text-white', 'bg-black/40'],
    ],
    [
      'white-black-class',
      'a.tsx',
      "const c = 'text-on-primary bg-backdrop'; // text-white in a comment",
      [],
    ],
    [
      'dark-variant',
      'a.tsx',
      "const c = 'dark:bg-surface md:dark:text-fg';",
      ['dark:', 'dark:'],
    ],
    ['dark-variant', 'a.ts', "const theme = { dark: 'x' };", []],
    [
      'shadow-class',
      'a.tsx',
      "const c = 'shadow-lg drop-shadow-md';",
      ['shadow-lg', 'drop-shadow-md'],
    ],
    [
      'shadow-class',
      'a.tsx',
      "const c = 'shadow-none shadow-plan-highlight';",
      [],
    ],
    [
      'shadow-class',
      'a.tsx',
      "const c = 'hover:drop-shadow';",
      ['drop-shadow'],
    ],
    [
      'shadow-class',
      'a.ts',
      "const css = 'filter: drop-shadow(0 0 2px var(--fg)); a shadow root';",
      [],
    ],
    ['z-class', 'a.tsx', "const c = 'z-[60] -z-10';", ['z-[60]', '-z-10']],
    ['z-class', 'a.tsx', "const c = 'z-(--z-modal) z-auto';", []],
    [
      'text-size-class',
      'a.tsx',
      "const c = 'text-sm/6 md:text-2xl';",
      ['text-sm', 'text-2xl'],
    ],
    [
      'text-size-class',
      'a.tsx',
      "const c = 'text-product-body text-fg-2';",
      [],
    ],
    [
      'radius-class',
      'a.tsx',
      "const c = 'rounded rounded-2xl rounded-t-[6px]';",
      ['rounded', 'rounded-2xl', 'rounded-t-[6px]'],
    ],
    [
      'radius-class',
      'a.tsx',
      "const c = 'rounded-md rounded-t-lg rounded-full rounded-faq rounded-(--radius-md)';",
      [],
    ],
    [
      'radius-class',
      'a.tsx',
      "const c = 'before:rounded-[calc(var(--radius-md)-1px)]';",
      [],
    ],
    ['var-fallback', 'a.css', '.a { color: var(--fg, #000); }', ['var(--fg,']],
    [
      'var-fallback',
      'a.css',
      '.a { --local: 1px; top: var(--local, 2px); }',
      [],
    ],
    [
      'undeclared-var',
      'a.css',
      '.a { top: var(--nowhere); }',
      ['var(--nowhere'],
    ],
    [
      'undeclared-var',
      'a.tsx',
      "<div style={{ '--mark': '1' }} className=\"w-(--mark) p-(--card-pad)\" />",
      [],
    ],
    [
      'undeclared-var',
      'a.ts',
      "el.style.setProperty('--grid-min', '1px'); const w = 'var(--grid-min) var(--tw-ring-color)';",
      [],
    ],
    [
      'undeclared-var',
      'a.tsx',
      "const c = 'font-(--font-weight-medium) tracking-(--tracking-wide) max-w-(--container-md)';",
      [],
    ],
    // Built in from the shared Tailwind namespace list: kept namespaces count, reset ones do not.
    [
      'undeclared-var',
      'a.css',
      '.a { color: var(--color-zinc-500); animation: var(--animate-spin); }',
      ['var(--color-zinc-500'],
    ],
    [
      'color-scheme',
      'a.css',
      '@media (prefers-color-scheme: dark) { .a { top: 0; } }',
      ['prefers-color-scheme'],
    ],
    ['color-scheme', 'a.css', '.a { color-scheme: dark; }', []],
    [
      'z-index',
      'a.css',
      '.a { z-index: 10; } .b { z-index: var(--z-modal); }',
      ['z-index: 10'],
    ],
    [
      'z-index',
      'a.tsx',
      '<div style={{ zIndex: 2147483350 }} />',
      ['zIndex: 2147483350'],
    ],
    [
      'z-index',
      'a.ts',
      'const GRIP_CSS = `:host { z-index: 2147483647 !important; }`;',
      ['z-index: 2147483647'],
    ],
    ['z-index', 'a.tsx', "<div style={{ zIndex: 'var(--z-toast)' }} />", []],
  ])('%s in %s: %s', (rule, file, snippet, expected) => {
    const context = {
      designNames,
      declaredNames: collectDeclaredNames(snippet),
      allowVarPrefixes: [],
    };
    const matches = scanFile(file, snippet, context)
      .filter((finding) => finding.rule === rule)
      .map((finding) => finding.match);
    expect(matches).toEqual(expected);
  });

  it('reports a class inside a multi-line template literal at its own line and column', () => {
    const context = {
      designNames,
      declaredNames: new Set<string>(),
      allowVarPrefixes: [],
    };
    expect(scanFile('a.tsx', 'const c = `p-2\n  text-xs`;', context)).toEqual([
      {
        file: 'a.tsx',
        line: 2,
        column: 3,
        rule: 'text-size-class',
        match: 'text-xs',
      },
    ]);
  });
});

describe('walkeros-design-check', () => {
  const tempDirs: string[] = [];
  const tempDir = (prefix: string): string => {
    const dir = mkdtempSync(join(tmpdir(), prefix));
    tempDirs.push(dir);
    return dir;
  };
  afterAll(() => {
    for (const dir of tempDirs) rmSync(dir, { recursive: true, force: true });
  });
  const designDir = tempDir('design-css-');
  for (const [file, css] of Object.entries(designCss))
    writeFileSync(join(designDir, file), css);

  function run(
    files: Record<string, string>,
    argv: readonly string[],
    design = designDir,
  ) {
    const cwd = tempDir('design-check-');
    for (const [path, content] of Object.entries(files)) {
      mkdirSync(dirname(join(cwd, path)), { recursive: true });
      writeFileSync(join(cwd, path), content);
    }
    const out: string[] = [];
    const err: string[] = [];
    const code = main(argv, {
      cwd,
      designDir: design,
      out: (line) => out.push(line),
      err: (line) => err.push(line),
    });
    return { code, out, err };
  }

  it.each<
    readonly [
      string,
      Record<string, string>,
      readonly string[],
      number,
      readonly string[],
    ]
  >([
    [
      'a clean package',
      { 'src/a.css': '.a { color: var(--fg); }' },
      ['src'],
      0,
      [],
    ],
    [
      'a finding',
      { 'src/a.tsx': '<p className="text-sm" />' },
      ['src'],
      1,
      ['src/a.tsx:1:15 text-size-class text-sm'],
    ],
    [
      'an allowed file next to a clean one',
      {
        'src/a.tsx': '<p className="text-sm" />',
        'src/b.css': '.b { top: 0; }',
      },
      ['--allow', 'src/a.tsx', 'src'],
      0,
      [],
    ],
    [
      'a rule-scoped allow',
      { 'src/band.css': '.g { z-index: 2147483647; color: #fff; }' },
      ['--allow', 'z-index:src/band.css', 'src'],
      1,
      ['src/band.css:1:34 color-literal #fff'],
    ],
    [
      'a third-party variable without --allow-var',
      { 'src/a.css': '.a { top: var(--ifm-navbar-height); }' },
      ['src'],
      1,
      ['src/a.css:1:11 undeclared-var var(--ifm-navbar-height'],
    ],
    [
      'a third-party variable with --allow-var',
      { 'src/a.css': '.a { top: var(--ifm-navbar-height); }' },
      ['--allow-var', 'ifm-', 'src'],
      0,
      [],
    ],
    [
      'a variable declared in an allowed file',
      {
        'src/band.ts': "export const band = { '--band-top': '1' };",
        'src/a.css': '.a { top: var(--band-top); }',
      },
      ['--allow', 'src/band.ts', 'src'],
      0,
      [],
    ],
    ['a missing path', {}, ['nowhere'], 2, []],
    [
      'every file allowed',
      { 'src/a.tsx': '<p />' },
      ['--allow', '**/*.tsx', 'src'],
      2,
      [],
    ],
    ['an unknown option', { 'src/a.css': '.a {}' }, ['--fix', 'src'], 2, []],
    ['--allow without a value', { 'src/a.css': '.a {}' }, ['--allow'], 2, []],
    [
      'an empty --allow-var prefix',
      { 'src/a.css': '.a { top: var(--nowhere); }' },
      ['--allow-var', '', 'src'],
      2,
      [],
    ],
    [
      'an unknown rule in a scoped allow',
      { 'src/a.css': '.a {}' },
      ['--allow', 'zindex:src/a.css', 'src'],
      2,
      [],
    ],
    [
      'an invalid glob',
      { 'src/a.css': '.a {}' },
      ['--allow', 'src/{a', 'src'],
      2,
      [],
    ],
  ])('%s', (_label, files, argv, code, out) => {
    const result = run(files, argv);
    expect(result.code).toBe(code);
    expect(result.out).toEqual(out);
    if (code === 2) expect(result.err.length).toBeGreaterThan(0);
  });

  it('exits 2 when explorer is not built (no design CSS beside the checker)', () => {
    const result = run(
      { 'src/a.css': '.a { color: var(--fg); }' },
      ['src'],
      tempDir('design-empty-'),
    );
    expect(result.code).toBe(2);
    expect(result.err.join('\n')).toContain('build @walkeros/explorer');
  });
});
