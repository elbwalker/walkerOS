#!/usr/bin/env npx tsx
/**
 * Validates documentation quality standards
 * Usage: npx tsx scripts/validate-docs.ts
 */

import { readFileSync } from 'fs';
import { glob } from 'glob';
import { relative } from 'path';

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
