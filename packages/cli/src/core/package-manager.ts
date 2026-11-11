import { createHash } from 'crypto';
import pacote from 'pacote';
import path from 'path';
import fs from 'fs-extra';
import { readFile } from 'fs/promises';
import os from 'os';
import semver from 'semver';
import { resolveLocalPackage, copyLocalPackage } from './local-packages.js';
import type { Logger } from '@walkeros/core';
import { getPackageCacheKey } from './cache-utils.js';
import { getTmpPath } from './tmp.js';
import {
  isCacheDirComplete,
  readCacheDir,
  writeCacheDir,
} from './atomic-cache.js';
import {
  assertRegistrySpecs,
  assertTransitiveRegistrySpec,
  isRegistrySpec,
} from './package-spec.js';
import {
  PACKAGE_TREE_VERSION,
  PackageTreeError,
  aliasCrossesExemption,
  assertPackageTree,
  edgeIsExempt,
  edgeTargetName,
  followedEdges,
  lookupPaths,
  parseInstallPath,
  type PackageTree,
  type PackageTreeEntry,
} from './package-tree.js';

export interface NpmConfig {
  registry: string;
  [key: string]: unknown;
}

/**
 * `ignoreScripts` is NOT the fix for install-time code execution, and must
 * not be read as one. pacote honours it in exactly one place, the directory
 * fetcher's `prepare` gate (`lib/dir.js`), so it closes `file:` and directory
 * specs only. The git fetcher's `#prepareDir` (`lib/git.js`) spawns a full
 * `npm install --force` whose default CLI config carries no
 * `--ignore-scripts` and passes `--include=dev --include=peer
 * --include=optional`, so it does NOT close `git:`. What closes `git:` is the
 * spec-type gate in `./package-spec.ts`, which refuses every non-registry
 * spec before pacote sees it. This flag is defence in depth behind that gate.
 */
const IGNORE_SCRIPTS = { ignoreScripts: true } as const;

export const PACOTE_OPTS: NpmConfig = {
  registry: 'https://registry.npmjs.org/',
  preferOnline: true,
  where: undefined,
  ...IGNORE_SCRIPTS,
};

/**
 * A release-age cutoff for one resolve: only versions published at or before
 * `before` are picked, for every edge but the exempt ones (`edgeIsExempt`).
 */
export interface Cooldown {
  before: Date;
  exempt: readonly string[];
}

/** npm error codes that mean a recorded tarball is not served any more. */
const UNAVAILABLE_CODES: ReadonlySet<string> = new Set([
  'E404',
  'E410',
  'ETARGET',
  'EINTEGRITY',
]);

/** A recorded package the registry no longer serves, or serves changed. */
export class PackageUnavailableError extends Error {
  readonly code = 'PACKAGE_UNAVAILABLE';

  constructor(
    readonly installPath: string,
    entry: Pick<PackageTreeEntry, 'name' | 'version' | 'integrity'>,
    reason: string,
  ) {
    super(
      `Recorded package ${entry.name}@${entry.version} (${installPath}) could not be installed: ${reason}`,
    );
    this.name = 'PackageUnavailableError';
  }
}

/** The `@scope` registries an npm config names, by scope. */
export function scopeRegistriesOf(
  npmConfig: NpmConfig,
): Record<string, string> {
  const scoped: Record<string, string> = {};
  for (const [key, value] of Object.entries(npmConfig)) {
    if (
      key.startsWith('@') &&
      key.endsWith(':registry') &&
      typeof value === 'string'
    ) {
      scoped[key.slice(0, -':registry'.length)] = value;
    }
  }
  return scoped;
}

/**
 * Walks user + project .npmrc files and merges into a flat config object
 * pacote consumes. Project-level overrides user-level. Tiny INI parser
 * (no sections, surrounding quotes stripped, ${VAR} expansion preserves
 * literal on miss so silent auth failures become loud).
 */
export async function loadNpmConfigForPacote(
  projectDir = process.cwd(),
  homeDir = os.homedir(),
): Promise<NpmConfig> {
  const merged: Record<string, string> = {};
  const sources = [
    path.join(homeDir, '.npmrc'),
    path.join(projectDir, '.npmrc'),
  ];
  for (const file of sources) {
    let content: string;
    try {
      content = await readFile(file, 'utf-8');
    } catch {
      continue;
    }
    for (const rawLine of content.split('\n')) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#') || line.startsWith(';')) continue;
      const eq = line.indexOf('=');
      if (eq < 0) continue;
      const key = line.slice(0, eq).trim();
      let value = line.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      value = value.replace(
        /\$\{([^}]+)\}/g,
        (match, v) => process.env[v] ?? match,
      );
      merged[key] = value;
    }
  }
  let registry = merged['registry'] ?? 'https://registry.npmjs.org/';
  if (!registry.endsWith('/')) registry = `${registry}/`;
  for (const key of Object.keys(merged)) {
    if (key.endsWith(':registry') && key.startsWith('@')) {
      const v = merged[key];
      if (!v.endsWith('/')) merged[key] = `${v}/`;
    }
  }
  // IGNORE_SCRIPTS goes last so an .npmrc cannot switch it off. See its
  // comment: it closes `file:` and directories, not `git:`.
  return { ...merged, registry, preferOnline: true, ...IGNORE_SCRIPTS };
}

// ============================================================
// Resilient pacote downloads
// ============================================================

/**
 * Bounded, classified retry around a single pacote call (`extract`/`manifest`).
 *
 * pacote 21.x forwards `opts.signal` end-to-end (npm-registry-fetch →
 * make-fetch-happen → minipass-fetch). Passing a per-attempt AbortController
 * both bounds the call AND cancels the in-flight fetch, so a timed-out attempt
 * does not leave a detached download running. The previous `withTimeout` race
 * only rejected the wrapper while the real fetch kept running; the signal path
 * replaces it.
 *
 * Only TRANSIENT failures (timeouts, network blips) are retried. Deterministic
 * npm failures (404, auth, bad spec, integrity) fail fast. A total wall-clock
 * budget clamps every attempt to the remaining time so a sequential download
 * loop never holds far longer than the budget. The budget pattern mirrors
 * `runtime/fetch-retry.ts` but is copied here to avoid coupling the bundler to
 * the runtime.
 */

/** Number of attempts (the first try plus retries). */
export const PACOTE_RETRY_ATTEMPTS = 3;

/** Per-attempt timeout before the attempt is aborted. */
const PACOTE_PER_ATTEMPT_TIMEOUT_MS = 60_000;

/** Total wall-clock budget across all attempts (including backoff sleeps). */
const PACOTE_MAX_TOTAL_MS = 90_000;

/**
 * Floor of remaining budget below which starting another attempt is pointless:
 * a sub-second timeout would abort before the socket connects.
 */
const MIN_ATTEMPT_BUDGET_MS = 1_000;

/** Base backoff before retry #2 and #3. The last entry repeats if needed. */
const BASE_BACKOFF_MS: readonly number[] = [2_000, 5_000];

/** Jitter band applied to each backoff: ±20%. */
const JITTER = 0.2;

/**
 * npm error codes that are permanent: an outer retry cannot help, so fail fast.
 * `EINTEGRITY` is permanent at this layer because pacote already cache-busts and
 * retries it once internally; a second outer pass just re-throws.
 */
const PERMANENT_ERROR_CODES: ReadonlySet<string> = new Set([
  'E404',
  'ETARGET',
  'EINVALIDPACKAGENAME',
  'E401',
  'E403',
  'EINTEGRITY',
  'Z_DATA_ERROR',
]);

/** Read an optional string `code` off an unknown error without casting. */
function readErrorCode(value: unknown): string | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const code = Reflect.get(value, 'code');
  return typeof code === 'string' ? code : undefined;
}

/** A permanent error should not be retried (fail fast). */
function isPermanentError(error: unknown): boolean {
  const code = readErrorCode(error);
  return code !== undefined && PERMANENT_ERROR_CODES.has(code);
}

/** Backoff delay (with jitter) before the retry following attempt index `i`. */
function backoffForAttempt(index: number): number {
  const base =
    BASE_BACKOFF_MS[Math.min(index, BASE_BACKOFF_MS.length - 1)] ?? 0;
  const spread = base * JITTER;
  return base + (Math.random() * 2 - 1) * spread;
}

/** Promise-based sleep that fake timers can drive in tests. */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/** Short, safe description of a thrown error for the exhaustion message. */
function describeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

/**
 * Attach an `AbortSignal` to pacote options. `signal` is forwarded by pacote at
 * runtime (npm-registry-fetch → make-fetch-happen) but is not part of the
 * `@types/pacote` Options surface; widen via intersection rather than casting.
 */
function withSignal(
  opts: pacote.Options,
  signal: AbortSignal,
): pacote.Options & { signal: AbortSignal } {
  return { ...opts, signal };
}

export interface PacoteRetryOptions {
  attempts?: number;
  perAttemptTimeoutMs?: number;
  maxTotalMs?: number;
}

/**
 * Run a pacote operation with bounded retry, a per-attempt abort, and a total
 * wall-clock budget. `fn` receives the per-attempt `AbortSignal` to forward as
 * `opts.signal`. Throws after attempts/budget are spent, or immediately on a
 * permanent error.
 */
export async function withPacoteRetry<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  label: string,
  options: PacoteRetryOptions = {},
): Promise<T> {
  const attempts = options.attempts ?? PACOTE_RETRY_ATTEMPTS;
  const perAttemptTimeoutMs =
    options.perAttemptTimeoutMs ?? PACOTE_PER_ATTEMPT_TIMEOUT_MS;
  const maxTotalMs = options.maxTotalMs ?? PACOTE_MAX_TOTAL_MS;

  const start = Date.now();
  let lastError: unknown;
  let made = 0;

  for (let attempt = 0; attempt < attempts; attempt++) {
    // Clamp each attempt to the remaining budget so the total wall-clock is
    // genuinely bounded. Stop if too little budget remains for a real attempt.
    const remaining = maxTotalMs - (Date.now() - start);
    if (remaining <= MIN_ATTEMPT_BUDGET_MS) break;
    const attemptTimeoutMs = Math.min(perAttemptTimeoutMs, remaining);

    made = attempt + 1;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), attemptTimeoutMs);
    try {
      return await fn(controller.signal);
    } catch (error) {
      lastError = error;
      // Permanent failures never benefit from a retry.
      if (isPermanentError(error)) throw error;
    } finally {
      clearTimeout(timeoutId);
    }

    const isLastAttempt = attempt === attempts - 1;
    const budgetSpent = Date.now() - start >= maxTotalMs;
    if (isLastAttempt || budgetSpent) break;

    const sleepMs = Math.min(
      backoffForAttempt(attempt),
      maxTotalMs - (Date.now() - start),
    );
    if (sleepMs <= 0) break;
    await delay(sleepMs);
  }

  throw new Error(
    `Failed ${label} after ${made} attempts: ${describeError(lastError)}`,
  );
}

/**
 * `pacote.extract` with resilient retry. Retrying into the same dir is safe:
 * pacote empties `dest` before each extract, so no redundant pre-clean is
 * needed. The `cache` opt (when present) is preserved across attempts.
 */
export function extractWithResilience(
  spec: string,
  dest: string,
  opts: pacote.Options,
  _logger: Logger.Instance,
  retryOptions?: PacoteRetryOptions,
): Promise<pacote.FetchResult> {
  return withPacoteRetry(
    (signal) => pacote.extract(spec, dest, withSignal(opts, signal)),
    `download ${spec}`,
    retryOptions,
  );
}

/** `pacote.tarball` with resilient retry. */
export function tarballWithResilience(
  spec: string,
  opts: pacote.Options,
  retryOptions?: PacoteRetryOptions,
): Promise<Buffer & pacote.FetchResult> {
  return withPacoteRetry(
    (signal) => pacote.tarball(spec, withSignal(opts, signal)),
    `download ${spec}`,
    retryOptions,
  );
}

/** `pacote.manifest` with resilient retry. */
export function manifestWithResilience(
  spec: string,
  opts: pacote.Options,
  _logger: Logger.Instance,
  retryOptions?: PacoteRetryOptions,
): Promise<pacote.AbbreviatedManifest & pacote.ManifestResult> {
  return withPacoteRetry(
    (signal) => pacote.manifest(spec, withSignal(opts, signal)),
    `fetch manifest ${spec}`,
    retryOptions,
  );
}

export interface Package {
  name: string;
  version: string;
  path?: string;
}

export interface VersionSpec {
  spec: string;
  source: 'direct' | 'override' | 'dependency' | 'peerDependency';
  from: string;
  optional: boolean;
  localPath?: string;
  /** Under a cooldown: this edge skips the cutoff (`edgeIsExempt`). */
  exempt?: boolean;
}

interface ResolvedPackage {
  name: string;
  version: string;
  localPath?: string;
  /** Under a cooldown: every edge asking for this spec is exempt. */
  exempt?: boolean;
}

export interface NestedPackage {
  name: string;
  version: string;
  consumers: string[];
  exempt?: boolean;
}

export interface ResolutionResult {
  topLevel: Map<string, ResolvedPackage>;
  nested: NestedPackage[];
}

function getPackageDirectory(baseDir: string, packageName: string): string {
  return path.join(baseDir, 'node_modules', packageName);
}

function getNestedPackageDirectory(
  baseDir: string,
  consumerName: string,
  nestedPackageName: string,
): string {
  return path.join(
    baseDir,
    'node_modules',
    consumerName,
    'node_modules',
    nestedPackageName,
  );
}

// ============================================================
// Phase 1: Collect all version specs via BFS
// ============================================================

export async function collectAllSpecs(
  packages: Package[],
  logger: Logger.Instance,
  configDir?: string,
  overrides: Record<string, string> = {},
  npmConfig: NpmConfig = PACOTE_OPTS,
  cooldown?: Cooldown,
): Promise<Map<string, VersionSpec[]>> {
  const allSpecs = new Map<string, VersionSpec[]>();
  const visited = new Set<string>();

  interface QueueItem {
    name: string;
    spec: string;
    source: VersionSpec['source'];
    from: string;
    optional: boolean;
    localPath?: string;
    exempt: boolean;
  }

  const exemptEdge = (name: string, spec: string, parentName?: string) =>
    cooldown !== undefined &&
    edgeIsExempt({ name, spec, parentName }, cooldown.exempt);

  // Warn about overrides targeting direct local-path packages
  const directLocalNames = new Set(
    packages.filter((p) => p.path).map((p) => p.name),
  );
  for (const overrideName of Object.keys(overrides)) {
    if (directLocalNames.has(overrideName)) {
      logger.warn(
        `Override for ${overrideName} ignored — direct package is a local path`,
      );
    }
  }

  // Helper: substitute a transitive dep spec with its override (if any).
  // `parentName` is the consumer's registry name, from its fetched manifest.
  const substituteDep = (
    depName: string,
    depSpec: string,
    source: 'dependency' | 'peerDependency',
    from: string,
    optional: boolean,
    parentName?: string,
  ): QueueItem => {
    const overrideSpec = overrides[depName];
    if (overrideSpec) {
      return {
        name: depName,
        spec: overrideSpec,
        source: 'override',
        from: `override (was ${depSpec} from ${from})`,
        optional,
        exempt: exemptEdge(depName, overrideSpec),
      };
    }
    return {
      name: depName,
      spec: depSpec,
      source,
      from,
      optional,
      exempt: exemptEdge(depName, depSpec, parentName),
    };
  };

  // Every spec that can reach pacote must be a registry fetch. Direct pins
  // and override values are checked up front, all at once, before any
  // network call; transitive specs are checked as they are dequeued.
  assertRegistrySpecs([
    ...packages
      .filter((pkg) => !pkg.path)
      .map((pkg) => ({ name: pkg.name, spec: pkg.version, from: 'flow.json' })),
    // An override for a directly-local package is ignored (warned above),
    // so it is never fetched and not validated either.
    ...Object.entries(overrides)
      .filter(([name]) => !directLocalNames.has(name))
      .map(([name, spec]) => ({
        name,
        spec,
        from: 'config.bundle.overrides',
      })),
  ]);

  const queue: QueueItem[] = packages.map((pkg) => ({
    name: pkg.name,
    spec: pkg.version,
    source: 'direct' as const,
    from: 'flow.json',
    optional: false,
    localPath: pkg.path,
    exempt: exemptEdge(pkg.name, pkg.version),
  }));

  while (queue.length > 0) {
    const item = queue.shift()!;

    // A transitive spec for a name the flow supplies from disk is dropped
    // before it is recorded: the local copy wins resolution, so the spec is
    // never fetched and cannot reach pacote around the check below.
    if (
      !item.localPath &&
      item.source !== 'direct' &&
      directLocalNames.has(item.name)
    ) {
      continue;
    }

    // An OPTIONAL dependency with a non-registry spec is skipped (never
    // recorded, never fetched), as npm would skip an optional dependency it
    // cannot install; every other non-registry transitive spec fails closed.
    if (!item.localPath && item.source !== 'direct') {
      if (item.optional && !isRegistrySpec(item.name, item.spec, true)) {
        logger.warn(
          `Skipping optional dependency ${item.name}@${item.spec} (from ${item.from}): only npm registry specs are installed`,
        );
        continue;
      }
      assertTransitiveRegistrySpec(item);
    }

    // Under a cooldown an alias may not borrow, or lose, an exempt name.
    if (cooldown && !item.localPath) assertAliasKeepsSide(item, cooldown);

    // Record this spec for EVERY queue item — the same name@spec can arrive
    // from multiple consumers (e.g., common AND pubsub both declare arrify@^2.0.0),
    // and the resolver needs to know all of them to nest correctly under each.
    // De-dup only exact (name@spec, from) tuples defensively.
    if (!allSpecs.has(item.name)) allSpecs.set(item.name, []);
    const existing = allSpecs.get(item.name)!;
    if (!existing.some((s) => s.spec === item.spec && s.from === item.from)) {
      existing.push({
        spec: item.spec,
        source: item.source,
        from: item.from,
        optional: item.optional,
        localPath: item.localPath,
        ...(cooldown ? { exempt: item.exempt } : {}),
      });
    }

    // Walk transitive deps only once per name@spec (prevents cycles).
    const visitKey = `${item.name}@${item.spec}`;
    if (visited.has(visitKey)) continue;
    visited.add(visitKey);

    // Resolve transitive deps for local packages by reading package.json
    if (item.localPath) {
      const resolvedPath = path.isAbsolute(item.localPath)
        ? item.localPath
        : path.resolve(configDir || process.cwd(), item.localPath);

      // Check if this local path has a package.json (directories only)
      const candidatePath = path.join(resolvedPath, 'package.json');
      const hasPkgJson = await fs.pathExists(candidatePath);

      if (hasPkgJson) {
        try {
          // Local package.json shape — only the fields we read.
          interface LocalPackageJson {
            dependencies?: Record<string, string>;
            peerDependencies?: Record<string, string>;
            peerDependenciesMeta?: Record<string, { optional?: boolean }>;
          }
          const pkgJson: LocalPackageJson = await fs.readJson(candidatePath);

          // Queue regular dependencies
          const deps = pkgJson.dependencies || {};
          for (const [depName, depSpec] of Object.entries(deps)) {
            if (typeof depSpec === 'string') {
              queue.push(
                substituteDep(depName, depSpec, 'dependency', item.name, false),
              );
            }
          }

          // Queue peerDependencies with metadata
          const peerDeps = pkgJson.peerDependencies || {};
          const peerMeta = pkgJson.peerDependenciesMeta || {};
          for (const [depName, depSpec] of Object.entries(peerDeps)) {
            if (typeof depSpec === 'string') {
              const isOptional = peerMeta[depName]?.optional === true;
              queue.push(
                substituteDep(
                  depName,
                  depSpec,
                  'peerDependency',
                  item.name,
                  isOptional,
                ),
              );
            }
          }
        } catch (error) {
          logger.debug(
            `Failed to read package.json for local package ${item.name}: ${error}`,
          );
        }
      }

      continue;
    }

    // Fetch manifest from registry. pacote.manifest returns
    // AbbreviatedManifest & ManifestResult — typed dependencies/peerDependencies.
    // peerDependenciesMeta isn't in the upstream type but is a valid npm field;
    // declare a local extension for it.
    interface ManifestWithMeta
      extends pacote.AbbreviatedManifest, pacote.ManifestResult {
      peerDependenciesMeta?: Record<string, { optional?: boolean }>;
    }
    let manifest: ManifestWithMeta;
    try {
      manifest = await manifestWithResilience(
        `${item.name}@${item.spec}`,
        cooldownOptions(npmConfig, cooldown, item.exempt),
        logger,
      );
      if (cooldown && !item.exempt) {
        assertPublishedBefore(manifest, cooldown, item.from);
      }
    } catch (error) {
      // Under a cooldown a miss fails the build: a recorded tree must hold
      // every edge it follows, and a pick refused by the cutoff is a fact
      // the person needs, not a gap.
      if (cooldown) {
        throw cooldownFailure(item.name, item.spec, item.from, cooldown, error);
      }
      // A persistent manifest miss silently under-resolves the dependency
      // graph (the consumer's transitive deps are never queued). Escalate to
      // warn so the gap is visible, then continue resolving the rest.
      logger.warn(
        `Failed to fetch manifest for ${item.name}@${item.spec} after retries; its dependencies may be unresolved: ${error instanceof Error ? error.message : String(error)}`,
      );
      continue;
    }

    // Queue regular dependencies
    const deps = manifest.dependencies || {};
    for (const [depName, depSpec] of Object.entries(deps)) {
      if (typeof depSpec === 'string') {
        queue.push(
          substituteDep(
            depName,
            depSpec,
            'dependency',
            item.name,
            false,
            manifest.name,
          ),
        );
      }
    }

    // Queue peerDependencies with metadata
    const peerDeps = manifest.peerDependencies || {};
    const peerMeta = manifest.peerDependenciesMeta || {};
    for (const [depName, depSpec] of Object.entries(peerDeps)) {
      if (typeof depSpec === 'string') {
        const isOptional = peerMeta[depName]?.optional === true;
        queue.push(
          substituteDep(
            depName,
            depSpec,
            'peerDependency',
            item.name,
            isOptional,
            manifest.name,
          ),
        );
      }
    }
  }

  return allSpecs;
}

/** pacote options for one pick: the cutoff applies unless the edge is exempt. */
function cooldownOptions(
  npmConfig: pacote.Options,
  cooldown: Cooldown | undefined,
  exempt: boolean | undefined,
): pacote.Options {
  return cooldown && !exempt
    ? { ...npmConfig, before: cooldown.before }
    : npmConfig;
}

/**
 * A pick under the cutoff must carry its publish time, at or before the
 * cutoff: npm-pick-manifest admits a version the packument gives no time for.
 */
function assertPublishedBefore(
  manifest: { name: string; version: string },
  cooldown: Cooldown,
  from: string,
): void {
  const time = Reflect.get(manifest, '_time');
  const label = `${manifest.name}@${manifest.version} (from ${from})`;
  if (typeof time !== 'string' || Number.isNaN(Date.parse(time))) {
    throw new Error(`${label} has no publish time in the registry`);
  }
  if (Date.parse(time) > cooldown.before.getTime()) {
    throw new Error(
      `${label} was published ${time}, after ${cooldown.before.toISOString()}`,
    );
  }
}

/** A failed pick under a cooldown, as the fact the person needs. */
function cooldownFailure(
  name: string,
  spec: string,
  from: string,
  cooldown: Cooldown,
  error: unknown,
): Error {
  if (readErrorCode(error) === 'ETARGET') {
    return new Error(
      `No version of ${name}@${spec} (from ${from}) was published at or before ${cooldown.before.toISOString()}`,
    );
  }
  if (error instanceof Error) return error;
  return new Error(String(error));
}

/** Refuse an alias whose install name and registry name differ in exemption. */
function assertAliasKeepsSide(
  item: { name: string; spec: string; from: string },
  cooldown: Cooldown,
): void {
  const target = edgeTargetName(item.name, item.spec);
  if (
    target !== null &&
    aliasCrossesExemption(item.name, target, cooldown.exempt)
  ) {
    throw new PackageTreeError([
      `${item.name}@${item.spec} (from ${item.from}) aliases across an exempt prefix`,
    ]);
  }
}

// ============================================================
// Phase 2: Resolve version conflicts
// ============================================================

const SOURCE_PRIORITY: Record<VersionSpec['source'], number> = {
  direct: 0,
  override: 1,
  dependency: 2,
  peerDependency: 3,
};

export async function resolveVersionConflicts(
  allSpecs: Map<string, VersionSpec[]>,
  logger: Logger.Instance,
  npmConfig: pacote.Options = {},
  cooldown?: Cooldown,
): Promise<ResolutionResult> {
  const topLevel = new Map<string, ResolvedPackage>();
  const nested: NestedPackage[] = [];

  for (const [name, specs] of allSpecs) {
    // Local paths always win
    const localSpec = specs.find((s) => s.localPath);
    if (localSpec) {
      topLevel.set(name, {
        name,
        version: 'local',
        localPath: localSpec.localPath,
      });
      continue;
    }

    // Under a cooldown a spec skips the cutoff only when every edge asking
    // for it is exempt.
    const specExempt = (spec: string): boolean =>
      cooldown !== undefined &&
      specs.filter((s) => s.spec === spec).every((s) => s.exempt === true);

    // Separate by source
    const nonPeerSpecs = specs.filter((s) => s.source !== 'peerDependency');
    const peerSpecs = specs.filter((s) => s.source === 'peerDependency');

    // Determine active specs (what we resolve from)
    let activeSpecs: VersionSpec[];
    if (nonPeerSpecs.length > 0) {
      activeSpecs = nonPeerSpecs;
    } else {
      // Only peerDeps — filter out optional ones
      const requiredPeers = peerSpecs.filter((s) => !s.optional);
      if (requiredPeers.length === 0) {
        logger.debug(`Skipping optional peer dependency: ${name}`);
        continue;
      }
      activeSpecs = requiredPeers;
    }

    // Sort by priority (direct first)
    activeSpecs.sort(
      (a, b) => SOURCE_PRIORITY[a.source] - SOURCE_PRIORITY[b.source],
    );

    // Direct specs always win — if we have one, use it
    const directSpecs = activeSpecs.filter((s) => s.source === 'direct');
    const directExact = directSpecs.find((s) => semver.valid(s.spec) !== null);

    let chosenVersion: string;
    const alreadyNested = new Set<string>();

    function nestLoser(spec: VersionSpec, alreadyNested: Set<string>): void {
      if (spec.localPath) return;
      if (alreadyNested.has(spec.spec)) return;
      // Skip non-semver loser specs (git URLs, file:, tags) — pacote can resolve them but
      // we cannot statically verify satisfaction. Log and let pacote handle it.
      if (
        semver.valid(spec.spec) === null &&
        semver.validRange(spec.spec) === null
      ) {
        logger.debug(
          `Skipping non-semver loser spec for ${name}: ${spec.spec} from ${spec.from}`,
        );
        return;
      }
      // Gather all consumers sharing this exact spec string (mirror line 414-417 pattern)
      const consumers = activeSpecs
        .filter((s) => s.spec === spec.spec)
        .map((s) => s.from);
      nested.push({
        name,
        version: spec.spec,
        consumers,
        ...(cooldown ? { exempt: specExempt(spec.spec) } : {}),
      });
      alreadyNested.add(spec.spec);
    }

    if (directExact) {
      // Direct exact version always wins
      chosenVersion = directExact.spec;
    } else if (directSpecs.length > 0) {
      // Direct range/tag — use it
      chosenVersion = directSpecs[0].spec;
    } else {
      // No direct specs — check for conflicts among transitive deps
      const exactVersions = activeSpecs
        .filter((s) => semver.valid(s.spec) !== null)
        .map((s) => s.spec);
      const uniqueExact = [...new Set(exactVersions)];

      if (uniqueExact.length > 1) {
        // Site A: multiple exact versions — highest wins, losers get nested
        const sorted = [...uniqueExact].sort(semver.rcompare);
        chosenVersion = sorted[0];
        for (let i = 1; i < sorted.length; i++) {
          const loserVersion = sorted[i];
          const consumers = activeSpecs
            .filter((s) => s.spec === loserVersion)
            .map((s) => s.from);
          nested.push({
            name,
            version: loserVersion,
            consumers,
            ...(cooldown ? { exempt: specExempt(loserVersion) } : {}),
          });
          alreadyNested.add(loserVersion);
        }
      } else if (uniqueExact.length === 1) {
        chosenVersion = uniqueExact[0];
      } else {
        // All ranges/tags — use the highest-priority spec as-is
        chosenVersion = activeSpecs[0].spec;
      }
    }

    // Resolve chosenVersion to a concrete version we can validate against.
    // If chosen is already exact, use it directly. If it's a range/tag, ask pacote
    // what concrete version it would actually install.
    let concreteVersion: string;
    if (semver.valid(chosenVersion)) {
      concreteVersion = chosenVersion;
    } else {
      const askedBy = specs
        .filter((s) => s.spec === chosenVersion)
        .map((s) => s.from)
        .join(', ');
      try {
        const exempt = specExempt(chosenVersion);
        const manifest = await manifestWithResilience(
          `${name}@${chosenVersion}`,
          cooldownOptions(npmConfig, cooldown, exempt),
          logger,
        );
        if (cooldown && !exempt) {
          assertPublishedBefore(manifest, cooldown, askedBy);
        }
        concreteVersion = manifest.version;
      } catch (err) {
        if (cooldown) {
          throw cooldownFailure(name, chosenVersion, askedBy, cooldown, err);
        }
        if (process.env.BUNDLER_STRICT_RANGES === '0') {
          logger.warn(
            `Could not resolve ${name}@${chosenVersion} for strict validation: ${err instanceof Error ? err.message : String(err)}. Skipping range validation (BUNDLER_STRICT_RANGES=0).`,
          );
          topLevel.set(name, { name, version: chosenVersion });
          continue;
        }
        throw new Error(
          `Failed to resolve ${name}@${chosenVersion} for range conflict validation. ` +
            `Set BUNDLER_STRICT_RANGES=0 to bypass with a warning. ` +
            `Original error: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    // Validate every spec against the concrete version. Non-satisfying specs get nested.
    for (const spec of specs) {
      if (spec.localPath) continue;
      if (spec.spec === chosenVersion) continue; // identical strings can't conflict

      const satisfied = semver.valid(spec.spec)
        ? spec.spec === concreteVersion
        : semver.validRange(spec.spec)
          ? semver.satisfies(concreteVersion, spec.spec, {
              includePrerelease: true,
            })
          : true; // non-semver (git, file:, tag) — let pacote handle, don't nest blindly

      if (satisfied) continue;

      if (spec.source === 'peerDependency') {
        logger.warn(
          `${name}@${concreteVersion} does not satisfy peer constraint ${spec.spec} (from ${spec.from})`,
        );
      } else {
        nestLoser(spec, alreadyNested);
      }
    }

    topLevel.set(name, {
      name,
      version: chosenVersion,
      ...(cooldown ? { exempt: specExempt(chosenVersion) } : {}),
    });
  }

  // Consolidate nested entries with same name+version (merge consumers)
  const consolidatedMap = new Map<string, NestedPackage>();
  for (const entry of nested) {
    const key = `${entry.name}@${entry.version}`;
    const existing = consolidatedMap.get(key);
    if (existing) {
      for (const c of entry.consumers) {
        if (!existing.consumers.includes(c)) existing.consumers.push(c);
      }
      if (existing.exempt !== undefined) {
        existing.exempt = existing.exempt && entry.exempt === true;
      }
    } else {
      consolidatedMap.set(key, { ...entry, consumers: [...entry.consumers] });
    }
  }

  return { topLevel, nested: [...consolidatedMap.values()] };
}

// ============================================================
// Phase 3: Install resolved packages
// ============================================================

export interface DownloadResult {
  packagePaths: Map<string, string>;
  resolution: ResolutionResult;
  /** Under a cooldown: the tree exactly as installed. */
  tree?: PackageTree;
}

export async function downloadPackagesWithResolution(
  packages: Package[],
  targetDir: string,
  logger: Logger.Instance,
  useCache = true,
  configDir?: string,
  tmpDir?: string,
  overrides: Record<string, string> = {},
  npmConfig: NpmConfig = PACOTE_OPTS,
  cooldown?: Cooldown,
): Promise<DownloadResult> {
  return downloadPackagesImpl(
    packages,
    targetDir,
    logger,
    useCache,
    configDir,
    tmpDir,
    overrides,
    npmConfig,
    cooldown,
  );
}

/**
 * Shared body for `downloadPackagesWithResolution`. Returns both the
 * installed package paths and the underlying ResolutionResult.
 */
async function downloadPackagesImpl(
  packages: Package[],
  targetDir: string,
  logger: Logger.Instance,
  useCache: boolean,
  configDir: string | undefined,
  tmpDir: string | undefined,
  overrides: Record<string, string>,
  npmConfig: NpmConfig,
  cooldown?: Cooldown,
): Promise<DownloadResult> {
  const packagePaths = new Map<string, string>();

  // Track user-specified packages (only these are logged)
  const userSpecifiedPackages = new Set(packages.map((p) => p.name));

  // Validate no duplicate packages with different versions in direct list
  validateNoDuplicatePackages(packages);

  // Phase 1: Collect all version specs
  logger.debug('Resolving dependencies');
  const allSpecs = await collectAllSpecs(
    packages,
    logger,
    configDir,
    overrides,
    npmConfig,
    cooldown,
  );

  // Phase 2: Resolve conflicts
  const resolution = await resolveVersionConflicts(
    allSpecs,
    logger,
    npmConfig,
    cooldown,
  );
  const { topLevel, nested } = resolution;

  // Phase 3: Install each resolved package exactly once
  await fs.ensureDir(targetDir);

  if (cooldown) {
    const tree = await installResolvedTree(
      packages,
      resolution,
      targetDir,
      logger,
      { npmConfig, cooldown, tmpDir },
    );
    for (const name of topLevel.keys()) {
      packagePaths.set(name, getPackageDirectory(targetDir, name));
    }
    return { packagePaths, resolution, tree };
  }

  // Track local package paths (to redirect transitive refs to local copies)
  const localPackageMap = new Map<string, string>();
  for (const pkg of packages) {
    if (pkg.path) localPackageMap.set(pkg.name, pkg.path);
  }

  for (const [name, pkg] of topLevel) {
    // Handle local packages
    if (pkg.localPath || localPackageMap.has(name)) {
      const localPath = pkg.localPath || localPackageMap.get(name)!;
      const localPkg = await resolveLocalPackage(
        name,
        localPath,
        configDir || process.cwd(),
        logger,
      );
      const installedPath = await copyLocalPackage(localPkg, targetDir, logger);
      packagePaths.set(name, installedPath);
      continue;
    }

    const packageSpec = `${name}@${pkg.version}`;
    const packageDir = getPackageDirectory(targetDir, name);
    const cachedPath = await getCachedPackagePath(
      { name, version: pkg.version },
      tmpDir,
    );

    if (
      useCache &&
      (await isPackageCached({ name, version: pkg.version }, tmpDir))
    ) {
      if (userSpecifiedPackages.has(name)) {
        logger.debug(`Downloading ${packageSpec} (cached)`);
      }
      try {
        await fs.ensureDir(path.dirname(packageDir));
        await readCacheDir(cachedPath, packageDir);
        packagePaths.set(name, packageDir);
        continue;
      } catch {
        logger.debug(`Cache miss for ${packageSpec}, downloading fresh`);
      }
    }

    try {
      await fs.ensureDir(path.dirname(packageDir));
      const cacheDir =
        process.env.NPM_CACHE_DIR || getTmpPath(tmpDir, 'cache', 'npm');
      // Retrying into the same dir is safe: pacote empties `dest` before each
      // extract, so no redundant pre-clean is needed here.
      await extractWithResilience(
        packageSpec,
        packageDir,
        { ...npmConfig, cache: cacheDir },
        logger,
      );

      if (userSpecifiedPackages.has(name)) {
        logger.debug(`Downloading ${packageSpec}`);
      }

      // Cache for future use
      if (useCache) {
        await writeCacheDir(packageDir, cachedPath, logger, {
          label: packageSpec,
        });
      }

      packagePaths.set(name, packageDir);
    } catch (error) {
      throw new Error(`Failed to download ${packageSpec}: ${error}`);
    }
  }

  // Install nested packages
  for (const nestedPkg of nested) {
    let resolvedSpec = `${nestedPkg.name}@${nestedPkg.version}`;

    if (!semver.valid(nestedPkg.version)) {
      try {
        const manifest = await manifestWithResilience(
          resolvedSpec,
          npmConfig,
          logger,
        );
        resolvedSpec = `${nestedPkg.name}@${manifest.version}`;
      } catch (error) {
        throw new Error(
          `Failed to resolve nested dependency ${resolvedSpec}: ${error}`,
        );
      }
    }

    for (const consumer of nestedPkg.consumers) {
      const nestedDir = getNestedPackageDirectory(
        targetDir,
        consumer,
        nestedPkg.name,
      );
      try {
        await fs.ensureDir(path.dirname(nestedDir));
        const cacheDir =
          process.env.NPM_CACHE_DIR || getTmpPath(tmpDir, 'cache', 'npm');
        await extractWithResilience(
          resolvedSpec,
          nestedDir,
          { ...npmConfig, cache: cacheDir },
          logger,
        );
        logger.debug(`Nested: ${resolvedSpec} under ${consumer}`);
      } catch (error) {
        throw new Error(
          `Failed to install nested ${resolvedSpec} for ${consumer}: ${error}`,
        );
      }
    }
  }

  return { packagePaths, resolution };
}

// ============================================================
// Recorded trees: install under a cooldown and record, or install exactly
// ============================================================

interface TreeInstallContext {
  npmConfig: NpmConfig;
  tmpDir?: string;
}

function npmCacheDir(tmpDir: string | undefined): string {
  return process.env.NPM_CACHE_DIR || getTmpPath(tmpDir, 'cache', 'npm');
}

/** The sha512 value inside an integrity string, or null. */
function sha512Of(integrity: string | undefined): string | null {
  return (
    integrity?.split(/\s+/).find((value) => value.startsWith('sha512-')) ?? null
  );
}

interface InstalledManifest {
  name?: string;
  version?: string;
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  peerDependenciesMeta?: Record<string, { optional?: boolean }>;
}

async function readInstalledManifest(dir: string): Promise<InstalledManifest> {
  const manifest: InstalledManifest = await fs.readJson(
    path.join(dir, 'package.json'),
  );
  return manifest;
}

/**
 * Resolve-mode install: every top-level and nested package is picked once
 * under the cutoff (unless exempt), then extracted from the picked tarball
 * URL with the registry's integrity, so nothing is picked a second time. The
 * entry records what was extracted: the tarball URL, the sha512 of the bytes
 * (computed when the registry offers no sha512) and the edges the installed
 * `package.json` declares.
 */
async function installResolvedTree(
  packages: Package[],
  resolution: ResolutionResult,
  targetDir: string,
  logger: Logger.Instance,
  context: TreeInstallContext & { cooldown: Cooldown },
): Promise<PackageTree> {
  const { npmConfig, cooldown, tmpDir } = context;
  const cacheDir = npmCacheDir(tmpDir);
  const entries: PackageTree['packages'] = {};

  const install = async (
    installName: string,
    spec: string,
    exempt: boolean,
    installPath: string,
  ): Promise<void> => {
    let picked: pacote.AbbreviatedManifest & pacote.ManifestResult;
    try {
      picked = await manifestWithResilience(
        `${installName}@${spec}`,
        cooldownOptions(npmConfig, cooldown, exempt),
        logger,
      );
      if (!exempt) assertPublishedBefore(picked, cooldown, installPath);
    } catch (error) {
      throw cooldownFailure(installName, spec, installPath, cooldown, error);
    }
    if (aliasCrossesExemption(installName, picked.name, cooldown.exempt)) {
      throw new PackageTreeError([
        `${installPath}: ${installName} holds ${picked.name}, across an exempt prefix`,
      ]);
    }
    const resolved = picked._resolved;
    const registryIntegrity = picked._integrity || undefined;
    const dir = path.join(targetDir, installPath);
    await fs.ensureDir(path.dirname(dir));
    const result = await extractWithResilience(
      resolved,
      dir,
      {
        ...npmConfig,
        cache: cacheDir,
        ...(registryIntegrity ? { integrity: registryIntegrity } : {}),
      },
      logger,
    );
    let integrity = sha512Of(result.integrity) ?? sha512Of(registryIntegrity);
    if (integrity === null) {
      // An old publish carries only a sha1: hash the very bytes, verified
      // against that sha1, so every recorded entry can be checked later.
      const bytes = await tarballWithResilience(resolved, {
        ...npmConfig,
        cache: cacheDir,
        ...(registryIntegrity ? { integrity: registryIntegrity } : {}),
      });
      integrity = `sha512-${createHash('sha512').update(bytes).digest('base64')}`;
    }
    const edges = followedEdges(await readInstalledManifest(dir));
    entries[installPath] = {
      name: picked.name,
      version: picked.version,
      resolved,
      integrity,
      ...(Object.keys(edges).length > 0 ? { dependencies: edges } : {}),
    };
    logger.debug(
      `Installed ${picked.name}@${picked.version} at ${installPath}`,
    );
  };

  for (const [name, pkg] of resolution.topLevel) {
    if (pkg.localPath) {
      throw new PackageTreeError([
        `${name}: a local package cannot be part of a recorded tree`,
      ]);
    }
    await install(
      name,
      pkg.version,
      pkg.exempt === true,
      `node_modules/${name}`,
    );
  }
  for (const nestedPkg of resolution.nested) {
    for (const consumer of nestedPkg.consumers) {
      await install(
        nestedPkg.name,
        nestedPkg.version,
        nestedPkg.exempt === true,
        `node_modules/${consumer}/node_modules/${nestedPkg.name}`,
      );
    }
  }

  const tree: PackageTree = {
    version: PACKAGE_TREE_VERSION,
    registry: npmConfig.registry,
    before: cooldown.before.toISOString(),
    packages: entries,
  };
  // The tree this build reports must pass the check every reader runs.
  return assertPackageTree(tree, {
    registry: npmConfig.registry,
    scopeRegistries: scopeRegistriesOf(npmConfig),
    declared: Object.fromEntries(
      packages.map((pkg) => [pkg.name, pkg.version]),
    ),
    exempt: cooldown.exempt,
  });
}

/**
 * Tree-mode install: exactly the recorded tree, and nothing else. The tree is
 * checked before any fetch; each entry is extracted from its recorded tarball
 * URL against its recorded sha512, so no packument and no manifest is read and
 * nothing is resolved. A tarball the registry no longer serves, or serves with
 * other bytes, is `PackageUnavailableError`. After the install every edge the
 * installed packages' own `package.json` declares must find its package in
 * the tree; one that does not is `PackageTreeError`, never a resolve.
 */
export async function installPackageTree(
  tree: PackageTree,
  targetDir: string,
  logger: Logger.Instance,
  context: TreeInstallContext & { declared: Record<string, string> },
): Promise<Map<string, string>> {
  const { npmConfig, tmpDir, declared } = context;
  const checked = assertPackageTree(tree, {
    registry: npmConfig.registry,
    scopeRegistries: scopeRegistriesOf(npmConfig),
    declared,
  });
  const cacheDir = npmCacheDir(tmpDir);
  // Roots first: extracting a package empties its directory, nested ones too.
  const ordered = Object.entries(checked.packages).sort(
    ([a], [b]) =>
      a.split('/').length - b.split('/').length || a.localeCompare(b),
  );

  for (const [installPath, entry] of ordered) {
    const dir = path.join(targetDir, installPath);
    await fs.ensureDir(path.dirname(dir));
    try {
      await extractWithResilience(
        entry.resolved,
        dir,
        { ...npmConfig, cache: cacheDir, integrity: entry.integrity },
        logger,
      );
    } catch (error) {
      const code = readErrorCode(error);
      if (code === undefined || !UNAVAILABLE_CODES.has(code)) throw error;
      const found = Reflect.get(Object(error), 'found');
      const reason =
        code === 'EINTEGRITY'
          ? `integrity ${entry.integrity} recorded, ${found === undefined ? 'other bytes' : String(found)} received`
          : 'the registry does not serve it';
      throw new PackageUnavailableError(installPath, entry, reason);
    }
  }

  const problems: string[] = [];
  const packagePaths = new Map<string, string>();
  for (const [installPath, entry] of ordered) {
    const dir = path.join(targetDir, installPath);
    const installed = await readInstalledManifest(dir);
    if (installed.name !== entry.name || installed.version !== entry.version) {
      problems.push(
        `${installPath}: holds ${installed.name}@${installed.version}, recorded ${entry.name}@${entry.version}`,
      );
    }
    for (const [dep, spec] of Object.entries(followedEdges(installed))) {
      const target = edgeTargetName(dep, spec);
      const found = lookupPaths(installPath, dep).find(
        (candidate) => checked.packages[candidate] !== undefined,
      );
      if (
        target === null ||
        !found ||
        checked.packages[found].name !== target
      ) {
        problems.push(
          `${installPath}: dependency ${dep}@${spec} has no ${target ?? dep} in the tree`,
        );
      }
    }
    const at = parseInstallPath(installPath);
    if (at && at.consumer === undefined) packagePaths.set(at.name, dir);
  }
  if (problems.length > 0) throw new PackageTreeError(problems);
  logger.debug(`Installed ${ordered.length} packages from the recorded tree`);
  return packagePaths;
}

// ============================================================
// Helpers
// ============================================================

async function getCachedPackagePath(
  pkg: { name: string; version: string },
  tmpDir?: string,
): Promise<string> {
  const cacheDir = getTmpPath(tmpDir, 'cache', 'packages');
  const cacheKey = await getPackageCacheKey(pkg.name, pkg.version);
  return path.join(cacheDir, cacheKey);
}

async function isPackageCached(
  pkg: { name: string; version: string },
  tmpDir?: string,
): Promise<boolean> {
  const cachedPath = await getCachedPackagePath(pkg, tmpDir);
  // Entries without the completion marker (cut short, or written before the
  // marker existed) are misses, so a truncated entry heals on the next build.
  return isCacheDirComplete(cachedPath);
}

function validateNoDuplicatePackages(packages: Package[]): void {
  const packageMap = new Map<string, string[]>();
  for (const pkg of packages) {
    if (!packageMap.has(pkg.name)) packageMap.set(pkg.name, []);
    packageMap.get(pkg.name)!.push(pkg.version);
  }

  const conflicts: string[] = [];
  for (const [name, versions] of packageMap.entries()) {
    const uniqueVersions = [...new Set(versions)];
    if (uniqueVersions.length > 1) {
      conflicts.push(`${name}: [${uniqueVersions.join(', ')}]`);
    }
  }

  if (conflicts.length > 0) {
    throw new Error(
      `Version conflicts detected:\n${conflicts.map((c) => `  - ${c}`).join('\n')}\n\n` +
        'Each package must use the same version across all declarations. ' +
        'Please update your configuration to use consistent versions.',
    );
  }
}
