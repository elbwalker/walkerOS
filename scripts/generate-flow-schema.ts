/**
 * Generate JSON Schema files for Flow configuration.
 *
 * Reads the Zod schemas from @walkeros/core and writes JSON Schema files
 * to website/static/schema/flow/ for IDE validation.
 *
 * Usage: npx tsx scripts/generate-flow-schema.ts
 */

import { writeFileSync } from 'fs';
import { resolve } from 'path';
import { schemas } from '@walkeros/core/dev';

const outDir = resolve(__dirname, '../website/static/schema/flow');

const path = resolve(outDir, 'v3.json');
writeFileSync(path, JSON.stringify(schemas.configJsonSchema, null, 2) + '\n');
console.log(`Wrote ${path}`);
