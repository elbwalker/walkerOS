#!/usr/bin/env npx tsx
/**
 * Validates documentation quality standards
 * Usage: npx tsx scripts/validate-docs.ts
 */

import { existsSync, readFileSync } from 'fs';
import { glob } from 'glob';
import { join, relative } from 'path';

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
}

// The only offline "see your event" loop is `walkeros push <flow> --simulate
// <step>`. There is no `walkeros serve` and no standalone `walkeros simulate`
// verb. A getting-started page that names either would send a copy-paste reader
// to a command that does not exist, so flag them. We match only the verb
// position right after `walkeros`, which leaves the valid forms untouched:
// `push --simulate`, a bare `--simulate`, and the MCP tool `flow_simulate` all
// lack a `walkeros simulate` verb sequence.
function checkForbiddenCliVerbs(): void {
  const targetFiles = [
    'website/docs/getting-started/modes/bundled.mdx',
    'website/docs/getting-started/modes/integrated.mdx',
  ];
  const targetFiles2 = glob.sync(
    'website/docs/getting-started/quickstart/**/*.mdx',
    { cwd: ROOT, ignore: ['**/node_modules/**', '**/dist/**'], absolute: true },
  );

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

  for (const rel of targetFiles) scan(join(ROOT, rel));
  for (const abs of targetFiles2) scan(abs);
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

  // Tokens every docs snippet must contain (normalized form). The event-name
  // token is derived; the item/value field mappings are pinned literals.
  const requiredTokens = [
    normalize(`name: '${eventName}'`),
    normalize("item_id: 'data.id'"),
    normalize("item_name: 'data.name'"),
    normalize("value: 'data.price'"),
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
    const missing = requiredTokens.some(
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

main().catch(console.error);
