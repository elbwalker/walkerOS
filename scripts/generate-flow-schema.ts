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

const targets = [
  { file: 'v1.json', schema: schemas.configJsonSchema },
  { file: 'v2.json', schema: schemas.configV2JsonSchema },
  { file: 'v3.json', schema: schemas.configV3JsonSchema },
] as const;

for (const { file, schema } of targets) {
  const path = resolve(outDir, file);
  writeFileSync(path, JSON.stringify(schema, null, 2) + '\n');
  console.log(`Wrote ${path}`);
}
