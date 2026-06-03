import { defineConfig, baseConfig } from '@walkeros/config/tsup';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { createHash } from 'crypto';
import { createRequire } from 'module';

const packageJson = JSON.parse(
  readFileSync(resolve(process.cwd(), 'package.json'), 'utf-8'),
);
const version = packageJson.version || '0.0.0';

// Bake the contract identity from the bundled CLI's OpenAPI spec (a build
// input resolved via the dependency, not a runtime cross-package import). The
// hash MUST use the SAME canonical algorithm as the app's computeContractHash
// (app/src/lib/api/contract-version.ts) and the CLI's own contract.ts.
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

const specPath = createRequire(import.meta.url).resolve(
  '@walkeros/cli/openapi/spec.json',
);
const openapiSpec = JSON.parse(readFileSync(specPath, 'utf-8'));
const contractVersion: string = openapiSpec.info?.version || '0.0.0';
const contractHash: string = canonicalContractHash(openapiSpec);

const common = {
  ...baseConfig,
  format: ['esm'] as const,
  dts: true,
  sourcemap: true,
  minify: false,
  external: [
    'zod',
    '@modelcontextprotocol/sdk',
    '@walkeros/cli',
    '@walkeros/core',
  ],
  // tsup auto-externalizes every dependency (including `@walkeros/cli`) and,
  // with it, all of the package's subpaths. We want the OPPOSITE for the
  // bundled OpenAPI spec: inline its JSON at build time so the resource and
  // diagnostics serve a build-pinned in-memory copy with no runtime module
  // resolution. `noExternal` forces just that one subpath to be bundled while
  // the rest of `@walkeros/cli` stays external.
  noExternal: [/^@walkeros\/cli\/openapi\/spec\.json$/],
  define: {
    __VERSION__: JSON.stringify(version),
    __CONTRACT_VERSION__: JSON.stringify(contractVersion),
    __CONTRACT_HASH__: JSON.stringify(contractHash),
  },
};

export default defineConfig([
  {
    ...common,
    entry: { index: 'src/index.ts' },
  },
  {
    ...common,
    entry: { stdio: 'src/stdio.ts' },
    banner: { js: '#!/usr/bin/env node' },
  },
]);
