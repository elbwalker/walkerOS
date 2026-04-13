#!/usr/bin/env node
import { readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const bundle = join(__dirname, '..', 'dist', 'index.mjs');
const src = readFileSync(bundle, 'utf8');
const size = statSync(bundle).size;

const forbidden = [
  { pattern: /from\s*["']zod["']/, label: 'import from "zod"' },
  { pattern: /require\(["']zod["']\)/, label: 'require("zod")' },
  { pattern: /toJSONSchema/, label: 'toJSONSchema reference' },
  { pattern: /ZodObject|ZodString|ZodArray/, label: 'Zod symbol' },
];

const failures = forbidden.filter((f) => f.pattern.test(src));

// Byte budget: current post-fix size ~28KB. 60KB gives headroom for legit growth.
const BUDGET = 60 * 1024;

if (failures.length) {
  console.error('core/dist/index.mjs contains forbidden zod references:');
  for (const f of failures) console.error('  -', f.label);
  console.error('');
  console.error('The main entry must not import or reference zod.');
  console.error('Schema code belongs behind @walkeros/core/dev.');
  process.exit(1);
}

if (size > BUDGET) {
  console.error(
    `core/dist/index.mjs is ${size} bytes, over budget of ${BUDGET} bytes.`,
  );
  process.exit(1);
}

console.log(
  `core/dist/index.mjs is zod-free and ${size} bytes (budget: ${BUDGET}).`,
);
