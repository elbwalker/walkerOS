import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative, resolve, sep } from 'node:path';
import { collectDeclaredNames } from '../names';
import { globToRegExp } from './glob';
import { RULES, scanFile, type Finding, type RuleId } from './rules';

export interface CliIo {
  readonly cwd: string;
  /** The directory holding the shipped tokens.css, tailwind.css and base.css. */
  readonly designDir: string;
  readonly out: (line: string) => void;
  readonly err: (line: string) => void;
}

interface Allow {
  /** Set for `--allow <rule>:<glob>`: only that rule's findings are dropped. */
  readonly rule?: RuleId;
  readonly pattern: RegExp;
}

const SCANNED = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.css',
  '.scss',
  '.mdx',
  '.html',
  '.svg',
]);
const SKIPPED_DIRS = new Set([
  'node_modules',
  'dist',
  'build',
  'coverage',
  'storybook-static',
]);
const DESIGN_CSS = ['tokens.css', 'tailwind.css', 'base.css'];
const USAGE =
  'usage: walkeros-design-check [--allow [<rule>:]<glob>]... [--allow-var <prefix>]... <path>...';
const SCOPED = /^([a-z-]+):(.+)$/;

const isRule = (value: string): value is RuleId =>
  RULES.some((rule) => rule === value);

function parseAllow(value: string): Allow | string {
  const scoped = SCOPED.exec(value);
  if (scoped !== null) {
    const rule = scoped[1];
    if (!isRule(rule)) return `unknown rule "${rule}" in --allow ${value}`;
    const pattern = globToRegExp(scoped[2]);
    return pattern === undefined
      ? `invalid glob in --allow ${value}`
      : { rule, pattern };
  }
  const pattern = globToRegExp(value);
  return pattern === undefined
    ? `invalid glob in --allow ${value}`
    : { pattern };
}

function usage(io: CliIo, problem: string): number {
  io.err(`walkeros-design-check: ${problem}`);
  io.err(USAGE);
  return 2;
}

function walk(path: string, into: string[]): void {
  if (statSync(path).isFile()) {
    if (SCANNED.has(extname(path))) into.push(path);
    return;
  }
  const entries = readdirSync(path, { withFileTypes: true }).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  for (const entry of entries) {
    if (entry.name.startsWith('.') || SKIPPED_DIRS.has(entry.name)) continue;
    const child = join(path, entry.name);
    if (entry.isDirectory()) walk(child, into);
    else if (entry.isFile() && SCANNED.has(extname(entry.name)))
      into.push(child);
  }
}

/** Exit 0: clean. 1: findings. 2: usage error, missing path, nothing scanned, or explorer not built. */
export function main(argv: readonly string[], io: CliIo): number {
  const allows: Allow[] = [];
  const allowVarPrefixes: string[] = [];
  const roots: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--allow' || arg === '--allow-var') {
      const value = argv[i + 1];
      i++;
      if (value === undefined || value === '' || value.startsWith('--'))
        return usage(io, `${arg} needs a value`);
      if (arg === '--allow-var') {
        allowVarPrefixes.push(value);
        continue;
      }
      const allow = parseAllow(value);
      if (typeof allow === 'string') return usage(io, allow);
      allows.push(allow);
    } else if (arg.startsWith('--')) {
      return usage(io, `unknown option ${arg}`);
    } else {
      roots.push(arg);
    }
  }
  if (roots.length === 0) return usage(io, 'no path given');

  const missing = DESIGN_CSS.filter(
    (file) => !existsSync(join(io.designDir, file)),
  );
  if (missing.length > 0) {
    io.err(
      `walkeros-design-check: ${missing.join(', ')} missing in ${io.designDir}; build @walkeros/explorer first`,
    );
    return 2;
  }
  const designNames = collectDeclaredNames(
    DESIGN_CSS.map((file) =>
      readFileSync(join(io.designDir, file), 'utf8'),
    ).join('\n'),
  );

  const files: string[] = [];
  for (const root of roots) {
    const path = resolve(io.cwd, root);
    if (!existsSync(path)) {
      io.err(`walkeros-design-check: ${root} does not exist`);
      return 2;
    }
    walk(path, files);
  }
  const sources = files.map((path) => ({
    file: relative(io.cwd, path).split(sep).join('/'),
    text: readFileSync(path, 'utf8'),
  }));
  const fileAllowed = (file: string): boolean =>
    allows.some(
      (allow) => allow.rule === undefined && allow.pattern.test(file),
    );
  const ruleAllowed = (finding: Finding): boolean =>
    allows.some(
      (allow) =>
        allow.rule === finding.rule && allow.pattern.test(finding.file),
    );
  const scanned = sources.filter((source) => !fileAllowed(source.file));
  if (scanned.length === 0) {
    io.err(
      'walkeros-design-check: no file scanned; check the paths and --allow globs',
    );
    return 2;
  }

  // A variable declared anywhere under the paths counts, allowed files included.
  const context = {
    designNames,
    declaredNames: collectDeclaredNames(
      sources.map((source) => source.text).join('\n'),
    ),
    allowVarPrefixes,
  };
  const findings = scanned
    .flatMap((source) => scanFile(source.file, source.text, context))
    .filter((finding) => !ruleAllowed(finding));
  for (const finding of findings) {
    io.out(
      `${finding.file}:${finding.line}:${finding.column} ${finding.rule} ${finding.match}`,
    );
  }
  io.err(
    `walkeros-design-check: ${findings.length} finding(s) in ${scanned.length} file(s)`,
  );
  return findings.length > 0 ? 1 : 0;
}
