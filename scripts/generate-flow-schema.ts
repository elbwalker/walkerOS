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

/**
 * Strip non-standard `id` keys from every definition object.
 *
 * Zod 4's `.meta({ id: 'Foo' })` drives both the `#/definitions/Foo` key
 * AND emits a literal `"id": "Foo"` property inside the definition. The
 * latter is not part of JSON Schema draft-07 (draft-07 uses `$id`).
 * We want the named definition keys but not the stray property.
 */
function stripNonStandardIds(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripNonStandardIds);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (k === 'id' && typeof v === 'string') continue;
      out[k] = stripNonStandardIds(v);
    }
    return out;
  }
  return value;
}

const outDir = resolve(__dirname, '../website/static/schema/flow');

const path = resolve(outDir, 'v3.json');
const cleaned = stripNonStandardIds(schemas.configJsonSchema);
writeFileSync(path, JSON.stringify(cleaned, null, 2) + '\n');
console.log(`Wrote ${path}`);
