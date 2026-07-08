#!/usr/bin/env npx tsx
/**
 * Validates documentation quality standards
 * Usage: npx tsx scripts/validate-docs.ts
 */

import { existsSync, readFileSync } from 'fs';
import { glob } from 'glob';
import { join, relative } from 'path';
import { schemas } from '@walkeros/core/dev';

interface Issue {
  file: string;
  line?: number;
  severity: 'error' | 'warning';
  message: string;
}

const ROOT = process.cwd();
const issues: Issue[] = [];

// Check for legacy API patterns
function checkLegacyPatterns(file: string, content: string): void {
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

// Check README structure
function checkReadmeStructure(file: string, content: string): void {
  if (!file.endsWith('README.md')) return;

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

  // <CodeSnippet ... code={`...`} ... /> — capture the template-literal body.
  const snippetRe = /code=\{`([\s\S]*?)`\}/g;
  let m: RegExpExecArray | null;
  while ((m = snippetRe.exec(content)) !== null) regions.push(m[1]);

  // ``` fenced code blocks (```lang ... ```).
  const fenceRe = /```[^\n]*\n([\s\S]*?)```/g;
  while ((m = fenceRe.exec(content)) !== null) regions.push(m[1]);

  return regions.join('\n');
}

// Per-block variant of extractCodeRegions. Where extractCodeRegions joins every
// code region into one string (fine for whole-page token pins), the relational
// checks below need each block in isolation with its starting line number: a
// flow.json block must be parsed on its own, and a `--simulate` finding wants
// the line it sits on. Matches the same two forms extractCodeRegions does
// (fenced ``` blocks and `<CodeSnippet code={`...`}/>` template literals) so the
// two stay consistent about what counts as code.
export type CodeBlock = { code: string; line: number };

export function extractCodeBlocks(content: string): CodeBlock[] {
  const blocks: CodeBlock[] = [];
  const fenceRe = /```[\w-]*\n([\s\S]*?)```/g;
  const snippetRe = /code=\{`([\s\S]*?)`\}/g;
  for (const re of [fenceRe, snippetRe]) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(content)) !== null) {
      blocks.push({
        code: m[1],
        line: content.slice(0, m.index).split('\n').length,
      });
    }
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
// automatically covers the examples/* recipe pages (which carry no simulate
// commands by their hard rule) and deploy.mdx; do not hand-list them. Known
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

// A flow.json shown in the docs must actually be a valid Flow.Config, otherwise
// a copy-paste reader hits an error that never surfaced in review. We reuse the
// canonical validator from core (schemas.validateFlowConfig, the same code path
// the CLI and MCP use) rather than re-deriving the schema here, so the gate can
// never drift from the real contract. Only ERRORS fail the build; the
// validator's reference WARNINGS (unknown $var, $env casing, ...) are advisory
// and expected in illustrative snippets.
//
// Qualifying-block rule: a block is treated as a full flow config only when it
// carries a top-level "version": 4 and a "flows" key. Such a block that fails
// JSON.parse is a broken example (ERROR); fragments that lack those top-level
// keys are skipped (they are partial illustrations, not runnable configs).
//
// Version scoping: the canonical validator governs v4 configs (its schema pins
// version === 4), so this check only judges blocks that declare version 4. A
// snippet declaring another version (e.g. the v3 "before" block in the
// migrating/v3-to-v4 guide, immediately followed by its valid v4 "after" block)
// is intentionally an older-schema config and is out of this validator's
// jurisdiction; validating it against the v4 schema would be a category error.
// This is a scope boundary, not a weakened check: genuinely broken or invalid
// v4 configs still fail.
type SchemaFinding = { line: number; path: string; message: string };

export function findFlowJsonSchemaIssues(content: string): SchemaFinding[] {
  const findings: SchemaFinding[] = [];
  for (const block of extractCodeBlocks(content)) {
    const trimmed = block.code.trim();
    // Cheap pre-filter: only object-shaped blocks that declare a top-level
    // "version": 4 alongside "flows" can be a full v4 flow config. The
    // refinement (version is genuinely the OWN top-level key) happens after
    // parsing; non-v4 configs are dropped here.
    if (!trimmed.startsWith('{')) continue;
    if (!/"version"\s*:\s*4\b/.test(trimmed) || !trimmed.includes('"flows"'))
      continue;

    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      // Broken JSON in a block that reads as a full v4 flow config: run it
      // through the canonical validator so the message locates the syntax error.
      for (const e of schemas.validateFlowConfig(trimmed).errors) {
        findings.push({
          line: block.line,
          path: e.path ?? 'root',
          message: e.message,
        });
      }
      continue;
    }
    // Skip fragments (tokens nested, not top-level) and non-v4 configs (the
    // pre-filter can match a nested "version": 4 inside a differently-versioned
    // block).
    if (!isObject(parsed) || parsed.version !== 4 || !('flows' in parsed))
      continue;
    for (const e of schemas.validateFlowConfig(trimmed).errors) {
      findings.push({
        line: block.line,
        path: e.path ?? 'root',
        message: e.message,
      });
    }
  }
  return findings;
}

// Schema validity is universal (unlike Task 2's page-local coherence), so this
// runs over the whole docs tree. The Examples-group recipe pages each carry one
// full flow.json and are validated here automatically.
function checkFlowJsonSnippets(): void {
  const files = glob.sync('website/docs/**/*.mdx', {
    cwd: ROOT,
    ignore: ['**/node_modules/**', '**/dist/**'],
    absolute: true,
  });
  for (const abs of files) {
    const content = readFileSync(abs, 'utf-8');
    for (const finding of findFlowJsonSchemaIssues(content)) {
      issues.push({
        file: relative(ROOT, abs),
        line: finding.line,
        severity: 'error',
        message: `flow.json snippet invalid (${finding.path}): ${finding.message}`,
      });
    }
  }
}

// The getting-started surface (plus the MCP app page) is the open/free
// onboarding path; walkerOS's own sales register (upgrade prompts, monthly
// prices, tier names) does not belong there. The paid/cloud story lives behind
// an explicit `:::cloud` callout instead.
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

// `:::cloud` marks the paid/cloud boundary. Golden-path onboarding pages must
// stay free of it (the open path must be fully walkable without the cloud);
// the pages that document deploying to the cloud must carry it.
export function findCloudPlacementIssues(
  content: string,
  role: 'golden-path' | 'requires-cloud',
): BoundaryFinding[] {
  const hasCloud = /:::cloud\b/.test(content);
  if (role === 'golden-path' && hasCloud) {
    return [
      {
        message:
          '`:::cloud` callout is not allowed on a golden-path onboarding page (the open path must be walkable without the cloud)',
      },
    ];
  }
  if (role === 'requires-cloud' && !hasCloud) {
    return [
      {
        message:
          'page must carry a `:::cloud` callout to mark the paid/cloud boundary, but none was found',
      },
    ];
  }
  return [];
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

  // Golden-path pages: `:::cloud` forbidden.
  const goldenPath = [
    'website/docs/getting-started/index.mdx',
    'website/docs/getting-started/quickstart/index.mdx',
    'website/docs/getting-started/quickstart/react.mdx',
    'website/docs/getting-started/quickstart/nextjs.mdx',
    'website/docs/getting-started/ga4-ecommerce.mdx',
  ];
  for (const rel of goldenPath) {
    const abs = join(ROOT, rel);
    if (!existsSync(abs)) continue;
    for (const f of findCloudPlacementIssues(
      readFileSync(abs, 'utf-8'),
      'golden-path',
    )) {
      issues.push({ file: rel, severity: 'error', message: f.message });
    }
  }

  // Boundary pages: `:::cloud` required.
  const requiresCloud = [
    'website/docs/apps/mcp.mdx',
    'website/docs/getting-started/deploy.mdx',
  ];
  for (const rel of requiresCloud) {
    const abs = join(ROOT, rel);
    if (!existsSync(abs)) {
      issues.push({
        file: rel,
        severity: 'error',
        message: 'required :::cloud boundary page missing',
      });
      continue;
    }
    for (const f of findCloudPlacementIssues(
      readFileSync(abs, 'utf-8'),
      'requires-cloud',
    )) {
      issues.push({ file: rel, severity: 'error', message: f.message });
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

  // Extract the event name from `elb('page view', ...)` in the source.
  const eventMatch = source.match(/elb\(\s*['"]([^'"]+)['"]/);
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
    normalize(`elb('${eventName}'`),
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
  // (`elb('product add', { id: 'ers', ... })`) so the pinned push snippet stays
  // derived from the verified source rather than hardcoded.
  const idMatch = source.match(
    /elb\(\s*['"]product add['"]\s*,\s*\{\s*id:\s*['"]([^'"]+)['"]/,
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
    normalize(`elb('product add', { id: '${productId}'`),
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
  }

  checkBundledSnippets();
  checkFirstEventSnippet();
  checkForbiddenCliVerbs();
  checkGa4MappingSnippet();
  checkSimulateKeyResolution();
  checkFlowJsonSnippets();
  checkBoundaryRegister();

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
