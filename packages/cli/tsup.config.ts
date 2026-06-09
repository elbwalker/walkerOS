import { defineConfig, baseConfig } from '@walkeros/config/tsup';
import { cpSync, existsSync, mkdirSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { createHash } from 'crypto';

// Read version at build time
const packageJson = JSON.parse(
  readFileSync(resolve(process.cwd(), 'package.json'), 'utf-8'),
);
const version = packageJson.version || '0.0.0';

// Bake the bundled OpenAPI contract identity at build time. The hash MUST be
// computed with the SAME canonical algorithm the app uses in
// app/src/lib/api/contract-version.ts (computeContractHash): sha256 hex of
// JSON.stringify(canonicalize(stripInfoVersion(doc))). Replicated here as a
// tiny pure helper (no shared registry) so client and server agree byte-for-byte.
function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (isRecord(value)) {
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort())
      result[key] = canonicalize(value[key]);
    return result;
  }
  return value;
}
function stripInfoVersion(doc: unknown): unknown {
  if (!isRecord(doc) || !isRecord(doc.info)) return doc;
  const restInfo: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(doc.info)) {
    if (key !== 'version') restInfo[key] = value;
  }
  return { ...doc, info: restInfo };
}
function canonicalContractHash(doc: unknown): string {
  return createHash('sha256')
    .update(JSON.stringify(canonicalize(stripInfoVersion(doc))))
    .digest('hex');
}

const openapiSpec = JSON.parse(
  readFileSync(resolve(process.cwd(), 'openapi/spec.json'), 'utf-8'),
);
const contractVersion: string = openapiSpec.info?.version || '0.0.0';
const contractHash: string = canonicalContractHash(openapiSpec);

// Shared between both define blocks below; keep them identical so the library
// and binary builds bake the same contract identity.
const contractDefines = {
  __CONTRACT_VERSION__: JSON.stringify(contractVersion),
  __CONTRACT_HASH__: JSON.stringify(contractHash),
};

export default defineConfig([
  // CLI binary (with shebang)
  {
    ...baseConfig,
    entry: ['src/cli.ts'],
    format: ['esm'],
    dts: false,
    sourcemap: false,
    minify: false,
    noExternal: [/@walkeros\//],
    banner: {
      js: '#!/usr/bin/env node',
    },
    define: {
      __VERSION__: JSON.stringify(version),
      ...contractDefines,
    },
    onSuccess: async () => {
      // Copy examples to dist/ for sibling resolution at runtime
      const distDir = resolve(process.cwd(), 'dist');
      const examplesSource = resolve(process.cwd(), 'examples');

      if (!existsSync(distDir)) {
        mkdirSync(distDir, { recursive: true });
      }

      if (existsSync(examplesSource)) {
        cpSync(examplesSource, resolve(distDir, 'examples'), {
          recursive: true,
        });
      }
    },
  },

  // Library entry (no shebang)
  {
    ...baseConfig,
    entry: ['src/index.ts'],
    format: ['esm'],
    dts: true,
    sourcemap: true,
    minify: false,
    define: {
      __VERSION__: JSON.stringify(version),
      ...contractDefines,
    },
  },

  // Dev entry point (schemas, no shebang)
  {
    ...baseConfig,
    entry: ['src/dev.ts'],
    format: ['esm'],
    dts: true,
    sourcemap: true,
    minify: false,
  },

  // Examples barrel (typed re-export of bundled flow.json examples).
  // Emits dist/examples/index.{js,d.ts} so consumers can import
  // `@walkeros/cli/examples` and receive Flow.Json without casting.
  {
    ...baseConfig,
    entry: { 'examples/index': 'src/examples/index.ts' },
    format: ['esm'],
    dts: true,
    sourcemap: true,
    minify: false,
  },
]);
