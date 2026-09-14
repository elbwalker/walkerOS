import { createHash } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { rmSync } from 'node:fs';
import { bundle } from '@walkeros/cli';

/**
 * Content-addressed cache of prebuilt simulate bundles for the MCP
 * `flow_simulate` tool. Each `flow_simulate` call otherwise re-bundles the
 * whole flow (`mode: 'build'`), which dominates latency. By keying a prebuilt
 * ESM by the hash of the *resolved* config content, repeated simulations of the
 * same flow reuse one bundle and a changed flow rebuilds.
 *
 * The CLI simulate functions accept a `bundlePath`; passing it takes their
 * `mode: 'prebuilt'` branch and skips the bundle step entirely.
 */

interface CacheEntry {
  bundlePath: string;
  dir: string;
}

/** LRU bound: enough to cover a few flows iterated in one session without
 *  leaking temp dirs. Oldest entry is evicted (and its dir removed) on insert. */
const MAX_ENTRIES = 8;

/** Insertion-ordered map gives us LRU for free: delete+set on access moves the
 *  key to the end; the first key is the least-recently used. */
const cache = new Map<string, CacheEntry>();

/** In-flight builds, deduped by key so two concurrent identical simulate calls
 *  bundle once instead of racing to write the same artifact. */
const inFlight = new Map<string, Promise<string>>();

let cleanupRegistered = false;

function hashConfig(resolvedConfig: string): string {
  return createHash('sha256').update(resolvedConfig).digest('hex');
}

/**
 * Inline JSON config content is cacheable: its full content is the cache key,
 * so an edit always re-keys. A file path or URL is NOT: `resolveConfigPath`
 * returns it unchanged, so the key would be the path string and an edit to the
 * file behind it would silently reuse a stale bundle. Such inputs skip the
 * cache and take the simulate fns' build path (which re-reads the file).
 *
 * The discriminator matches how the CLI simulate fns treat `configPath`: a
 * string that parses as JSON is inline config; anything else is a path/URL.
 */
function isInlineJsonConfig(resolvedConfig: string): boolean {
  const trimmed = resolvedConfig.trimStart();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return false;
  try {
    JSON.parse(resolvedConfig);
    return true;
  } catch {
    return false;
  }
}

function registerProcessCleanup(): void {
  if (cleanupRegistered) return;
  cleanupRegistered = true;
  const cleanup = () => {
    for (const entry of cache.values()) {
      // Synchronous best-effort removal on exit; async fs is not safe here.
      try {
        rmSync(entry.dir, { recursive: true, force: true });
      } catch {
        // Temp dir already gone or unwritable; nothing to recover.
      }
    }
    cache.clear();
  };
  process.once('exit', cleanup);
}

async function evictIfNeeded(): Promise<void> {
  while (cache.size > MAX_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey === undefined) break;
    const evicted = cache.get(oldestKey);
    cache.delete(oldestKey);
    if (evicted) await rm(evicted.dir, { recursive: true, force: true });
  }
}

/**
 * Build the resolved config into a prebuilt simulate ESM and return its path,
 * reusing a cached bundle when the same resolved config was bundled before.
 *
 * `resolvedConfig` is the exact string the simulate functions would otherwise
 * receive as `configPath` (inline JSON for cloud ids after id resolution, or a
 * file path / URL / inline JSON otherwise). Keying on it means a cloud id whose
 * underlying content changes between calls rebuilds correctly.
 *
 * Returns `undefined` for file-path / URL configs (see `isInlineJsonConfig`):
 * those bypass the cache so an edited file is never served from a stale bundle.
 * The caller then passes the original configPath with no bundlePath, taking the
 * simulate fns' build path exactly as before.
 *
 * The producer mirrors the CLI build-mode bundle: target `simulate`
 * (skipWrapper + withDev, /dev graph inlined) written as ESM. The flow's own
 * platform is preserved via the bundler's platform defaults; only the output
 * format is pinned to ESM so the CLI can import it directly.
 */
export async function getOrBuildBundle(
  resolvedConfig: string,
): Promise<string | undefined> {
  if (!isInlineJsonConfig(resolvedConfig)) return undefined;

  registerProcessCleanup();
  const key = hashConfig(resolvedConfig);

  const cached = cache.get(key);
  if (cached) {
    // Refresh LRU position.
    cache.delete(key);
    cache.set(key, cached);
    return cached.bundlePath;
  }

  const pending = inFlight.get(key);
  if (pending) return pending;

  const build = (async () => {
    const dir = path.join(
      os.tmpdir(),
      `walkeros-mcp-bundle-${key.slice(0, 16)}`,
    );
    await rm(dir, { recursive: true, force: true });
    await mkdir(dir, { recursive: true });
    const bundlePath = path.join(dir, 'flow.mjs');

    // Touch the file first so a producer that only mutates (rather than writes)
    // still leaves a real artifact; the bundler overwrites it with the real ESM.
    await writeFile(bundlePath, '', 'utf-8');

    // Load-bearing: `bundle()` derives platform from the flow config and
    // intentionally ignores `preset.platform` (the 'simulate' preset is node),
    // so a web flow still bundles browser-platform, equivalent to build-mode.
    // If `bundle()` ever honors `preset.platform`, web simulations via this
    // cache would silently bundle for node and diverge.
    await bundle(resolvedConfig, {
      target: 'simulate',
      silent: true,
      buildOverrides: { output: bundlePath, format: 'esm', minify: false },
    });

    cache.set(key, { bundlePath, dir });
    await evictIfNeeded();
    return bundlePath;
  })();

  inFlight.set(key, build);
  try {
    return await build;
  } finally {
    inFlight.delete(key);
  }
}

/** Test-only: clear the cache and remove all temp dirs. */
export async function __resetBundleCacheForTests(): Promise<void> {
  inFlight.clear();
  const dirs = Array.from(cache.values(), (e) => e.dir);
  cache.clear();
  await Promise.all(
    dirs.map((dir) => rm(dir, { recursive: true, force: true })),
  );
}
