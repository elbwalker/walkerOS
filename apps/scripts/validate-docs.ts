#!/usr/bin/env npx tsx
/**
 * Validates documentation quality standards
 * Usage: npx tsx scripts/validate-docs.ts
 */

import { existsSync, readFileSync } from 'fs';
import { glob } from 'glob';
import { dirname, join, relative } from 'path';
import { getUnknownStepKeys, type Flow, type StepType } from '@walkeros/core';
import {
  MINIMAL_EXAMPLE_FILE,
  schemas,
  validateFlowStructure,
} from '@walkeros/core/dev';
import {
  flowCompleteFeatures,
  resolvePointer,
} from '../../packages/cli/src/examples/flow-complete.manifest';
import {
  GUIDE_CHAPTERS,
  findStepExample,
  guideHeading,
} from '../../website/src/components/snippets/flow-complete';

interface Issue {
  file: string;
  line?: number;
  severity: 'error' | 'warning';
  message: string;
}

const ROOT = process.cwd();
const issues: Issue[] = [];

// Pages that document `elb('walker destination', ...)` itself, with the reason.
const LEGACY_PATTERN_ALLOWED: Record<string, string> = {
  'website/docs/collector/commands.mdx':
    'owns the walker commands, documents walker destination',
  'website/docs/migrating/v3-to-v4.mdx':
    'migration guide, quotes the v3 and v4 forms of the command',
};

// Check for legacy API patterns
function checkLegacyPatterns(file: string, content: string): void {
  if (relative(ROOT, file) in LEGACY_PATTERN_ALLOWED) return;
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    // Legacy destination pattern (only in code examples, not explanatory text)
    if (
      line.includes("elb('walker destination'") &&
      !line.includes('//') &&
      !line.includes('legacy')
    ) {
      issues.push({
        file: relative(ROOT, file),
        line: index + 1,
        severity: 'warning',
        message:
          'Uses legacy elb("walker destination") pattern - prefer startFlow()',
      });
    }
  });
}

// Check for old domain references
function checkDomainRefs(file: string, content: string): void {
  if (content.includes('elbwalker.com') && !content.includes('img/elbwalker')) {
    issues.push({
      file: relative(ROOT, file),
      severity: 'warning',
      message: 'Contains old domain reference (elbwalker.com)',
    });
  }
}

// READMEs that are not a package's README, with the reason they need no
// Installation or Usage section.
const README_STRUCTURE_EXEMPT: Record<string, string> = {
  'skills/README.md': 'skills index; installing the plugin is under Usage',
  'packages/core/src/schemas/README.md': 'internal source folder README',
  'packages/cli/examples/shared/README.md': 'example data folder of the cli',
  'packages/cli/examples/customers/README.md': 'example data folder of the cli',
};

// Check README structure
function checkReadmeStructure(file: string, content: string): void {
  if (!file.endsWith('README.md')) return;
  if (relative(ROOT, file) in README_STRUCTURE_EXEMPT) return;

  const hasInstallation = /^##?\s+Installation/im.test(content);
  const hasUsage = /^##?\s+(Usage|Quick Start)/im.test(content);

  if (!hasInstallation) {
    issues.push({
      file: relative(ROOT, file),
      severity: 'warning',
      message: 'README missing Installation section',
    });
  }

  if (!hasUsage) {
    issues.push({
      file: relative(ROOT, file),
      severity: 'warning',
      message: 'README missing Usage/Quick Start section',
    });
  }
}

// Onboarding snippets that show a bundleable flow must carry config.platform.
// `walkeros bundle` throws without it, so a doc snippet missing platform would
// mislead a copy-paste user. We only check snippets that contain a
// `config.bundle` block (the ones actually fed to `walkeros bundle`);
// illustrative fragments without a bundle config are exempt. These files are
// read explicitly because some live outside the main glob set (the root
// README.md and the website/src homepage component are not globbed).
function checkBundledSnippets(): void {
  const platformCheckFiles = [
    'website/docs/getting-started/modes/bundled.mdx',
    'website/docs/getting-started/quickstart/index.mdx',
    'website/docs/getting-started/flow/index.mdx',
    'README.md',
    'website/src/components/organisms/gettingStarted.tsx',
  ];

  // A flow object is bundleable when it declares a bundle config. Match each
  // such region (from its `config` opening up to a `platform`/`bundle` key)
  // and assert a `platform` of "web" or "server" sits alongside the bundle.
  const hasBundle = /"bundle"\s*:/;
  const hasPlatform = /"platform"\s*:\s*"(web|server)"/;

  for (const rel of platformCheckFiles) {
    const abs = join(ROOT, rel);
    if (!existsSync(abs)) continue;
    const content = readFileSync(abs, 'utf-8');

    // Walk every `config` block that opens a bundleable flow. We scope the
    // platform assertion to the same config object so an absent platform on a
    // real bundle snippet is caught regardless of how many snippets a file holds.
    const configBlocks = content.split(/"config"\s*:\s*\{/);
    // First chunk is the preamble before any config block; skip it.
    for (let i = 1; i < configBlocks.length; i++) {
      // Only inspect the head of the block (the config object's own keys),
      // stopping at the nested `sources`/`destinations` so we don't read a
      // sibling flow's keys. The bundle + platform keys sit at the top.
      const head = configBlocks[i].split(
        /"(sources|destinations|collector)"/,
      )[0];
      if (hasBundle.test(head) && !hasPlatform.test(head)) {
        issues.push({
          file: rel,
          severity: 'error',
          message:
            'Bundled flow snippet missing config.platform (walkeros bundle would throw)',
        });
      }
    }
  }

  // Docker regression guard: getting-started quickstart docs must use BUNDLE,
  // not FLOW, for the flow artifact env var.
  const quickstartFiles = glob.sync(
    'website/docs/getting-started/quickstart/**/*.mdx',
    { cwd: ROOT, ignore: ['**/node_modules/**', '**/dist/**'], absolute: true },
  );
  for (const abs of quickstartFiles) {
    const content = readFileSync(abs, 'utf-8');
    if (/-e\s+FLOW=/.test(content) || /\bFLOW\s*:/.test(content)) {
      issues.push({
        file: relative(ROOT, abs),
        severity: 'error',
        message: 'Use BUNDLE, not FLOW, for the flow artifact env var',
      });
    }
  }
}

// Concatenate only the CODE regions of a docs file so drift tokens are matched
// against actual code, not the surrounding prose. Without this, a required token
// that happens to appear in explanatory text (or a different example) would keep
// a drift check green even after the featured snippet itself changed. Handles
// both the MDX `<CodeSnippet code={`...`}/>` form and standard ``` fenced blocks.
function extractCodeRegions(content: string): string {
  const regions: string[] = [];

  // <CodeSnippet ... code={`...`} ... />: capture the template-literal body.
  const snippetRe = /code=\{`([\s\S]*?)`\}/g;
  let m: RegExpExecArray | null;
  while ((m = snippetRe.exec(content)) !== null)
    regions.push(cookTemplateLiteral(m[1]));

  // ``` fenced code blocks (```lang ... ```).
  const fenceRe = /```[^\n]*\n([\s\S]*?)```/g;
  while ((m = fenceRe.exec(content)) !== null) regions.push(m[1]);

  return regions.join('\n');
}

// A `code={`...`}` body is a JS template literal, so the page renders it with
// its escapes applied: `\\` shows as `\`, `\`` as a backtick, `\$` as `$`.
// Check what the reader sees, not the source escapes, or an escaped quote in a
// JSON snippet reads as a broken string.
function cookTemplateLiteral(raw: string): string {
  return raw.replace(/\\([\\`$])/g, '$1');
}

// Per-block variant of extractCodeRegions. Where extractCodeRegions joins every
// code region into one string (fine for whole-page token pins), the relational
// checks below need each block in isolation with its starting line number: a
// flow.json block must be parsed on its own, and a `--simulate` finding wants
// the line it sits on. Matches the same two forms extractCodeRegions does
// (fenced ``` blocks and `<CodeSnippet code={`...`}/>` template literals) so the
// two stay consistent about what counts as code. `language` is the fence's
// info word or the CodeSnippet's `language` attribute.
export type CodeBlock = { code: string; line: number; language?: string };

export function extractCodeBlocks(content: string): CodeBlock[] {
  const blocks: CodeBlock[] = [];
  const lineOf = (index: number) => content.slice(0, index).split('\n').length;
  const fenceRe = /```([\w-]*)\n([\s\S]*?)```/g;
  let m: RegExpExecArray | null;
  while ((m = fenceRe.exec(content)) !== null) {
    blocks.push({
      code: m[2],
      line: lineOf(m.index),
      ...(m[1] ? { language: m[1] } : {}),
    });
  }
  const snippetRe = /code=\{`([\s\S]*?)`\}/g;
  while ((m = snippetRe.exec(content)) !== null) {
    const after = m.index + m[0].length;
    const start = content.lastIndexOf('<CodeSnippet', m.index);
    const head = start === -1 ? '/>' : content.slice(start, m.index);
    const end = content.indexOf('/>', after);
    const attributes =
      head.includes('/>') || end === -1
        ? ''
        : `${head}${content.slice(after, end)}`;
    const language = /\blanguage="([\w-]+)"/.exec(attributes)?.[1];
    blocks.push({
      code: cookTemplateLiteral(m[1]),
      line: lineOf(m.index),
      ...(language ? { language } : {}),
    });
  }
  return blocks;
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

// A `push --simulate <type>.<key>` command only works when the same page shows a
// flow.json that declares that step key. Two defect classes shipped and this
// gate turns them into CI failures: (1) a mode page showing `push --simulate`
// with no flow.json on the page at all (integrated-mode pages must not show it),
// and (2) a `--simulate destination.ga4` whose flow.json only declares, say,
// `console`. The check is page-local: it unions the step keys of every flow.json
// block on the page and asserts each simulate key resolves against them.
//
// Known limitation: keys are unioned across tabs on a page, so a per-tab
// mismatch that happens to match a key declared in a sibling tab would pass.
// Acceptable here: the getting-started restructure made each tab self-consistent
// (the web tab declares api+ga4, the server tab declares console), so the union
// never masks a real per-tab mismatch on the in-scope pages.
type SimulateFinding = { line: number; message: string };

export function findSimulateKeyIssues(content: string): SimulateFinding[] {
  const findings: SimulateFinding[] = [];
  const simulateRe = /--simulate\s+(source|destination|transformer)\.([\w-]+)/g;
  const declaredKeys = {
    source: new Set<string>(),
    destination: new Set<string>(),
    transformer: new Set<string>(),
  };
  let hasFlowJson = false;

  for (const block of extractCodeBlocks(content)) {
    const trimmed = block.code.trim();
    // Cheap pre-filters: only object-shaped blocks that name `flows` can be a
    // full flow config; everything else (bash, TS, fragments) is skipped.
    if (!trimmed.startsWith('{') || !trimmed.includes('"flows"')) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      // Fragments and intentionally partial JSON are skipped here; Task 3's
      // schema gate owns full-flow JSON validity.
      continue;
    }
    if (!isObject(parsed) || !isObject(parsed.flows)) continue;
    hasFlowJson = true;
    for (const flow of Object.values(parsed.flows)) {
      if (!isObject(flow)) continue;
      for (const [group, bucket] of [
        ['sources', 'source'],
        ['destinations', 'destination'],
        ['transformers', 'transformer'],
      ] as const) {
        const steps = flow[group];
        if (isObject(steps)) {
          for (const key of Object.keys(steps)) declaredKeys[bucket].add(key);
        }
      }
    }
  }

  let match: RegExpExecArray | null;
  while ((match = simulateRe.exec(content)) !== null) {
    const type = match[1];
    const key = match[2];
    // The regex only captures the three step types and a non-empty key; narrow
    // both explicitly so the object-literal access below stays precisely typed
    // (no cast) and `key` is a definite string.
    if (
      (type !== 'source' && type !== 'destination' && type !== 'transformer') ||
      key === undefined
    )
      continue;
    const line = content.slice(0, match.index).split('\n').length;
    if (!hasFlowJson) {
      findings.push({
        line,
        message: `--simulate ${type}.${key} but the page contains no flow.json snippet (integrated pages must not show push --simulate)`,
      });
    } else if (!declaredKeys[type].has(key)) {
      findings.push({
        line,
        message: `--simulate ${type}.${key} does not match any ${type} key declared in a flow.json on this page (declared: ${[...declaredKeys[type]].join(', ') || 'none'})`,
      });
    }
  }
  return findings;
}

// Wire findSimulateKeyIssues over the getting-started surface as an ERROR check.
// Scope decision (verified, do not widen): getting-started/**/*.mdx only. This
// automatically covers the examples/* recipe pages (whose run loops are
// additionally shape-checked by checkRecipeProof) and deploy.mdx; do not
// hand-list them. Known
// out-of-scope gap: guides/debugging.mdx uses `--simulate destination.gtag`
// with no same-page flow.json, which this check is deliberately not run against
// (guides are reference material, not the copy-paste onboarding path).
function checkSimulateKeyResolution(): void {
  const files = glob.sync('website/docs/getting-started/**/*.mdx', {
    cwd: ROOT,
    ignore: ['**/node_modules/**', '**/dist/**'],
    absolute: true,
  });
  for (const abs of files) {
    const content = readFileSync(abs, 'utf-8');
    for (const finding of findSimulateKeyIssues(content)) {
      issues.push({
        file: relative(ROOT, abs),
        line: finding.line,
        severity: 'error',
        message: finding.message,
      });
    }
  }
}

// Recipe pages are proof pages: exactly one flow.json, one run loop, and one
// expected-output block (the fixed shape from the writing-documentation SKILL,
// decided 2026-07-10). Without this gate a recipe can regress into a config
// dump whose payoff is asserted but never shown. Block classification reuses
// extractCodeBlocks: a full flow config is an object block naming "flows"; a
// run block is any block carrying `--simulate` (key resolution itself is owned
// by findSimulateKeyIssues); command blocks (npm/npx/walkeros/docker starters)
// are neutral; every remaining block counts as shown output.
type RecipeFinding = { message: string };

export function findRecipeProofIssues(content: string): RecipeFinding[] {
  const findings: RecipeFinding[] = [];
  let flowJsonCount = 0;
  let runCount = 0;
  let outputCount = 0;
  const commandStart = /^(npm|npx|walkeros|docker)\s/;
  for (const block of extractCodeBlocks(content)) {
    const trimmed = block.code.trim();
    if (trimmed.startsWith('{') && trimmed.includes('"flows"')) {
      flowJsonCount++;
    } else if (trimmed.includes('--simulate')) {
      runCount++;
    } else if (commandStart.test(trimmed)) {
      // Plain command blocks (install steps etc.) neither prove nor regress.
    } else {
      outputCount++;
    }
  }
  if (flowJsonCount !== 1) {
    findings.push({
      message: `recipe page must contain exactly one flow.json block (found ${flowJsonCount})`,
    });
  }
  if (runCount < 1) {
    findings.push({
      message:
        'recipe page must contain a run loop (walkeros push ... --simulate <type>.<key>)',
    });
  }
  if (outputCount < 1) {
    findings.push({
      message:
        'recipe page must show an expected-output block (the captured call or logged event), not just config',
    });
  }
  return findings;
}

function checkRecipeProof(): void {
  const files = glob.sync('website/docs/getting-started/examples/*.mdx', {
    cwd: ROOT,
    ignore: ['**/node_modules/**', '**/dist/**'],
    absolute: true,
  });
  for (const abs of files) {
    const content = readFileSync(abs, 'utf-8');
    for (const finding of findRecipeProofIssues(content)) {
      issues.push({
        file: relative(ROOT, abs),
        severity: 'error',
        message: finding.message,
      });
    }
  }
}

// A flow.json shown in the docs must be valid, fragments included, otherwise a
// copy-paste reader hits an error that never surfaced in review. Every block
// runs through core's own validators (schemas.validateFlowConfig, then
// validateFlowStructure once the schema holds, the order `walkeros validate`
// runs them in), so the gate cannot drift from the real contract. Only their
// ERRORS fail; reference WARNINGS (unknown $var, $env casing, ...) are
// advisory in illustrative snippets. Package settings are not checked here:
// that needs the package's published settings schema, which `walkeros
// validate` reads, so a snippet naming a package is counted as schema-level.
//
// What counts as a flow snippet, read from a JSON object block (braces added
// when the block starts at a key, the Bundled-tab shape):
// - a flow file, or a part of its root (`contract`, `variables`): checked as
//   a v4 file, with an empty `default` flow when it shows none;
// - a part of one flow (`destinations`, `sources`, `config` with a
//   `platform`, ...): checked inside a v4 flow skeleton on the platform the
//   fragment or the page names;
// - on a page whose frontmatter names a step package, that step under its
//   name, a part of the step (`config`, `next`, ...) or of its config
//   (`mapping`, `settings`, ...): checked as that package's step inside the
//   skeleton.
// A block declaring "version": 3 is an older-schema example (the "before"
// side of the migration guide) and is counted, not checked. Any other JSON is
// not a flow part and is counted as skipped. A `json` block that starts at a
// flow or root key but does not parse is a broken example and fails; any
// other `json` block that does not parse is counted as skipped.
type SchemaFinding = {
  line: number;
  path: string;
  message: string;
  fragment: boolean;
};

export type FlowSnippetReport = {
  findings: SchemaFinding[];
  /** Blocks run through core's validators. */
  checked: number;
  /** Of them, fragments checked inside the skeleton. */
  fragments: number;
  /** Of them, blocks naming a package whose settings were not checked. */
  schemaLevel: number;
  skippedVersion3: number;
  /** JSON blocks that are not a flow part, unparsed `json` blocks included. */
  skipped: number;
};

const STEPS = {
  source: {
    section: 'sources',
    kind: 'Source',
    config: schemas.SourceSchemas.ConfigSchema,
  },
  transformer: {
    section: 'transformers',
    kind: 'Transformer',
    config: schemas.TransformerSchemas.ConfigSchema,
  },
  destination: {
    section: 'destinations',
    kind: 'Destination',
    config: schemas.DestinationSchemas.ConfigSchema,
  },
  store: {
    section: 'stores',
    kind: 'Store',
    config: schemas.StoreSchemas.ConfigSchema,
  },
} as const satisfies Record<StepType, unknown>;

function isStepType(value: unknown): value is StepType {
  return (
    typeof value === 'string' &&
    Object.prototype.hasOwnProperty.call(STEPS, value)
  );
}

/** The platform a page's path names, and the step its frontmatter names. */
export type FlowSnippetPage = {
  platform?: 'web' | 'server';
  step?: { type: StepType; package: string };
};

/** A workspace package: its folder and its package.json `walkerOS.type`. */
type WorkspacePackage = { dir: string; type?: string };

function workspacePackages(): Map<string, WorkspacePackage> {
  const packages = new Map<string, WorkspacePackage>();
  for (const file of glob.sync('packages/**/package.json', {
    cwd: ROOT,
    ignore: ['**/node_modules/**', '**/dist/**', '**/__tests__/**'],
    absolute: true,
  })) {
    const pkg: unknown = JSON.parse(readFileSync(file, 'utf-8'));
    if (!isObject(pkg) || typeof pkg.name !== 'string') continue;
    const type = isObject(pkg.walkerOS) ? pkg.walkerOS.type : undefined;
    packages.set(pkg.name, {
      dir: dirname(file),
      ...(typeof type === 'string' ? { type } : {}),
    });
  }
  return packages;
}

export function flowSnippetPage(
  file: string,
  content: string,
  packages: Map<string, WorkspacePackage>,
): FlowSnippetPage {
  const platform = /\/(web|server)\//.exec(file)?.[1];
  const name = frontmatterPackage(content);
  const type = name ? packages.get(name)?.type : undefined;
  return {
    ...(platform === 'web' || platform === 'server' ? { platform } : {}),
    ...(name && isStepType(type) ? { step: { type, package: name } } : {}),
  };
}

const ROOT_KEYS = Object.keys(schemas.FlowJsonSchema.shape);
const FLOW_KEYS = Object.keys(schemas.FlowSchema.shape);

/** A parsed Flow.Json shape, for the structure checks after the schema held. */
function isFlowJson(value: unknown): value is Flow.Json {
  return isObject(value) && 'version' in value && isObject(value.flows);
}

/** A flow part inside a v4 skeleton, on the page's platform unless its own. */
function inFlow(
  flow: Record<string, unknown>,
  page: FlowSnippetPage,
): Record<string, unknown> {
  const own = isObject(flow.config) ? flow.config : undefined;
  const config =
    own || page.platform
      ? { ...(page.platform ? { platform: page.platform } : {}), ...own }
      : undefined;
  return {
    version: 4,
    flows: { default: config ? { ...flow, config } : flow },
  };
}

type Snippet =
  | { doc: Record<string, unknown>; fragment: boolean }
  | { skip: 'version3' | 'other' };

function flowSnippet(value: unknown, page: FlowSnippetPage): Snippet {
  if (!isObject(value) || Object.keys(value).length === 0)
    return { skip: 'other' };
  const keys = Object.keys(value);
  const within = (known: string[]) => keys.every((key) => known.includes(key));
  if (value.version === 3) return { skip: 'version3' };
  if (within(ROOT_KEYS))
    return {
      doc: { ...inFlow({}, page), ...value },
      fragment: value.version !== 4 || !('flows' in value),
    };
  // A `config` alone is a flow's when it names the platform, else a step's.
  const stepConfig =
    keys.length === 1 && isObject(value.config) && !value.config.platform;
  if (within(FLOW_KEYS) && !stepConfig)
    return { doc: inFlow(value, page), fragment: true };
  if (page.step) {
    const { section, kind, config } = STEPS[page.step.type];
    const [name] = keys;
    const entry = keys.length === 1 ? value[name] : undefined;
    if (isObject(entry) && entry.package === page.step.package)
      return { doc: inFlow({ [section]: value }, page), fragment: true };
    const step =
      getUnknownStepKeys(value, kind).length === 0
        ? value
        : within(Object.keys(config.shape))
          ? { config: value }
          : undefined;
    if (step)
      return {
        doc: inFlow(
          { [section]: { step: { package: page.step.package, ...step } } },
          page,
        ),
        fragment: true,
      };
  }
  return { skip: 'other' };
}

/** Whether a checked flow names a package, whose settings are not checked. */
function namesPackage(doc: Record<string, unknown>): boolean {
  if (!isObject(doc.flows)) return false;
  return Object.values(doc.flows).some(
    (flow) =>
      isObject(flow) &&
      Object.values(STEPS).some(({ section }) => {
        const steps = flow[section];
        return (
          isObject(steps) &&
          Object.values(steps).some(
            (step) => isObject(step) && typeof step.package === 'string',
          )
        );
      }),
  );
}

function flowIssues(doc: Record<string, unknown>): SchemaFinding[] {
  const result = schemas.validateFlowConfig(JSON.stringify(doc, null, 2));
  const issues = result.errors.map((e) => ({
    path: e.path ?? 'root',
    message: e.message,
  }));
  if (issues.length === 0 && isFlowJson(doc))
    for (const e of validateFlowStructure(doc).errors)
      issues.push({ path: e.path, message: e.message });
  return issues.map((issue) => ({ ...issue, line: 0, fragment: false }));
}

export function findFlowJsonSchemaIssues(
  content: string,
  page: FlowSnippetPage = {},
): FlowSnippetReport {
  const report: FlowSnippetReport = {
    findings: [],
    checked: 0,
    fragments: 0,
    schemaLevel: 0,
    skippedVersion3: 0,
    skipped: 0,
  };
  for (const block of extractCodeBlocks(content)) {
    const trimmed = block.code.trim();
    const braced = trimmed.startsWith('"') ? `{${trimmed}}` : trimmed;
    if (!braced.startsWith('{')) continue;

    let parsed: unknown;
    try {
      parsed = JSON.parse(braced);
    } catch {
      // Broken JSON in a block that reads as a full v4 config, or a json
      // block that starts at a flow or root key: run it through the
      // canonical validator so the message locates the syntax error.
      const first = /^\{\s*"([^"]+)"\s*:/.exec(braced)?.[1] ?? '';
      const fullConfig =
        /"version"\s*:\s*4\b/.test(trimmed) && trimmed.includes('"flows"');
      const flowPart =
        block.language === 'json' &&
        (FLOW_KEYS.includes(first) || ROOT_KEYS.includes(first));
      if (!fullConfig && !flowPart) {
        if (block.language === 'json') report.skipped++;
        continue;
      }
      report.checked++;
      if (!fullConfig) report.fragments++;
      for (const e of schemas.validateFlowConfig(braced).errors)
        report.findings.push({
          line: block.line,
          path: e.path ?? 'root',
          message: e.message,
          fragment: !fullConfig,
        });
      continue;
    }

    const snippet = flowSnippet(parsed, page);
    if ('skip' in snippet) {
      if (snippet.skip === 'version3') report.skippedVersion3++;
      else report.skipped++;
      continue;
    }
    report.checked++;
    if (snippet.fragment) report.fragments++;
    if (namesPackage(snippet.doc)) report.schemaLevel++;
    for (const issue of flowIssues(snippet.doc))
      report.findings.push({
        ...issue,
        line: block.line,
        fragment: snippet.fragment,
      });
  }
  return report;
}

// Schema validity is universal (unlike the page-local coherence checks), so
// this runs over the whole docs tree.
function checkFlowJsonSnippets(
  packages: Map<string, WorkspacePackage>,
): FlowSnippetReport {
  const total: FlowSnippetReport = {
    findings: [],
    checked: 0,
    fragments: 0,
    schemaLevel: 0,
    skippedVersion3: 0,
    skipped: 0,
  };
  const files = glob.sync('website/docs/**/*.mdx', {
    cwd: ROOT,
    ignore: ['**/node_modules/**', '**/dist/**'],
    absolute: true,
  });
  for (const abs of files) {
    const content = readFileSync(abs, 'utf-8');
    const file = relative(ROOT, abs);
    const report = findFlowJsonSchemaIssues(
      content,
      flowSnippetPage(file, content, packages),
    );
    total.checked += report.checked;
    total.fragments += report.fragments;
    total.schemaLevel += report.schemaLevel;
    total.skippedVersion3 += report.skippedVersion3;
    total.skipped += report.skipped;
    for (const finding of report.findings) {
      issues.push({
        file,
        line: finding.line,
        severity: 'error',
        message: finding.fragment
          ? `flow.json fragment invalid, checked inside a v4 flow (${finding.path}): ${finding.message}`
          : `flow.json snippet invalid (${finding.path}): ${finding.message}`,
      });
    }
  }
  return total;
}

// The getting-started surface (plus the MCP app page) is the open/free
// onboarding path; walkerOS's own sales register (upgrade prompts, monthly
// prices, tier names) does not belong there.
//
// Scope rationale: this is deliberately NOT run over all of docs/**. The live
// tree has legitimate THIRD-PARTY cost mentions that would false-positive (a
// "$2/month" Bunny anycast IP in guides/deploy-bunny-magic-containers.mdx, a
// BigQuery "free tier" note on destinations/server/gcp.mdx). "No price strings
// anywhere in docs" is not achievable; walkerOS's own sales register on the
// onboarding surface is the actual risk, so the scan is scoped to that surface.
const BOUNDARY_FORBIDDEN: { pattern: RegExp; reason: string }[] = [
  {
    pattern: /\b(upgrade to|start (your )?free trial|book a demo)\b/i,
    reason: 'sales register',
  },
  {
    pattern: /(€|\$)\s?\d+\s?(\/|per\s)?(mo|month|year|yr)\b/i,
    reason: 'price string',
  },
  {
    pattern: /\b(free|plus|pro|enterprise) (plan|tier)\b/i,
    reason: 'tier name',
  },
];

type BoundaryFinding = { line?: number; message: string };

export function findBoundaryRegisterIssues(content: string): BoundaryFinding[] {
  const findings: BoundaryFinding[] = [];
  content.split('\n').forEach((line, index) => {
    for (const { pattern, reason } of BOUNDARY_FORBIDDEN) {
      if (pattern.test(line)) {
        findings.push({
          line: index + 1,
          message: `boundary: ${reason} not allowed on the getting-started/onboarding surface ("${line.trim().slice(0, 60)}")`,
        });
      }
    }
  });
  return findings;
}

// There is no walkerOS Cloud. The `:::cloud` callout type was removed, so any
// leftover use would render as a raw paragraph; flag it on every docs page.
export function findCloudCalloutIssues(content: string): BoundaryFinding[] {
  return /:::cloud\b/.test(content)
    ? [
        {
          message:
            '`:::cloud` callout is not allowed: there is no walkerOS Cloud',
        },
      ]
    : [];
}

// Events are taught in one form: `elb` takes a partial event,
// `elb({ name: 'entity action', data })`. A quoted "entity action" string as the
// first argument is the string form; `walker` commands keep their string name.
// The match spans line breaks so a call split over lines is found too.
export function findElbStringEventIssues(content: string): BoundaryFinding[] {
  const findings: BoundaryFinding[] = [];
  const re = /\belb\(\s*(['"`])(?!walker )([^'"`\n]+ [^'"`\n]*)\1/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    findings.push({
      line: content.slice(0, m.index).split('\n').length,
      message: `elb event "${m[2]}" uses the string form: pass a partial event, elb({ name: '${m[2]}', data })`,
    });
  }
  return findings;
}

function checkElbEventForm(file: string, content: string): void {
  // Migration guides may quote the form a version transition replaced.
  if (/website\/docs\/migrat(e|ing)\//.test(file)) return;
  for (const f of findElbStringEventIssues(content)) {
    issues.push({
      file: relative(ROOT, file),
      line: f.line,
      severity: 'error',
      message: f.message,
    });
  }
}

function checkBoundaryRegister(): void {
  const scopeGlobs = [
    'website/docs/getting-started/**/*.mdx',
    'website/docs/apps/mcp.mdx',
  ];
  const scopeFiles = new Set<string>();
  for (const pattern of scopeGlobs) {
    for (const abs of glob.sync(pattern, {
      cwd: ROOT,
      ignore: ['**/node_modules/**', '**/dist/**'],
      absolute: true,
    })) {
      scopeFiles.add(abs);
    }
  }
  for (const abs of scopeFiles) {
    const content = readFileSync(abs, 'utf-8');
    for (const f of findBoundaryRegisterIssues(content)) {
      issues.push({
        file: relative(ROOT, abs),
        line: f.line,
        severity: 'error',
        message: f.message,
      });
    }
  }

  for (const abs of glob.sync('website/docs/**/*.{md,mdx}', {
    cwd: ROOT,
    ignore: ['**/node_modules/**'],
    absolute: true,
  })) {
    for (const f of findCloudCalloutIssues(readFileSync(abs, 'utf-8'))) {
      issues.push({
        file: relative(ROOT, abs),
        severity: 'error',
        message: f.message,
      });
    }
  }
}

// The learner-facing first-event snippets in the docs are deliberately simpler
// than the tested Tier-1 source (apps/quickstart/src/first-event.ts): they use
// an arrow `push`, drop the `seen` array, and skip types and the function
// wrapper. A byte comparison would always flag those intentional differences,
// so instead we derive a few CANONICAL TOKENS from the source and assert each
// docs snippet still contains them (whitespace-normalized). When the source's
// event name or console.log message changes, the extracted token changes too,
// so a stale docs snippet fails the check.
function checkFirstEventSnippet(): void {
  const sourceRel = 'apps/quickstart/src/first-event.ts';
  const sourceAbs = join(ROOT, sourceRel);
  if (!existsSync(sourceAbs)) {
    issues.push({
      file: sourceRel,
      severity: 'error',
      message: 'first-event source missing (expected Tier-1 doc-lint source)',
    });
    return;
  }

  const source = readFileSync(sourceAbs, 'utf-8');

  // Collapse runs of whitespace so single-line and multi-line formatting, and
  // single vs double quotes, compare equally.
  const normalize = (s: string): string =>
    s.replace(/["']/g, "'").replace(/\s+/g, ' ').trim();

  // Extract the event name from `elb({ name: 'page view', ... })` in the source.
  const eventMatch = source.match(/elb\(\s*\{\s*name:\s*['"]([^'"]+)['"]/);
  // Extract the console.log message literal from `console.log('Event:', ...)`.
  const logMatch = source.match(/console\.log\(\s*['"]([^'"]+)['"]/);

  if (!eventMatch || !logMatch) {
    issues.push({
      file: sourceRel,
      severity: 'error',
      message:
        'could not extract first-event tokens (event name / console.log message) from source',
    });
    return;
  }

  const eventName = eventMatch[1]; // e.g. "page view"
  const logMessage = logMatch[1]; // e.g. "Event:"

  // Tokens every docs snippet must contain (normalized form).
  const requiredTokens = [
    normalize("type: 'console'"),
    normalize(`console.log('${logMessage}', event.name)`),
    normalize(`elb({ name: '${eventName}'`),
  ];

  const docFiles = [
    'website/docs/getting-started/quickstart/index.mdx',
    'README.md',
    'website/docs/getting-started/modes/integrated.mdx',
    'website/docs/getting-started/ga4-ecommerce.mdx',
  ];

  for (const rel of docFiles) {
    const abs = join(ROOT, rel);
    if (!existsSync(abs)) {
      issues.push({
        file: rel,
        severity: 'error',
        message: `first-event docs snippet drifted from ${sourceRel}`,
      });
      continue;
    }
    const normalizedDoc = normalize(
      extractCodeRegions(readFileSync(abs, 'utf-8')),
    );
    const missing = requiredTokens.some(
      (token) => !normalizedDoc.includes(token),
    );
    if (missing) {
      issues.push({
        file: rel,
        severity: 'error',
        message: `first-event docs snippet drifted from ${sourceRel}`,
      });
    }
  }

  // react.mdx shows the console-destination SHAPE (type + push→console.log) but
  // never pushes a `page view` (its elb calls are `walker run` and `checkout
  // complete`), so the full three-token pin would misfire and mislead an editor
  // into injecting a bogus event. Pin only the two shape tokens there.
  const shapeTokens = requiredTokens.slice(0, 2);
  const docFilesShapeOnly = [
    'website/docs/getting-started/quickstart/react.mdx',
  ];
  for (const rel of docFilesShapeOnly) {
    const abs = join(ROOT, rel);
    if (!existsSync(abs)) {
      issues.push({
        file: rel,
        severity: 'error',
        message: `first-event console-shape snippet drifted from ${sourceRel}`,
      });
      continue;
    }
    const normalizedDoc = normalize(
      extractCodeRegions(readFileSync(abs, 'utf-8')),
    );
    const missing = shapeTokens.some((token) => !normalizedDoc.includes(token));
    if (missing) {
      issues.push({
        file: rel,
        severity: 'error',
        message: `first-event console-shape snippet drifted from ${sourceRel}`,
      });
    }
  }
}

// The only offline "see your event" loop is `walkeros push <flow> --simulate
// <step>`. There is no `walkeros serve` and no standalone `walkeros simulate`
// verb. A getting-started page that names either would send a copy-paste reader
// to a command that does not exist, so flag them. We match only the verb
// position right after `walkeros`, which leaves the valid forms untouched:
// `push --simulate`, a bare `--simulate`, and the MCP tool `flow_simulate` all
// lack a `walkeros simulate` verb sequence.
function checkForbiddenCliVerbs(): void {
  // Widened from a hand-listed page set to the whole onboarding + guides
  // surface plus the GA4 gtag page: those are the pages a copy-paste reader is
  // likely to run CLI commands from. The globs overlap only trivially (the
  // ga4.mdx entry sits outside getting-started/guides), so dedupe via a Set.
  const targetGlobs = [
    'website/docs/getting-started/**/*.mdx',
    'website/docs/guides/**/*.mdx',
    'website/docs/destinations/web/gtag/ga4.mdx',
  ];
  const targetFiles = new Set<string>();
  for (const pattern of targetGlobs) {
    for (const abs of glob.sync(pattern, {
      cwd: ROOT,
      ignore: ['**/node_modules/**', '**/dist/**'],
      absolute: true,
    })) {
      targetFiles.add(abs);
    }
  }

  const forbidden: Array<{ pattern: RegExp; verb: string }> = [
    { pattern: /\bwalkeros\s+serve\b/, verb: 'serve' },
    { pattern: /\bwalkeros\s+simulate\b/, verb: 'simulate' },
  ];

  const scan = (abs: string): void => {
    if (!existsSync(abs)) return;
    const lines = readFileSync(abs, 'utf-8').split('\n');
    lines.forEach((line, index) => {
      for (const { pattern, verb } of forbidden) {
        if (pattern.test(line)) {
          issues.push({
            file: relative(ROOT, abs),
            line: index + 1,
            severity: 'error',
            message: `Invalid CLI verb "walkeros ${verb}" (use "walkeros push --simulate")`,
          });
        }
      }
    });
  };

  for (const abs of targetFiles) scan(abs);
}

// The GA4 ecommerce mapping is shown verbatim in two docs pages, but the Tier-1
// source (apps/quickstart/src/ga4-ecommerce.ts) is the verified version. We pin
// the key mapping strings here: derive the mapped event name from the source's
// `name:` field, assert the four canonical tokens still live in the source
// (defensive), then require each token (whitespace/quote-normalized) in both
// docs pages so a stale snippet fails the check.
function checkGa4MappingSnippet(): void {
  const sourceRel = 'apps/quickstart/src/ga4-ecommerce.ts';
  const sourceAbs = join(ROOT, sourceRel);
  if (!existsSync(sourceAbs)) {
    issues.push({
      file: sourceRel,
      severity: 'error',
      message: 'ga4-ecommerce source missing (expected Tier-1 doc-lint source)',
    });
    return;
  }

  const source = readFileSync(sourceAbs, 'utf-8');

  // Collapse runs of whitespace and unify quotes so single-line and multi-line
  // formatting compare equally.
  const normalize = (s: string): string =>
    s.replace(/["']/g, "'").replace(/\s+/g, ' ').trim();

  // Extract the mapped event name from `name: 'add_to_cart'` in the source so a
  // change to the mapping target busts the required token.
  const nameMatch = source.match(/name:\s*['"]([^'"]+)['"]/);
  if (!nameMatch) {
    issues.push({
      file: sourceRel,
      severity: 'error',
      message: 'could not extract GA4 mapped event name from source',
    });
    return;
  }
  const eventName = nameMatch[1]; // e.g. "add_to_cart"

  // Extract the product id from the source's push input
  // (`elb({ name: 'product add', data: { id: 'ers', ... } })`) so the pinned
  // push snippet stays derived from the verified source rather than hardcoded.
  const idMatch = source.match(
    /elb\(\s*\{\s*name:\s*['"]product add['"]\s*,\s*data:\s*\{\s*id:\s*['"]([^'"]+)['"]/,
  );
  if (!idMatch) {
    issues.push({
      file: sourceRel,
      severity: 'error',
      message: 'could not extract GA4 push product id from source',
    });
    return;
  }
  const productId = idMatch[1]; // e.g. "ers"

  // Tokens every docs snippet must contain (normalized form). The event-name and
  // product-id tokens are derived; the item/value field mappings are pinned
  // literals. These all live in the source too, so they double as the defensive
  // source check below.
  const requiredTokens = [
    normalize(`name: '${eventName}'`),
    normalize("item_id: 'data.id'"),
    normalize("item_name: 'data.name'"),
    normalize("value: 'data.price'"),
    normalize(`elb({ name: 'product add', data: { id: '${productId}'`),
  ];

  // Defensive: the source itself must carry every required token, otherwise the
  // extraction or the pinned literals have drifted from the verified mapping.
  const normalizedSource = normalize(source);
  const missingInSource = requiredTokens.filter(
    (token) => !normalizedSource.includes(token),
  );
  if (missingInSource.length > 0) {
    issues.push({
      file: sourceRel,
      severity: 'error',
      message:
        'GA4 mapping tokens not found in source (pinned literals drifted from the verified mapping)',
    });
    return;
  }

  // Docs-only token: the result block renders the mapped output event as
  // `gtag('event', '<name>', ...)`. The source produces this call at runtime via
  // the gtag destination; the only textual occurrence in the source is a JSDoc
  // comment, which is not a reliable verification anchor. So this token is pinned
  // in the docs pages only, with the name still derived from the source's
  // mapping `name:` field.
  const docsRequiredTokens = [
    ...requiredTokens,
    normalize(`gtag('event', '${eventName}'`),
  ];

  const docFiles = [
    'website/docs/destinations/web/gtag/ga4.mdx',
    'website/docs/getting-started/ga4-ecommerce.mdx',
  ];

  for (const rel of docFiles) {
    const abs = join(ROOT, rel);
    if (!existsSync(abs)) {
      issues.push({
        file: rel,
        severity: 'error',
        message: `GA4 mapping docs snippet drifted from ${sourceRel}`,
      });
      continue;
    }
    const normalizedDoc = normalize(
      extractCodeRegions(readFileSync(abs, 'utf-8')),
    );
    const missing = docsRequiredTokens.some(
      (token) => !normalizedDoc.includes(token),
    );
    if (missing) {
      issues.push({
        file: rel,
        severity: 'error',
        message: `GA4 mapping docs snippet drifted from ${sourceRel}`,
      });
    }
  }
}

// Docs as code: pages render parts of packages/cli/examples/flow-complete.json
// by manifest feature id (`<FlowSlice feature="..." />`,
// `<FlowExample feature="..." />`), so a snippet cannot drift from the tested
// file. The gate runs both ways: every rendered id exists in the manifest (and
// resolves), and every page a manifest feature lists under `docs` exists and
// renders that feature. A switched page keeps no hand-written v4 flow.json.
const FLOW_COMPLETE_FILE = 'packages/cli/examples/flow-complete.json';
const FLOW_COMPLETE_GUIDE = 'packages/cli/examples/flow-complete.md';
const DOCS_DIR = 'website/docs';

export const SWITCHED_PAGES = [
  'getting-started/flow/index',
  'getting-started/flow/routing',
  'getting-started/flow/contract',
  'transformers/validate',
  'collector/state',
  'collector/cache',
  'guides/reference-syntax',
];

type FeatureRender = {
  component: string;
  feature: string | undefined;
  /** Raw `depth` value: `{2}` or `"2"`, undefined when absent. */
  depth: string | undefined;
  /** Every attribute name on the tag. */
  attributes: string[];
  line: number;
};

// MDX renders JSX only outside code: a tag shown in a fence, a CodeSnippet
// template literal or inline code is text (the flow-snippets remark plugin
// only visits JSX nodes). Blank those regions, keeping newlines so line
// numbers still match the source.
export function blankCode(content: string): string {
  const blank = (region: string): string => region.replace(/[^\n]/g, ' ');
  return content
    .replace(/^[ \t]*(```|~~~)[^\n]*\n[\s\S]*?^[ \t]*\1[^\n]*$/gm, blank)
    .replace(/code=\{`[\s\S]*?`\}/g, blank)
    .replace(/`[^`\n]+`/g, blank);
}

export function findFeatureRenders(content: string): FeatureRender[] {
  const renders: FeatureRender[] = [];
  const tagRe = /<(FlowSlice|FlowExample)\b([^>]*)>/g;
  const source = blankCode(content);
  let m: RegExpExecArray | null;
  while ((m = tagRe.exec(source)) !== null) {
    const attrs = m[2].replace(/\/\s*$/, '');
    renders.push({
      component: m[1],
      feature: /\bfeature="([^"]+)"/.exec(attrs)?.[1],
      depth: /\bdepth=(\{[^}]*\}|"[^"]*")/.exec(attrs)?.[1],
      // Each match consumes its value, so names inside values never count.
      attributes: [
        ...attrs.matchAll(
          /([A-Za-z_][\w-]*)(?:\s*=\s*("[^"]*"|'[^']*'|\{[^}]*\}))?/g,
        ),
      ].map((a) => a[1]),
      line: content.slice(0, m.index).split('\n').length,
    });
  }
  return renders;
}

// A full config (top-level "version": 4 plus "flows") written by hand. Partial
// fragments stay allowed: they illustrate a single key.
export function findHandWrittenFlowSnippets(content: string): number[] {
  return extractCodeBlocks(content)
    .filter(({ code }) => {
      const trimmed = code.trim();
      return (
        trimmed.startsWith('{') &&
        /"version"\s*:\s*4\b/.test(trimmed) &&
        trimmed.includes('"flows"')
      );
    })
    .map(({ line }) => line);
}

/** The `## Installation` section of a page: its heading line and last line. */
function installationSection(
  content: string,
): { heading: number; last: number } | undefined {
  const lines = blankCode(content).split('\n');
  const heading = lines.findIndex((line) => /^##\s+Installation\b/.test(line));
  if (heading === -1) return undefined;
  const next = lines.findIndex(
    (line, index) => index > heading && /^##\s/.test(line),
  );
  return { heading: heading + 1, last: next === -1 ? lines.length : next };
}

// A step page renders its install line, integrated code and flow under
// `## Installation` from the package's tested minimal example
// (<Quickstart data={data} />). Once the package has one, a hand-written copy
// there drifts from the tested one: an install snippet, a `startFlow` snippet
// or a Bundled tab. Feature examples under other headings stay hand-written.
export function findHandWrittenQuickstart(
  content: string,
  hasMinimal: boolean,
): number[] {
  const section = installationSection(content);
  if (!hasMinimal || !section) return [];
  const inSection = (line: number) =>
    line > section.heading && line <= section.last;
  const lines = extractCodeBlocks(content)
    .filter(
      ({ code }) =>
        /^\s*npm (?:install|i)\s/.test(code) || code.includes('startFlow('),
    )
    .map(({ line }) => line);
  blankCode(content)
    .split('\n')
    .forEach((line, index) => {
      if (/<TabItem\b[^>]*\bvalue="bundled"/.test(line)) lines.push(index + 1);
    });
  return [...new Set(lines.filter(inSection))].sort((a, b) => a - b);
}

// A page whose package has a minimal example renders it under
// `## Installation`: the heading's line when the section renders no
// <Quickstart>, line 1 when the page has no Installation section.
export function findMissingQuickstart(
  content: string,
  hasMinimal: boolean,
): number[] {
  if (!hasMinimal) return [];
  const section = installationSection(content);
  if (!section) return [1];
  const rendered = blankCode(content)
    .split('\n')
    .slice(section.heading, section.last)
    .some((line) => /<Quickstart\b/.test(line));
  return rendered ? [] : [section.heading];
}

/** The `package:` of a page's frontmatter. */
function frontmatterPackage(content: string): string | undefined {
  const block = /^---\n([\s\S]*?)\n---/.exec(content)?.[1];
  return block
    ? /^package:\s*['"]?([^'"\s]+)['"]?\s*$/m.exec(block)?.[1]
    : undefined;
}

// The frontmatter `package:` and the walkerOS.json a page imports name the
// same package, so a block rendered from that data shows the page's package.
export function findPackageMismatch(content: string): number[] {
  const name = frontmatterPackage(content);
  if (!name) return [];
  const lines: number[] = [];
  blankCode(content)
    .split('\n')
    .forEach((line, index) => {
      const imported =
        /^\s*import\b.*\bfrom\s+['"](.+)\/walkerOS\.json['"]/.exec(line)?.[1];
      if (imported && imported !== name) lines.push(index + 1);
    });
  return lines;
}

// A package has a minimal example when its examples hold one in
// `examples/minimal.ts` (per export: `src/<export>/examples/minimal.ts`).
// Read from the workspace sources, so the check needs no build.
function checkQuickstartPages(packages: Map<string, WorkspacePackage>): void {
  for (const abs of glob.sync(`${DOCS_DIR}/**/*.mdx`, {
    cwd: ROOT,
    ignore: ['**/node_modules/**'],
    absolute: true,
  })) {
    const content = readFileSync(abs, 'utf-8');
    const file = relative(ROOT, abs);
    for (const line of findPackageMismatch(content))
      issues.push({
        file,
        line,
        severity: 'error',
        message: `the imported walkerOS.json is not the frontmatter package ${frontmatterPackage(content)}, so rendered blocks would show another package`,
      });
    const name = frontmatterPackage(content);
    const dir = name ? packages.get(name)?.dir : undefined;
    const hasMinimal =
      dir !== undefined &&
      glob.sync(`src/**/${MINIMAL_EXAMPLE_FILE}`, { cwd: dir }).length > 0;
    for (const line of findHandWrittenQuickstart(content, hasMinimal))
      issues.push({
        file,
        line,
        severity: 'error',
        message:
          'a hand-written setup snippet drifts from the tested minimal example: render <Quickstart data={data} /> under ## Installation instead',
      });
    for (const line of findMissingQuickstart(content, hasMinimal))
      issues.push({
        file,
        line,
        severity: 'error',
        message:
          'the package has a tested minimal example, but ## Installation does not render it: add <Quickstart data={data} />',
      });
  }
}

// FlowSlice and FlowExample are not components: the remark plugin
// website/src/remark/flow-snippets.ts resolves them at build time, so a page
// never imports them.
export function findFlowComponentImports(content: string): number[] {
  const lines: number[] = [];
  blankCode(content)
    .split('\n')
    .forEach((line, index) => {
      if (/^\s*import\b.*\b(FlowSlice|FlowExample)\b/.test(line))
        lines.push(index + 1);
    });
  return lines;
}

type DocsFinding = { file: string; line?: number; message: string };

export function findFeatureDriftIssues(
  pages: Map<string, string>,
  file: unknown,
  guide: string,
): DocsFinding[] {
  const findings: DocsFinding[] = [];
  const pageFile = (page: string): string => `${DOCS_DIR}/${page}.mdx`;
  const rendered = new Map<string, Set<string>>();

  for (const [page, content] of pages) {
    const ids = new Set<string>();
    rendered.set(page, ids);
    for (const line of findFlowComponentImports(content)) {
      findings.push({
        file: pageFile(page),
        line,
        message:
          'FlowSlice and FlowExample are resolved at build time by website/src/remark/flow-snippets.ts; remove the import',
      });
    }
    for (const render of findFeatureRenders(content)) {
      const at = { file: pageFile(page), line: render.line };
      if (!render.feature) {
        findings.push({
          ...at,
          message: `<${render.component}> needs a double-quoted literal feature="<id>"`,
        });
        continue;
      }
      const allowed =
        render.component === 'FlowSlice' ? ['feature', 'depth'] : ['feature'];
      render.attributes.forEach((name, index) => {
        if (!allowed.includes(name))
          findings.push({
            ...at,
            message: `<${render.component}>: unknown attribute "${name}"`,
          });
        else if (render.attributes.indexOf(name) !== index)
          findings.push({
            ...at,
            message: `<${render.component}>: duplicate attribute "${name}"`,
          });
      });
      if (render.depth !== undefined && !/^\{\s*\d+\s*\}$/.test(render.depth))
        findings.push({
          ...at,
          message: `<${render.component}>: depth must be a non-negative integer literal, depth={1}`,
        });
      const entry = flowCompleteFeatures.find((f) => f.id === render.feature);
      if (!entry) {
        findings.push({
          ...at,
          message: `<${render.component} feature="${render.feature}"> is not a flow-complete manifest feature`,
        });
        continue;
      }
      if (resolvePointer(file, entry.pointer) === undefined) {
        findings.push({
          ...at,
          message: `feature "${entry.id}" points at ${entry.pointer}, which does not resolve in ${FLOW_COMPLETE_FILE}`,
        });
      }
      if (render.component === 'FlowExample') {
        if (!entry.example) {
          findings.push({
            ...at,
            message: `<FlowExample feature="${entry.id}">: the feature names no example`,
          });
        } else if (!findStepExample(file, entry.pointer, entry.example)) {
          findings.push({
            ...at,
            message: `<FlowExample feature="${entry.id}">: example ${entry.example.step}.${entry.example.name} not found`,
          });
        }
      }
      ids.add(entry.id);
    }
  }

  for (const entry of flowCompleteFeatures) {
    for (const { page } of entry.docs) {
      const ids = rendered.get(page);
      if (!ids) {
        findings.push({
          file: pageFile(page),
          message: `manifest feature "${entry.id}" lists docs page ${page}, which does not exist`,
        });
      } else if (!ids.has(entry.id)) {
        findings.push({
          file: pageFile(page),
          message: `manifest feature "${entry.id}" lists this page, but the page does not render it (<FlowSlice feature="${entry.id}" />)`,
        });
      }
    }
  }

  for (const page of SWITCHED_PAGES) {
    const content = pages.get(page);
    if (content === undefined) {
      findings.push({
        file: pageFile(page),
        message: 'switched page missing',
      });
      continue;
    }
    for (const line of findHandWrittenFlowSnippets(content)) {
      findings.push({
        file: pageFile(page),
        line,
        message:
          'hand-written v4 flow.json on a switched page: render the flow-complete feature with <FlowSlice> instead',
      });
    }
  }

  const headings = new Set(
    guide.split('\n').filter((line) => line.startsWith('## ')),
  );
  for (const chapter of Object.keys(GUIDE_CHAPTERS)) {
    if (!isChapterId(chapter)) continue;
    if (!headings.has(`## ${guideHeading(chapter)}`)) {
      findings.push({
        file: 'website/src/components/snippets/flow-complete.ts',
        message: `guide link for chapter "${chapter}" has no heading "## ${guideHeading(chapter)}" in ${FLOW_COMPLETE_GUIDE}`,
      });
    }
  }

  return findings;
}

function isChapterId(value: string): value is keyof typeof GUIDE_CHAPTERS {
  return Object.prototype.hasOwnProperty.call(GUIDE_CHAPTERS, value);
}

function checkFlowCompleteDocs(): void {
  const pages = new Map<string, string>();
  for (const abs of glob.sync(`${DOCS_DIR}/**/*.mdx`, {
    cwd: ROOT,
    ignore: ['**/node_modules/**'],
    absolute: true,
  })) {
    const page = relative(join(ROOT, DOCS_DIR), abs).replace(/\.mdx$/, '');
    pages.set(page, readFileSync(abs, 'utf-8'));
  }
  const file: unknown = JSON.parse(
    readFileSync(join(ROOT, FLOW_COMPLETE_FILE), 'utf-8'),
  );
  const guide = readFileSync(join(ROOT, FLOW_COMPLETE_GUIDE), 'utf-8');
  for (const finding of findFeatureDriftIssues(pages, file, guide)) {
    issues.push({ ...finding, severity: 'error' });
  }
}

async function main() {
  console.log('📋 Validating documentation standards...\n');

  const patterns = [
    'packages/**/README.md',
    'website/docs/**/*.mdx',
    'skills/**/*.md',
  ];

  const files = await glob(patterns, {
    cwd: ROOT,
    ignore: ['**/node_modules/**', '**/dist/**'],
    absolute: true,
  });

  for (const file of files) {
    const content = readFileSync(file, 'utf-8');
    checkLegacyPatterns(file, content);
    checkDomainRefs(file, content);
    checkReadmeStructure(file, content);
    checkElbEventForm(file, content);
  }
  // The elb event form also binds the root and app READMEs, which the
  // package-README structure checks above do not cover.
  const readmes = await glob(['README.md', 'apps/**/README.md'], {
    cwd: ROOT,
    ignore: ['**/node_modules/**', '**/dist/**'],
    absolute: true,
  });
  for (const file of readmes)
    checkElbEventForm(file, readFileSync(file, 'utf-8'));

  checkBundledSnippets();
  checkFirstEventSnippet();
  checkForbiddenCliVerbs();
  checkGa4MappingSnippet();
  checkSimulateKeyResolution();
  checkRecipeProof();
  const packages = workspacePackages();
  const snippets = checkFlowJsonSnippets(packages);
  checkBoundaryRegister();
  checkFlowCompleteDocs();
  checkQuickstartPages(packages);

  console.log(
    `Flow snippets: ${snippets.checked} checked (${snippets.fragments} fragments inside a v4 flow), ${snippets.schemaLevel} schema-level only (package settings are checked by walkeros validate, not here), ${snippets.skippedVersion3} version 3 skipped, ${snippets.skipped} JSON blocks that are not a flow part skipped\n`,
  );

  const errors = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warning');

  if (issues.length === 0) {
    console.log('✅ All documentation passes quality checks!\n');
    process.exit(0);
  }

  if (errors.length > 0) {
    console.log(`❌ Found ${errors.length} errors:\n`);
    for (const issue of errors) {
      console.log(`  ${issue.file}${issue.line ? `:${issue.line}` : ''}`);
      console.log(`    ${issue.message}\n`);
    }
  }

  if (warnings.length > 0) {
    console.log(`⚠️  Found ${warnings.length} warnings:\n`);
    for (const issue of warnings) {
      console.log(`  ${issue.file}${issue.line ? `:${issue.line}` : ''}`);
      console.log(`    ${issue.message}\n`);
    }
  }

  // Exit with error only for errors, not warnings
  process.exit(errors.length > 0 ? 1 : 0);
}

// Only run when invoked directly, so the red-test scratch runner (and any
// future harness) can import the exported check helpers without triggering
// main()'s process.exit(). tsx transpiles this module to CommonJS, so
// `require.main` identifies the entry point.
if (require.main === module) {
  main().catch(console.error);
}
