import pacote from 'pacote';
import path from 'path';
import fs from 'fs-extra';
import semver from 'semver';
import { resolveLocalPackage, copyLocalPackage } from '../../core/index.js';
import type { Logger } from '@walkeros/core';
import { getPackageCacheKey } from '../../core/cache-utils.js';
import { getTmpPath } from '../../core/tmp.js';

const PACKAGE_DOWNLOAD_TIMEOUT_MS = 60000;
const PACOTE_OPTS = {
  registry: 'https://registry.npmjs.org',
  preferOnline: true,
  where: undefined,
};

async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  errorMessage: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(errorMessage)), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer!);
  }
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
}

interface ResolvedPackage {
  name: string;
  version: string;
  localPath?: string;
}

export interface NestedPackage {
  name: string;
  version: string;
  consumers: string[];
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
  }

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

  // Helper: substitute a transitive dep spec with its override (if any)
  const substituteDep = (
    depName: string,
    depSpec: string,
    source: 'dependency' | 'peerDependency',
    from: string,
    optional: boolean,
  ): QueueItem => {
    const overrideSpec = overrides[depName];
    if (overrideSpec) {
      return {
        name: depName,
        spec: overrideSpec,
        source: 'override',
        from: `override (was ${depSpec} from ${from})`,
        optional,
      };
    }
    return { name: depName, spec: depSpec, source, from, optional };
  };

  const queue: QueueItem[] = packages.map((pkg) => ({
    name: pkg.name,
    spec: pkg.version,
    source: 'direct' as const,
    from: 'flow.json',
    optional: false,
    localPath: pkg.path,
  }));

  while (queue.length > 0) {
    const item = queue.shift()!;
    const visitKey = `${item.name}@${item.spec}`;
    if (visited.has(visitKey)) continue;
    visited.add(visitKey);

    // Record this spec
    if (!allSpecs.has(item.name)) allSpecs.set(item.name, []);
    allSpecs.get(item.name)!.push({
      spec: item.spec,
      source: item.source,
      from: item.from,
      optional: item.optional,
      localPath: item.localPath,
    });

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
          const pkgJson = await fs.readJson(candidatePath);

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
              const isOptional =
                (peerMeta as Record<string, { optional?: boolean }>)[depName]
                  ?.optional === true;
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

    // Fetch manifest from registry
    let manifest: pacote.ManifestResult;
    try {
      manifest = await withTimeout(
        pacote.manifest(`${item.name}@${item.spec}`, PACOTE_OPTS),
        PACKAGE_DOWNLOAD_TIMEOUT_MS,
        `Manifest fetch timed out: ${item.name}@${item.spec}`,
      );
    } catch (error) {
      logger.debug(
        `Failed to fetch manifest for ${item.name}@${item.spec}: ${error}`,
      );
      continue;
    }

    // Queue regular dependencies
    const m = manifest as unknown as Record<string, unknown>;
    const deps = (m.dependencies as Record<string, string> | undefined) || {};
    for (const [depName, depSpec] of Object.entries(deps)) {
      if (typeof depSpec === 'string') {
        queue.push(
          substituteDep(depName, depSpec, 'dependency', item.name, false),
        );
      }
    }

    // Queue peerDependencies with metadata
    const peerDeps =
      (m.peerDependencies as Record<string, string> | undefined) || {};
    const peerMeta =
      (m.peerDependenciesMeta as
        | Record<string, { optional?: boolean }>
        | undefined) || {};
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
  }

  return allSpecs;
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

export function resolveVersionConflicts(
  allSpecs: Map<string, VersionSpec[]>,
  logger: Logger.Instance,
): ResolutionResult {
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
          nested.push({ name, version: loserVersion, consumers });
          alreadyNested.add(loserVersion);
        }
      } else if (uniqueExact.length === 1) {
        chosenVersion = uniqueExact[0];
      } else {
        // All ranges/tags — use the highest-priority spec as-is
        chosenVersion = activeSpecs[0].spec;
      }
    }

    // Validate against ALL specs (including peerDeps)
    if (semver.valid(chosenVersion)) {
      for (const spec of specs) {
        if (spec.localPath) continue;
        if (semver.valid(spec.spec)) {
          // Both exact — must match
          if (spec.spec !== chosenVersion) {
            if (spec.source === 'peerDependency') {
              logger.warn(
                `${name}@${chosenVersion} differs from peer constraint ${spec.spec} (from ${spec.from})`,
              );
            } else if (!alreadyNested.has(spec.spec)) {
              // Site C: transitive exact differs from chosen — nest it
              nested.push({ name, version: spec.spec, consumers: [spec.from] });
              alreadyNested.add(spec.spec);
            }
          }
        } else {
          // Chosen is exact, spec is range — check satisfaction
          if (
            !semver.satisfies(chosenVersion, spec.spec, {
              includePrerelease: true,
            })
          ) {
            if (spec.source === 'peerDependency') {
              logger.warn(
                `${name}@${chosenVersion} may not satisfy peer constraint ${spec.spec} (from ${spec.from})`,
              );
            } else {
              // Site B: range not satisfied — nest the range
              nested.push({ name, version: spec.spec, consumers: [spec.from] });
            }
          }
        }
      }
    }

    topLevel.set(name, { name, version: chosenVersion });
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
    } else {
      consolidatedMap.set(key, { ...entry, consumers: [...entry.consumers] });
    }
  }

  return { topLevel, nested: [...consolidatedMap.values()] };
}

// ============================================================
// Phase 3: Install resolved packages
// ============================================================

export async function downloadPackages(
  packages: Package[],
  targetDir: string,
  logger: Logger.Instance,
  useCache = true,
  configDir?: string,
  tmpDir?: string,
  overrides: Record<string, string> = {},
): Promise<Map<string, string>> {
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
  );

  // Phase 2: Resolve conflicts
  const { topLevel, nested } = resolveVersionConflicts(allSpecs, logger);

  // Phase 3: Install each resolved package exactly once
  await fs.ensureDir(targetDir);

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
        await fs.copy(cachedPath, packageDir);
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
      await withTimeout(
        pacote.extract(packageSpec, packageDir, {
          ...PACOTE_OPTS,
          cache: cacheDir,
        }),
        PACKAGE_DOWNLOAD_TIMEOUT_MS,
        `Package download timed out after ${PACKAGE_DOWNLOAD_TIMEOUT_MS / 1000}s: ${packageSpec}`,
      );

      if (userSpecifiedPackages.has(name)) {
        logger.debug(`Downloading ${packageSpec}`);
      }

      // Cache for future use
      if (useCache) {
        try {
          await fs.ensureDir(path.dirname(cachedPath));
          await fs.copy(packageDir, cachedPath);
        } catch {
          // Silent cache failures
        }
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
        const manifest = await withTimeout(
          pacote.manifest(resolvedSpec, PACOTE_OPTS),
          PACKAGE_DOWNLOAD_TIMEOUT_MS,
          `Manifest fetch timed out: ${resolvedSpec}`,
        );
        const resolved = (manifest as unknown as { version: string }).version;
        resolvedSpec = `${nestedPkg.name}@${resolved}`;
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
        await withTimeout(
          pacote.extract(resolvedSpec, nestedDir, {
            ...PACOTE_OPTS,
            cache: cacheDir,
          }),
          PACKAGE_DOWNLOAD_TIMEOUT_MS,
          `Nested package download timed out: ${resolvedSpec}`,
        );
        logger.debug(`Nested: ${resolvedSpec} under ${consumer}`);
      } catch (error) {
        throw new Error(
          `Failed to install nested ${resolvedSpec} for ${consumer}: ${error}`,
        );
      }
    }
  }

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
  return fs.pathExists(cachedPath);
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
