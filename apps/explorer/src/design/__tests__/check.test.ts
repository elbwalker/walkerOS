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
import { localLiteralLengths, scanFile, type RuleId } from '../check/rules';
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
    // An arbitrary literal size; the match stops before a /line-height.
    [
      'text-size-class',
      'a.tsx',
      "const c = 'text-[11px] md:text-[0.7rem] text-[13px]/5 text-[length:12px] text-[clamp(1rem,2vw,2rem)]';",
      [
        'text-[11px]',
        'text-[0.7rem]',
        'text-[13px]',
        'text-[length:12px]',
        'text-[clamp(1rem,2vw,2rem)]',
      ],
    ],
    [
      'text-size-class',
      'a.tsx',
      "const c = 'text-product-micro text-[length:var(--type-product-caption-size)] text-[var(--x)] text-[calc(var(--type-product-small-size)*0.9)] text-[color:var(--fg)]';",
      [],
    ],
    [
      'motion-class',
      'a.tsx',
      "const c = 'duration-150 hover:duration-[250ms] ease-in ease-out ease-in-out ease-linear ease-[cubic-bezier(0.4,0,0.2,1)]';",
      [
        'duration-150',
        'duration-[250ms]',
        'ease-in',
        'ease-out',
        'ease-in-out',
        'ease-linear',
        'ease-[cubic-bezier(0.4,0,0.2,1)]',
      ],
    ],
    [
      'motion-class',
      'a.tsx',
      "const c = 'transition transition-colors delay-150 animate-spin duration-0 duration-[0ms] duration-(--motion) ease-(--ease) duration-[var(--motion)]'; // duration-150 in a comment",
      [],
    ],
    ['motion-class', 'a.css', '.a { @apply duration-300; }', ['duration-300']],
    // A CSS transition value is not a class list: motion-literal owns it.
    [
      'motion-class',
      'a.tsx',
      "<div style={{ transition: 'transform 150ms ease-in-out' }} />",
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
    // The type style variables are design names: the checker reads them from tokens.css.
    [
      'undeclared-var',
      'a.css',
      '.a { font-size: var(--type-body-size); } .b { font-size: clamp(38px, 6vw, var(--type-display-size)); top: var(--type-nowhere-size); }',
      ['var(--type-nowhere-size'],
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
    [
      'motion-literal',
      'a.css',
      '.a { transition: opacity 150ms ease; } .b { transition-duration: .2s; } .c { transition: all 0.3s; }',
      ['150ms', 'ease', '.2s', '0.3s'],
    ],
    [
      'motion-literal',
      'a.scss',
      '.a {\n  transition:\n    color 0.2s ease-out,\n    background-color var(--motion) var(--ease);\n  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);\n}',
      ['0.2s', 'ease-out', 'cubic-bezier(0.4, 0, 0.2, 1)'],
    ],
    [
      'motion-literal',
      'a.tsx',
      "<div style={{ transition: 'transform 150ms ease-in-out', transitionDuration: 150 }} />",
      ['150ms', 'ease-in-out', '150'],
    ],
    [
      'motion-literal',
      'a.ts',
      "const css = `.a { transition: opacity 0.15s; }`; const c = '[transition:opacity_150ms]';",
      ['0.15s', '150ms'],
    ],
    [
      'motion-literal',
      'a.css',
      '.a { transition: none; } .b { transition: opacity var(--motion) var(--ease); transition-delay: 150ms; } .c { animation: spin 1s linear infinite; transition-duration: 0s; } @keyframes spin { from { opacity: 0; } to { opacity: 1; } }',
      [],
    ],
    [
      'motion-literal',
      'a.tsx',
      "<div style={{ transition: 'opacity var(--motion) var(--ease) 150ms', animation: 'spin 1s linear infinite' }} />",
      [],
    ],
    [
      'font-literal',
      'a.css',
      '.a { font-size: 12px; } .b { font-size: 0.8rem; } .c { font-family: system-ui, sans-serif; } .d { font-size: smaller; }',
      ['12px', '0.8rem', 'system-ui, sans-serif', 'smaller'],
    ],
    [
      'font-literal',
      'a.tsx',
      "<p style={{ fontSize: 12, fontFamily: 'Inter' }} /><span style={{ fontSize: '12px' }} /><text fontSize={10} fontFamily=\"system-ui\" />",
      ['12', "'Inter'", '12px', '10', '"system-ui"'],
    ],
    [
      'font-literal',
      'a.ts',
      'const css = `.a { font-size: 11px; font-family: monospace; }`;',
      ['11px', 'monospace'],
    ],
    [
      'font-literal',
      'a.css',
      '.a { font-size: var(--type-product-small-size); } .b { font-size: calc(var(--type-product-caption-size) * var(--tp-label-k, 1)); } .c { font-size: inherit; font-family: var(--font-mono); font-weight: 600; } .d { font-family: inherit; }',
      [],
    ],
    [
      'font-literal',
      'a.css',
      "@font-face { font-family: 'Geist'; src: url(geist.woff2); }",
      [],
    ],
    // A fluid heading: the type style holds the max, the clamp() scales it down.
    [
      'font-literal',
      'a.css',
      '.a { font-size: clamp(38px, 6vw, var(--type-display-size)); } .b { font-size: clamp(38px, 6vw, 64px); }',
      ['38px', '6vw', '64px'],
    ],
    // A declaration quoted in a comment is not one.
    [
      'font-literal',
      'a.scss',
      '/* pre and code use font-size: inherit, so they pick\n   this 15px up */\n// transition: all 0.2s ease\n.a {\n  font-size: var(--type-code-command-size);\n}',
      [],
    ],
    [
      'motion-literal',
      'a.scss',
      '// transition: all 0.2s ease\n.a { color: var(--fg); } /* transition: opacity 150ms */',
      [],
    ],
    [
      'font-literal',
      'a.tsx',
      "interface P { fontSize?: number; fontFamily: string } <p style={{ fontSize: 'var(--type-product-small-size)', fontFamily: fontMono }} />",
      [],
    ],
    // A quoted unitless number is a px size too.
    [
      'font-literal',
      'a.tsx',
      '<text fontSize="10" /><p style={{ fontSize: \'12\' }} /><text fontSize="var(--type-product-micro-size)" />',
      ['"10"', "'12'"],
    ],
    [
      'motion-literal',
      'a.tsx',
      "<div style={{ transitionDuration: '150' }} />",
      ["'150'"],
    ],
    // The font shorthand: its sizes and its family.
    [
      'font-literal',
      'a.css',
      '.a { font: var(--type-product-small-size) Menlo, monospace; } .b { font: 12px/1.5 system-ui; }',
      [
        'var(--type-product-small-size) Menlo, monospace',
        '12px',
        '12px/1.5 system-ui',
      ],
    ],
    [
      'font-literal',
      'a.css',
      '.a { font: inherit; } .b { font: italic 600 var(--type-product-small-size)/var(--type-product-small-line-height) var(--font-sans); }',
      [],
    ],
    // In the transition shorthand the first time of each item is its duration; a later one is a delay.
    [
      'motion-literal',
      'a.css',
      '.a { transition: opacity var(--motion) var(--ease) 150ms; } .b { transition: opacity 150ms var(--ease) 50ms, color var(--motion) var(--ease) 0.1s; }',
      ['150ms'],
    ],
    // A literal after an interpolation in a CSS template is still read.
    [
      'motion-literal',
      'a.ts',
      'const css = `.a { transition: opacity ${motion} 150ms; }`;',
      ['150ms'],
    ],
    [
      'motion-literal',
      'a.ts',
      'const css = `.a { transition: opacity ${motion} ${ease}; }`;',
      [],
    ],
    [
      'font-literal',
      'a.ts',
      'const css = `.a { font-family: ${fontSans}, monospace; font-size: ${typeProductSmall.size}; }`;',
      ['${fontSans}, monospace'],
    ],
    // A literal size behind a local name is flagged where a font size reads it.
    [
      'font-literal',
      'a.css',
      '.a { --x-size: 11px; font-size: var(--x-size); } .b { font: 600 var(--x-size)/1.4 var(--font-sans); }',
      ['var(--x-size', 'var(--x-size'],
    ],
    [
      'font-literal',
      'a.scss',
      '$size: 12px;\n.a { font-size: $size; }',
      ['$size'],
    ],
    [
      'font-literal',
      'a.tsx',
      "<p style={{ '--x-size': '11px', fontSize: 'var(--x-size)' }} />",
      ['var(--x-size'],
    ],
    // A local alias of a design variable, and geometry no font size reads, pass.
    [
      'font-literal',
      'a.css',
      '.a { --x: var(--type-product-small-size); font-size: var(--x); } .b { --grid-min: 350px; width: var(--grid-min); } .c { --tp-label-k: 1.2; font-size: calc(var(--type-product-caption-size) * var(--tp-label-k, 1)); }',
      [],
    ],
    [
      'font-literal',
      'a.scss',
      '$gap: 12px;\n// $note: 12px\n.a { padding: $gap; font-size: var(--type-product-small-size); }',
      [],
    ],
    // Script comments are not scanned; strings that contain // are.
    [
      'font-literal',
      'a.tsx',
      "// fontSize: 12\nconst url = 'https://x'; /* <p style={{ fontSize: 11 }} /> */ const s = { fontSize: 13 };",
      ['13'],
    ],
    [
      'motion-literal',
      'a.ts',
      "/* { transition: 'all 150ms' } */ // transitionDuration: 150\nconst s = { transition: 'none' };",
      [],
    ],
  ])('%s in %s: %s', (rule, file, snippet, expected) => {
    const context = {
      designNames,
      declaredNames: collectDeclaredNames(snippet),
      allowVarPrefixes: [],
      literalLengths: localLiteralLengths(file, snippet),
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
      literalLengths: new Set<string>(),
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
      'a literal size behind an SCSS variable declared in another file',
      {
        'src/_vars.scss': '$size: 12px;',
        'src/a.scss': '.a { font-size: $size; }',
      },
      ['src'],
      1,
      ['src/a.scss:1:17 font-literal $size'],
    ],
    [
      'a design variable quoted with a literal in another file',
      {
        'src/t.ts': "const css = '--type-product-small-size: 13px;';",
        'src/a.css': '.a { font-size: var(--type-product-small-size); }',
      },
      ['src'],
      0,
      [],
    ],
    [
      'a rule-scoped allow of a vendor literal',
      {
        'src/editor.ts': 'const options = { fontSize: 13, color: "#fff" };',
      },
      ['--allow', 'font-literal:src/editor.ts', 'src'],
      1,
      ['src/editor.ts:1:41 color-literal #fff'],
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
