import pacote from 'pacote';
import path from 'path';
import fs from 'fs-extra';
import { Logger } from '../core';

export interface Package {
  name: string;
  version: string;
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

function getCachedPackagePath(pkg: Package, tempDir: string): string {
  const cacheDir = path.join('.tmp', 'cache', 'packages');
  // Use safe file system name for cache (replace / with -)
  const safeName = pkg.name.replace(/\//g, '-').replace(/@/g, '');
  return path.join(cacheDir, `${safeName}-${pkg.version}`);
}

async function isPackageCached(
  pkg: Package,
  tempDir: string,
): Promise<boolean> {
  const cachedPath = getCachedPackagePath(pkg, tempDir);
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

export async function downloadPackages(
  packages: Package[],
  targetDir: string,
  logger: Logger,
  useCache = true,
): Promise<Map<string, string>> {
  const packagePaths = new Map<string, string>();

  // Validate no duplicate packages with different versions
  validateNoDuplicatePackages(packages);

  // Ensure target directory exists
  await fs.ensureDir(targetDir);

  for (const pkg of packages) {
    const packageSpec = `${pkg.name}@${pkg.version}`;
    // Use proper node_modules structure: node_modules/@scope/package
    const packageDir = getPackageDirectory(targetDir, pkg.name, pkg.version);
    const cachedPath = getCachedPackagePath(pkg, targetDir);

    if (useCache && (await isPackageCached(pkg, targetDir))) {
      logger.debug(`Using cached ${packageSpec}...`);
      try {
        // Ensure parent directories exist for scoped packages (@scope/package)
        await fs.ensureDir(path.dirname(packageDir));
        await fs.copy(cachedPath, packageDir);
        packagePaths.set(pkg.name, packageDir);
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
      await pacote.extract(packageSpec, packageDir, {
        cache: path.join(process.cwd(), '.npm-cache'),
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
    } catch (error) {
      throw new Error(`Failed to download ${packageSpec}: ${error}`);
    }
  }

  return packagePaths;
}
