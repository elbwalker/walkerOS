// `npm run check:platform`, from the walkerOS root. Every package is one
// platform: web, server, or neutral (usable on both). This checks that the
// package's tsconfig and eslint config enforce its platform and prints every
// violation. CI runs it on every run, outside turbo, so no cache can replay an
// old pass.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';
import ts from 'typescript';
import { browserGlobals, nodeBuiltins, nodeGlobals } from '../eslint/index.mjs';

// The platform of every package that is not a step package. A step package
// declares it in walkerOS.platform: ["web"], ["server"], or both for neutral.
const declared = {
  'packages/core': 'neutral',
  'packages/collector': 'neutral',
  'packages/web/core': 'web',
  'apps/walkerjs': 'web',
  'apps/explorer': 'web',
  'apps/storybook-addon': 'web',
  'packages/server/core': 'server',
  'packages/cli': 'server',
  'apps/cli': 'server',
  'packages/runner': 'server',
  'packages/mcps/mcp': 'server',
  'packages/mcps/source-browser': 'server',
};

const presets = { neutral: 'base.json', web: 'web.json', server: 'node.json' };
const presetTypes = ['node', 'jest'];

// Neutral and web code ships in walker.js, so its lib stays at this ES year.
// Only web packages that never ship in walker.js may raise it.
const esFloor = 2020;
const esRaised = ['apps/explorer', 'apps/storybook-addon'];

// Ambient vendor types a package may add to the preset's types.
const vendorTypes = {
  'packages/web/destinations/gtag': ['gtag.js'],
  'packages/web/destinations/meta': ['facebook-pixel'],
};

// What each platform's eslint config bans: globals and imports in sources,
// and in every file, tests included, triple-slash references and jsdom.
const bans = {
  neutral: {
    globals: [...browserGlobals, ...nodeGlobals, 'globalThis'],
    imports: [...nodeBuiltins, 'jsdom'],
    testImports: ['jsdom'],
    nodePrefix: true,
    tripleSlash: true,
  },
  web: {
    globals: nodeGlobals,
    imports: nodeBuiltins,
    testImports: [],
    nodePrefix: true,
    tripleSlash: false,
  },
  server: {
    globals: browserGlobals,
    imports: [],
    testImports: [],
    nodePrefix: false,
    tripleSlash: true,
  },
};

// The only files where a ban is lifted, and the names it lifts. '*' lifts
// every banned global and Node import; jsdom and triple-slash bans still hold.
const exemptions = [
  // The ./node entry of core.
  { pkg: 'packages/core', files: ['src/node.ts', 'src/node/**'], allow: '*' },
  // The kit's one replace(globalThis, 'fetch', ...).
  {
    pkg: 'packages/collector',
    files: ['src/dev/boundary.ts'],
    allow: ['globalThis'],
  },
  // walkeros-design-check, a Node bin.
  {
    pkg: 'apps/explorer',
    files: ['src/design/check/**', 'src/design/generate.ts'],
    allow: '*',
  },
  // process.env.NODE_ENV, the define every React bundler sets.
  {
    pkg: 'apps/explorer',
    files: ['src/components/atoms/code.tsx'],
    allow: ['process'],
  },
];

function platformOf(rel, pkg) {
  const field = pkg.walkerOS?.platform;
  if (!field) return declared[rel];
  const web = field.includes('web');
  const server = field.includes('server');
  if (web && server) return 'neutral';
  if (web) return 'web';
  if (server) return 'server';
}

export function readTsconfig(path) {
  const { config, error } = ts.readConfigFile(path, ts.sys.readFile);
  if (error)
    throw new Error(ts.flattenDiagnosticMessageText(error.messageText, '\n'));
  const { options } = ts.parseJsonConfigFileContent(
    config,
    ts.sys,
    join(path, '..'),
  );
  return { raw: config, options };
}

// Without a lib, TypeScript loads the target's default lib, the DOM included.
const hasDom = (options) =>
  !options.lib || options.lib.some((file) => file.startsWith('lib.dom.'));
const domProblem = (options) =>
  options.lib ? 'lib has dom' : 'sets no lib, so TypeScript loads the DOM';

// The newest ES year the lib names: lib.es2022.d.ts, lib.es2021.string.d.ts.
const esLevel = (options) =>
  Math.max(
    0,
    ...(options.lib ?? []).map((file) => {
      const year = /^lib\.es(\d{4}|next)\b/.exec(file)?.[1];
      return year === 'next' ? Infinity : Number(year ?? 0);
    }),
  );
const esProblem = `lib goes past es${esFloor}, the floor of walker.js`;

export function presetProblems(name, { options }) {
  const problems = [];
  const web = name === presets.web;
  if (web !== hasDom(options))
    problems.push(web ? 'lib drops dom' : domProblem(options));
  if (name !== presets.server && esLevel(options) > esFloor)
    problems.push(esProblem);
  if (String(options.types) !== String(presetTypes))
    problems.push(
      `types is ${JSON.stringify(options.types)}, not ${JSON.stringify(presetTypes)}`,
    );
  return problems;
}

export function tsconfigProblems(rel, platform, { raw, options }) {
  const problems = [];
  const preset = `@walkeros/config/tsconfig/${presets[platform]}`;
  if (raw.extends !== preset)
    problems.push(
      `tsconfig.json extends ${JSON.stringify(raw.extends)}, not ${preset}`,
    );
  if (platform === 'web' && !hasDom(options))
    problems.push('tsconfig lib drops dom');
  if (platform !== 'web' && hasDom(options))
    problems.push(`tsconfig ${domProblem(options)}`);
  if (
    platform !== 'server' &&
    !esRaised.includes(rel) &&
    esLevel(options) > esFloor
  )
    problems.push(`tsconfig ${esProblem}`);
  if (!options.types) {
    problems.push('tsconfig sets no types, so every root @types package loads');
  } else {
    const allowed = [...presetTypes, ...(vendorTypes[rel] ?? [])];
    const missing = presetTypes.filter((type) => !options.types.includes(type));
    const extra = options.types.filter((type) => !allowed.includes(type));
    if (missing.length)
      problems.push(`tsconfig types misses ${missing.join(', ')}`);
    if (extra.length)
      problems.push(
        `tsconfig types adds ${extra.join(', ')}, which is not allowlisted`,
      );
  }
  return problems;
}

const listed = (items) =>
  items.length > 6
    ? `${items.slice(0, 5).join(', ')} and ${items.length - 5} more`
    : items.join(', ');

const names = (entries) =>
  entries.map((entry) => (typeof entry === 'string' ? entry : entry.name));

// The banned globals, imports and triple-slash setting of one file's config.
function enforced(rules) {
  const on = (rule) => rule?.[0] === 2;
  const globals = on(rules['no-restricted-globals'])
    ? names(rules['no-restricted-globals'].slice(1))
    : [];
  const imports = on(rules['no-restricted-imports'])
    ? rules['no-restricted-imports'].slice(1)
    : [];
  // The rule takes either names or one { paths, patterns } object.
  const { paths = [], patterns = [] } =
    imports[0]?.paths || imports[0]?.patterns ? imports[0] : { paths: imports };
  const tripleSlash = rules['@typescript-eslint/triple-slash-reference'];
  return {
    globals: new Set(globals),
    imports: new Set(names(paths)),
    nodePrefix: patterns.some(
      (p) => p.regex && new RegExp(p.regex).test('node:fs'),
    ),
    tripleSlash:
      on(tripleSlash) &&
      tripleSlash[1]?.lib === 'never' &&
      tripleSlash[1]?.types === 'never',
  };
}

const isTest = (file) =>
  /(^|\/)__tests__\//.test(file) || /\.test\.(js|ts|tsx)$/.test(file);

// Whether an exemption lifts a banned name in this file.
function lifted(rel, file) {
  const matches = (pattern) =>
    pattern.endsWith('/**')
      ? file.startsWith(pattern.slice(0, -2))
      : file === pattern;
  const exemption = exemptions.find(
    (e) => e.pkg === rel && e.files.some(matches),
  );
  return (name) =>
    exemption?.allow === '*' || Boolean(exemption?.allow.includes(name));
}

// Every source file's effective eslint config bans what its platform bans.
export async function eslintProblems(rel, platform, eslint, files) {
  const ban = bans[platform];
  const byProblem = new Map();
  const add = (problem, file) =>
    byProblem.set(problem, [...(byProblem.get(problem) ?? []), file]);
  for (const file of files) {
    // Only jest's __mocks__ may escape lint (the base config ignores them).
    if (await eslint.isPathIgnored(file)) {
      if (!/(^|\/)__mocks__\//.test(file)) add('ignores the file', file);
      continue;
    }
    const config = await eslint.calculateConfigForFile(file);
    const has = enforced(config?.rules ?? {});
    const test = isTest(file);
    const allow = lifted(rel, file);
    const problems = [];
    const globals = test
      ? []
      : ban.globals.filter((n) => !has.globals.has(n) && !allow(n));
    if (globals.length)
      problems.push(`no-restricted-globals misses ${listed(globals)}`);
    const imports = (test ? ban.testImports : ban.imports).filter(
      (n) => !has.imports.has(n) && (n === 'jsdom' || !allow(n)),
    );
    if (imports.length)
      problems.push(`no-restricted-imports misses ${listed(imports)}`);
    if (ban.nodePrefix && !test && !has.nodePrefix && !allow('node:*'))
      problems.push('no-restricted-imports misses the node: pattern');
    if (ban.tripleSlash && !has.tripleSlash)
      problems.push(
        "triple-slash-reference is not { lib: 'never', types: 'never' }",
      );
    for (const problem of problems) add(problem, file);
  }
  return [...byProblem].map(
    ([problem, list]) =>
      `eslint ${problem} (${list.length === 1 ? list[0] : `${list.length} files, e.g. ${list[0]}`})`,
  );
}

const skip = new Set(['node_modules', 'dist', 'coverage', 'src', '__tests__']);

function findPackages(dir, onlyPublic, found = []) {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files = entries.map((entry) => entry.name);
  if (files.includes('package.json') && files.includes('tsconfig.json')) {
    const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
    if (!onlyPublic || !pkg.private) found.push({ dir, pkg });
  }
  for (const entry of entries)
    if (
      entry.isDirectory() &&
      !skip.has(entry.name) &&
      !entry.name.startsWith('.')
    )
      findPackages(join(dir, entry.name), onlyPublic, found);
  return found;
}

function sourceFiles(dir, found = []) {
  if (!existsSync(dir)) return found;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) sourceFiles(path, found);
    else if (/\.tsx?$/.test(entry.name)) found.push(path);
  }
  return found;
}

export async function check(root) {
  const problems = [];
  for (const name of Object.values(presets)) {
    const preset = readTsconfig(join(root, 'packages/config/tsconfig', name));
    for (const problem of presetProblems(name, preset))
      problems.push(`packages/config/tsconfig/${name}: ${problem}`);
  }
  const packages = [
    ...findPackages(join(root, 'packages'), false),
    ...findPackages(join(root, 'apps'), true),
  ];
  for (const { dir, pkg } of packages) {
    const rel = relative(root, dir);
    const platform = platformOf(rel, pkg);
    if (!platform) {
      problems.push(
        `${rel}: no platform; set walkerOS.platform or add it to the table in check-platform.mjs`,
      );
      continue;
    }
    const own = tsconfigProblems(
      rel,
      platform,
      readTsconfig(join(dir, 'tsconfig.json')),
    );
    const files = sourceFiles(join(dir, 'src')).map((file) =>
      relative(dir, file),
    );
    own.push(
      ...(await eslintProblems(rel, platform, new ESLint({ cwd: dir }), files)),
    );
    problems.push(...own.map((problem) => `${rel} (${platform}): ${problem}`));
  }
  return { packages: packages.length, problems };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { packages, problems } = await check(process.cwd());
  for (const problem of problems) console.error(problem);
  console.log(
    problems.length
      ? `check:platform: ${problems.length} violations in ${packages} packages`
      : `check:platform: ${packages} packages, no violation`,
  );
  process.exitCode = problems.length ? 1 : 0;
}
