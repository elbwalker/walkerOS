#!/usr/bin/env node
// Committed so npm links the bin at install time, before the first build. The
// checker itself is built into dist/design, beside the design CSS it reads.
import { existsSync } from 'node:fs';

const checker = new URL('../dist/design/check.mjs', import.meta.url);

if (existsSync(checker)) {
  await import(checker.href);
} else {
  process.stderr.write(
    'walkeros-design-check: dist/design/check.mjs is missing, run `npm run build` in apps/explorer\n',
  );
  process.exitCode = 2;
}
