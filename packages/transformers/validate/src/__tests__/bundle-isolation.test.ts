import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as zlib from 'node:zlib';
import { build } from 'esbuild';

/**
 * The JSON Schema engine (@cfworker/json-schema) is a dependency of THIS
 * transformer only. It must never leak into @walkeros/core or
 * @walkeros/collector, and it must be tree-shaken out of any flow that does not
 * use the validate transformer.
 *
 * These tests assert that isolation property:
 *  - negative guards: cfworker is absent from core/collector deps and source.
 *  - positive: a fingerprint-only bundle excludes the engine; a validate bundle
 *    includes it, and the engine stays small (< 20KB gzipped).
 */

// __tests__ -> src -> validate -> transformers -> packages -> root
const repoRoot = path.resolve(__dirname, '../../../../..');
const nodeModules = path.join(repoRoot, 'node_modules');

const CFWORKER_PATTERN = /cfworker|class Validator/;

/**
 * Zod must NEVER reach the runtime bundle. The canonical event schema is
 * consumed as a pre-serialized static object (src/event-format.schema.ts),
 * generated at build time. If zod ever leaks in (e.g. an accidental runtime
 * import of @walkeros/core/dev or partialEventJsonSchema), this trips.
 */
const ZOD_PATTERN = /\bzod\b|z\.object|ZodType|ZodObject|_zod\b/;

function readJson(relPath: string): { dependencies?: Record<string, string> } {
  const raw = fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
  return JSON.parse(raw) as { dependencies?: Record<string, string> };
}

/** Recursively collects .ts/.tsx file contents under a directory. */
function readSourceTree(absDir: string, skipDir?: string): string {
  let combined = '';
  for (const entry of fs.readdirSync(absDir, { withFileTypes: true })) {
    if (entry.isDirectory() && entry.name === skipDir) continue;
    const full = path.join(absDir, entry.name);
    if (entry.isDirectory()) {
      combined += readSourceTree(full, skipDir);
    } else if (/\.tsx?$/.test(entry.name)) {
      combined += fs.readFileSync(full, 'utf8');
    }
  }
  return combined;
}

/** Bundles a TS snippet in os.tmpdir(), resolving deps via the repo node_modules. */
async function bundleSnippet(contents: string): Promise<string> {
  const result = await build({
    stdin: { contents, resolveDir: os.tmpdir(), loader: 'ts' },
    bundle: true,
    treeShaking: true,
    platform: 'node',
    format: 'esm',
    write: false,
    nodePaths: [nodeModules],
    logLevel: 'silent',
  });
  const out = result.outputFiles[0];
  if (!out) throw new Error('esbuild produced no output');
  return out.text;
}

const gzipBytes = (source: string): number =>
  zlib.gzipSync(Buffer.from(source, 'utf8')).length;

describe('bundle isolation: @cfworker/json-schema stays in the validate transformer', () => {
  describe('negative guards (core/collector must not depend on cfworker)', () => {
    test('@cfworker is not a dependency of @walkeros/core', () => {
      const deps = readJson('packages/core/package.json').dependencies ?? {};
      expect(Object.keys(deps)).not.toContain('@cfworker/json-schema');
    });

    test('@cfworker is not a dependency of @walkeros/collector', () => {
      const deps =
        readJson('packages/collector/package.json').dependencies ?? {};
      expect(Object.keys(deps)).not.toContain('@cfworker/json-schema');
    });

    test('@cfworker is not imported anywhere in core or collector source', () => {
      const coreSrc = readSourceTree(path.join(repoRoot, 'packages/core/src'));
      const collectorSrc = readSourceTree(
        path.join(repoRoot, 'packages/collector/src'),
      );
      expect(coreSrc).not.toContain('@cfworker');
      expect(collectorSrc).not.toContain('@cfworker');
    });
  });

  describe('positive isolation (tree-shaking keeps the engine scoped)', () => {
    test('fingerprint-only bundle excludes the cfworker engine', async () => {
      const bundle = await bundleSnippet(
        "import { transformerFingerprint } from '@walkeros/server-transformer-fingerprint';\n" +
          'globalThis.__keep = transformerFingerprint;\n',
      );
      expect(CFWORKER_PATTERN.test(bundle)).toBe(false);
      expect(ZOD_PATTERN.test(bundle)).toBe(false);
    });

    test('validate bundle includes the cfworker engine and stays under 20KB gzipped', async () => {
      const validateBundle = await bundleSnippet(
        "import { transformerValidate } from '@walkeros/transformer-validate';\n" +
          'globalThis.__keep = transformerValidate;\n',
      );
      expect(CFWORKER_PATTERN.test(validateBundle)).toBe(true);
      // The runtime validate bundle must contain ZERO zod tokens: the canonical
      // event schema is the pre-serialized static event-format.schema.ts.
      expect(ZOD_PATTERN.test(validateBundle)).toBe(false);

      // Quantify the engine's own gzipped footprint in isolation.
      const cfworkerOnly = await bundleSnippet(
        "export * from '@cfworker/json-schema';\n",
      );
      const cfworkerGzip = gzipBytes(cfworkerOnly);

      // eslint-disable-next-line no-console
      console.log(
        `cfworker engine gzipped: ${cfworkerGzip} bytes; ` +
          `full validate bundle gzipped: ${gzipBytes(validateBundle)} bytes`,
      );

      expect(cfworkerGzip).toBeLessThan(20 * 1024);
    });
  });
});

describe('web-safety: no Node-only APIs in shipped source', () => {
  // Scan the package source (excluding tests, which legitimately use node:fs
  // and esbuild) to enforce the web+server agnostic guarantee.
  const shippedSrc = readSourceTree(path.resolve(__dirname, '..'), '__tests__');

  test('no node: protocol imports', () => {
    expect(shippedSrc).not.toMatch(/from\s+['"]node:/);
    expect(shippedSrc).not.toMatch(/require\(\s*['"]node:/);
  });

  test('no bare fs/path/os imports', () => {
    expect(shippedSrc).not.toMatch(/from\s+['"](fs|path|os)['"]/);
    expect(shippedSrc).not.toMatch(/require\(\s*['"](fs|path|os)['"]\s*\)/);
  });

  test('no Buffer usage', () => {
    expect(shippedSrc).not.toMatch(/\bBuffer\b/);
  });

  test('no process. usage', () => {
    expect(shippedSrc).not.toMatch(/\bprocess\./);
  });
});
