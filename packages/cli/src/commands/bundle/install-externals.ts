import path from 'path';
import fs from 'fs-extra';
import pacote from 'pacote';
import pLimit from 'p-limit';
import type { Logger } from '@walkeros/core';
import {
  PACOTE_OPTS,
  PACKAGE_DOWNLOAD_TIMEOUT_MS,
  withTimeout,
  collectAllSpecs,
  resolveVersionConflicts,
  assertNoPostinstallScripts,
  type ResolutionResult,
  type NpmConfig,
  type Package,
} from './package-manager.js';
import { getTmpPath } from '../../core/tmp.js';

const MANIFEST_PARALLELISM = 8;
const RETRY_ATTEMPTS = 2;

export interface InstalledExternal {
  name: string;
  version: string;
}

export interface InstallPlan {
  installed: InstalledExternal[];
}

export interface InstallExternalsArgs {
  externals: Set<string>;
  /**
   * Pre-extracted packages from `downloadPackages`, used as an alternative copy
   * source if `tempNodeModules` isn't passed. FL-2: avoid double extraction.
   */
  packagePaths: Map<string, string>;
  /**
   * Resolution graph from `downloadPackagesWithResolution`. Used to seed
   * `collectAllSpecs` with pinned versions so the install closure picks the
   * same versions as the build cache. Optional — falls back to `'latest'` per
   * external when omitted.
   */
  resolution?: ResolutionResult;
  outputDir: string;
  logger: Logger.Instance;
  tmpDir?: string;
  npmConfig?: NpmConfig;
  /**
   * Source for `fs.copy` reuse: `<tempDir>/node_modules`. When a directory
   * exists at `<tempNodeModules>/<name>`, the package is copied from there
   * and pacote.extract is skipped entirely. When omitted, every package
   * is extracted fresh from the registry.
   */
  tempNodeModules?: string;
}

interface InstallClosure {
  versions: Map<string, string>; // name → resolved version
  manifests: Map<string, { scripts?: Record<string, string> }>;
}

/**
 * Extract each declared external plus its full transitive dependency tree
 * (walked via `collectAllSpecs` + `resolveVersionConflicts` so peerDependencies,
 * optional peers, and overrides are honored consistently with `downloadPackages`)
 * into `<outputDir>/node_modules/<name>/` using pacote directly. No shell-out
 * to `npm install`, no postinstall scripts.
 *
 * Atomicity contract:
 *   1. Each package extracts to `<outputDir>/node_modules/.staging/<name>`,
 *      then is moved to `<outputDir>/node_modules/<name>` on success.
 *   2. If any extract fails, the whole `<outputDir>/node_modules/` tree is
 *      removed before re-throwing — a half-installed tree must NOT be visible
 *      to the deploy step.
 *
 * No-op when `externals` is empty (returns `InstallPlan` with empty `installed`).
 */
export async function installExternalsViaPacote(
  args: InstallExternalsArgs,
): Promise<InstallPlan> {
  const {
    externals,
    packagePaths,
    resolution,
    outputDir,
    logger,
    tmpDir,
    npmConfig,
    tempNodeModules,
  } = args;

  if (externals.size === 0) {
    logger.debug('No externals to install');
    return { installed: [] };
  }

  // Build the install closure by reusing collectAllSpecs / resolveVersionConflicts.
  const closure = await computeInstallClosure(
    externals,
    resolution,
    logger,
    npmConfig,
  );

  // Hard-error before any extraction if any package declares lifecycle scripts.
  // The closure includes the manifests we fetched.
  assertNoPostinstallScripts(closure.manifests);

  const cacheDir =
    process.env.NPM_CACHE_DIR || getTmpPath(tmpDir, 'cache', 'npm');
  const targetNodeModules = path.join(outputDir, 'node_modules');
  const stagingRoot = path.join(targetNodeModules, '.staging');
  await fs.ensureDir(stagingRoot);

  const installed: InstalledExternal[] = [];

  // Use Promise.allSettled (not Promise.all) so a sibling job can't fs.move
  // into <outputDir>/node_modules/<name> AFTER the rollback finished and
  // leak files into the deploy artifact. We wait for every in-flight job
  // to settle, then rollback once if any rejected.
  const limit = pLimit(MANIFEST_PARALLELISM);
  const results = await Promise.allSettled(
    [...closure.versions.entries()].map(([name, version]) =>
      limit(async () => {
        // Reuse pre-extracted package from tempNodeModules when present
        // (FL-2: avoid double extraction). If absent, fall back to the
        // packagePaths map (also from a prior download).
        const reuseFrom = tempNodeModules
          ? path.join(tempNodeModules, name)
          : packagePaths.get(name);
        const finalDest = path.join(targetNodeModules, name);
        const stagingDest = path.join(stagingRoot, encodeURIComponent(name));

        if (reuseFrom && (await fs.pathExists(reuseFrom))) {
          await fs.ensureDir(path.dirname(finalDest));
          await fs.copy(reuseFrom, finalDest);
          installed.push({ name, version });
          logger.debug(`Reused external from cache: ${name}@${version}`);
          return;
        }

        // Fallback: extract via pacote into staging, then move atomically.
        const spec = `${name}@${version}`;
        await retry(
          () =>
            withTimeout(
              pacote.extract(spec, stagingDest, {
                ...(npmConfig ?? PACOTE_OPTS),
                cache: cacheDir,
              }),
              PACKAGE_DOWNLOAD_TIMEOUT_MS,
              `Bundle install timed out: ${spec}`,
            ),
          RETRY_ATTEMPTS,
          (err) =>
            `Failed to install external ${spec}. ${err}. ` +
            'Check network connectivity, registry reachability ' +
            '(`npm config get registry`), and that the package version exists. ' +
            'If persistent, file an issue with the bundler logs.',
        );
        await fs.ensureDir(path.dirname(finalDest));
        await fs.move(stagingDest, finalDest, { overwrite: true });
        installed.push({ name, version });
        logger.debug(`Installed external: ${spec}`);
      }),
    ),
  );

  const firstRejection = results.find((r) => r.status === 'rejected');
  if (firstRejection) {
    // Bundle-level rollback: remove the partial node_modules tree entirely.
    // All in-flight jobs have settled by now, so no later fs.move can race
    // ahead and leak into the deploy artifact.
    logger.warn('Install failed, cleaning up partial node_modules');
    await fs.remove(targetNodeModules);
    // PromiseRejectedResult.reason is unknown by TS but always present here.
    throw (firstRejection as PromiseRejectedResult).reason;
  }

  // Cleanup staging only on full success.
  await fs.remove(stagingRoot);

  logger.info(
    `Installed ${installed.length} external(s) into ${targetNodeModules}`,
  );
  return { installed };
}

async function computeInstallClosure(
  externals: Set<string>,
  resolution: ResolutionResult | undefined,
  logger: Logger.Instance,
  npmConfig: NpmConfig | undefined,
): Promise<InstallClosure> {
  // Treat the externals set as direct package input for collectAllSpecs.
  // For each external, derive its starting spec from the resolution graph
  // (preferred) or `'latest'` as fallback.
  const seedPackages: Package[] = [];
  for (const name of externals) {
    const top = resolution?.topLevel.get(name);
    if (top?.version && top.version !== 'local') {
      seedPackages.push({ name, version: top.version });
    } else {
      seedPackages.push({ name, version: 'latest' });
    }
  }

  const allSpecs = await collectAllSpecs(
    seedPackages,
    logger,
    undefined,
    {},
    npmConfig,
  );
  const { topLevel } = resolveVersionConflicts(allSpecs, logger);

  const versions = new Map<string, string>();
  for (const [name, pkg] of topLevel) {
    if (pkg.version === 'local') continue; // local packages are never installed
    versions.set(name, pkg.version);
  }

  // Fetch one manifest per resolved package to feed assertNoPostinstallScripts.
  const limit = pLimit(MANIFEST_PARALLELISM);
  const manifests = new Map<string, { scripts?: Record<string, string> }>();
  await Promise.all(
    [...versions.entries()].map(([name, version]) =>
      limit(async () => {
        const m = await retry(
          () =>
            withTimeout(
              pacote.manifest(`${name}@${version}`, npmConfig ?? PACOTE_OPTS),
              PACKAGE_DOWNLOAD_TIMEOUT_MS,
              `Manifest fetch timed out: ${name}@${version}`,
            ),
          RETRY_ATTEMPTS,
          (err) => `Failed to fetch manifest for ${name}@${version}: ${err}`,
        );
        const scripts = (m as { scripts?: Record<string, string> }).scripts;
        manifests.set(name, { scripts });
      }),
    ),
  );

  return { versions, manifests };
}

async function retry<T>(
  fn: () => Promise<T>,
  attempts: number,
  errorFormatter: (err: unknown) => string,
): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i <= attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (i < attempts) {
        // Exponential backoff: 250ms, 500ms.
        await new Promise((r) => setTimeout(r, 250 * 2 ** i));
      }
    }
  }
  throw new Error(errorFormatter(lastErr));
}
