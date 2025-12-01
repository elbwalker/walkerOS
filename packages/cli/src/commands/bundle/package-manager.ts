import pacote from 'pacote';
import path from 'path';
import fs from 'fs-extra';
import {
  Logger,
  resolveLocalPackage,
  copyLocalPackage,
} from '../../core/index.js';
import { getPackageCacheKey } from '../../core/cache-utils.js';

export interface Package {
  name: string;
  version: string;
  path?: string; // Local path to package directory
}

/**
 * Gets the proper node_modules directory path for a package.
 * Creates standard npm structure: node_modules/@scope/package or node_modules/package
 * Supports multiple versions by appending version to non-scoped packages if needed.
 *
 * @example
 * getPackageDirectory('node_modules', '@walkeros/core', '0.2.0')
 * // → 'node_modules/@walkeros/core'
 *
 * getPackageDirectory('node_modules', 'lodash', '4.17.21')
 * // → 'node_modules/lodash'
 */
function getPackageDirectory(
  baseDir: string,
  packageName: string,
  version: string,
): string {
  // For scoped packages like @walkeros/core, preserve the scope structure
  // This creates: node_modules/@walkeros/core (standard npm structure)
  return path.join(baseDir, 'node_modules', packageName);
}

async function getCachedPackagePath(
  pkg: Package,
  tempDir: string,
): Promise<string> {
  const cacheDir = path.join('.tmp', 'cache', 'packages');
  const cacheKey = await getPackageCacheKey(pkg.name, pkg.version);
  return path.join(cacheDir, cacheKey);
}

async function isPackageCached(
  pkg: Package,
  tempDir: string,
): Promise<boolean> {
  const cachedPath = await getCachedPackagePath(pkg, tempDir);
  return fs.pathExists(cachedPath);
}

function validateNoDuplicatePackages(packages: Package[]): void {
  const packageMap = new Map<string, string[]>();

  // Group packages by name and collect their versions
  for (const pkg of packages) {
    if (!packageMap.has(pkg.name)) {
      packageMap.set(pkg.name, []);
    }
    packageMap.get(pkg.name)!.push(pkg.version);
  }

  // Check for duplicate packages with different versions
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

/**
 * Recursively resolve and download package dependencies
 */
async function resolveDependencies(
  pkg: Package,
  packageDir: string,
  logger: Logger,
  visited: Set<string> = new Set(),
): Promise<Package[]> {
  const dependencies: Package[] = [];
  const pkgKey = `${pkg.name}@${pkg.version}`;

  if (visited.has(pkgKey)) {
    return dependencies;
  }
  visited.add(pkgKey);

  try {
    const packageJsonPath = path.join(packageDir, 'package.json');
    if (await fs.pathExists(packageJsonPath)) {
      const packageJson = await fs.readJson(packageJsonPath);
      const deps = {
        ...packageJson.dependencies,
        ...packageJson.peerDependencies,
      };

      for (const [name, versionSpec] of Object.entries(deps)) {
        if (typeof versionSpec === 'string') {
          // Use the version spec as-is (pacote will resolve it)
          // This respects the package.json dependency requirements
          dependencies.push({ name, version: versionSpec });
        }
      }
    }
  } catch (error) {
    logger.debug(`Failed to read dependencies for ${pkgKey}: ${error}`);
  }

  return dependencies;
}

export async function downloadPackages(
  packages: Package[],
  targetDir: string,
  logger: Logger,
  useCache = true,
  configDir?: string, // For resolving relative local paths
): Promise<Map<string, string>> {
  const packagePaths = new Map<string, string>();
  const downloadQueue: Package[] = [...packages];
  const processed = new Set<string>();

  // Track packages that should use local paths (to prevent npm overwriting them)
  const localPackageMap = new Map<string, string>();
  for (const pkg of packages) {
    if (pkg.path) {
      localPackageMap.set(pkg.name, pkg.path);
    }
  }

  // Validate no duplicate packages with different versions in initial list
  validateNoDuplicatePackages(packages);

  // Ensure target directory exists
  await fs.ensureDir(targetDir);

  while (downloadQueue.length > 0) {
    const pkg = downloadQueue.shift()!;
    const pkgKey = `${pkg.name}@${pkg.version}`;

    if (processed.has(pkgKey)) {
      continue;
    }
    processed.add(pkgKey);

    // If this package was specified with a local path, use it even if discovered as a dependency
    if (!pkg.path && localPackageMap.has(pkg.name)) {
      pkg.path = localPackageMap.get(pkg.name);
    }

    // Handle local packages first
    if (pkg.path) {
      const localPkg = await resolveLocalPackage(
        pkg.name,
        pkg.path,
        configDir || process.cwd(),
        logger,
      );
      const installedPath = await copyLocalPackage(localPkg, targetDir, logger);
      packagePaths.set(pkg.name, installedPath);

      // Resolve dependencies from local package
      const deps = await resolveDependencies(pkg, installedPath, logger);
      for (const dep of deps) {
        const depKey = `${dep.name}@${dep.version}`;
        if (!processed.has(depKey)) {
          downloadQueue.push(dep);
        }
      }
      continue;
    }

    const packageSpec = `${pkg.name}@${pkg.version}`;
    // Use proper node_modules structure: node_modules/@scope/package
    const packageDir = getPackageDirectory(targetDir, pkg.name, pkg.version);
    const cachedPath = await getCachedPackagePath(pkg, targetDir);

    if (useCache && (await isPackageCached(pkg, targetDir))) {
      logger.debug(`Using cached ${packageSpec}...`);
      try {
        // Ensure parent directories exist for scoped packages (@scope/package)
        await fs.ensureDir(path.dirname(packageDir));
        await fs.copy(cachedPath, packageDir);
        packagePaths.set(pkg.name, packageDir);

        // Resolve and queue dependencies for cached package too
        const deps = await resolveDependencies(pkg, packageDir, logger);
        for (const dep of deps) {
          const depKey = `${dep.name}@${dep.version}`;
          if (!processed.has(depKey)) {
            downloadQueue.push(dep);
          }
        }
        continue;
      } catch (error) {
        logger.debug(
          `Failed to use cache for ${packageSpec}, downloading fresh: ${error}`,
        );
      }
    }

    logger.debug(`Downloading ${packageSpec}...`);

    try {
      // Ensure parent directories exist for scoped packages (@scope/package)
      await fs.ensureDir(path.dirname(packageDir));

      // Extract package to proper node_modules structure
      // Use environment variable for cache location (Docker-friendly)
      const cacheDir =
        process.env.NPM_CACHE_DIR || path.join(process.cwd(), '.npm-cache');
      await pacote.extract(packageSpec, packageDir, {
        // Force npm registry download, prevent workspace resolution
        registry: 'https://registry.npmjs.org',

        // Force online fetching from registry (don't use cached workspace packages)
        preferOnline: true,

        // Cache for performance
        cache: cacheDir,

        // Don't resolve relative to workspace context
        where: undefined,
      });

      // Cache the downloaded package for future use
      if (useCache) {
        try {
          await fs.ensureDir(path.dirname(cachedPath));
          await fs.copy(packageDir, cachedPath);
          logger.debug(`Cached ${packageSpec} for future use`);
        } catch (cacheError) {
          logger.debug(`Failed to cache ${packageSpec}: ${cacheError}`);
        }
      }

      packagePaths.set(pkg.name, packageDir);

      // Resolve and queue dependencies
      const deps = await resolveDependencies(pkg, packageDir, logger);
      for (const dep of deps) {
        const depKey = `${dep.name}@${dep.version}`;
        if (!processed.has(depKey)) {
          downloadQueue.push(dep);
        }
      }
    } catch (error) {
      throw new Error(`Failed to download ${packageSpec}: ${error}`);
    }
  }

  return packagePaths;
}
