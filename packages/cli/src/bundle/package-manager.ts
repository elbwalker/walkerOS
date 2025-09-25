import pacote from 'pacote';
import path from 'path';
import fs from 'fs-extra';
import { Logger } from '../core';

export interface Package {
  name: string;
  version: string;
}

function getCachedPackagePath(pkg: Package, tempDir: string): string {
  const cacheDir = path.join('.tmp', 'cache', 'packages');
  const packageName = pkg.name.replace('/', '-');
  return path.join(cacheDir, `${packageName}@${pkg.version}`);
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
    const packageDir = path.join(targetDir, pkg.name.replace('/', '-'));
    const cachedPath = getCachedPackagePath(pkg, targetDir);

    if (useCache && (await isPackageCached(pkg, targetDir))) {
      logger.debug(`Using cached ${packageSpec}...`);
      try {
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
      // Extract package to target directory
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
