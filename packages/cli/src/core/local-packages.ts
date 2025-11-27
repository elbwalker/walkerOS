import path from 'path';
import fs from 'fs-extra';
import type { Logger } from './logger.js';

export interface LocalPackageInfo {
  name: string;
  absolutePath: string;
  distPath: string;
  hasDistFolder: boolean;
}

/**
 * Resolve and validate a local package path
 */
export async function resolveLocalPackage(
  packageName: string,
  localPath: string,
  configDir: string,
  logger: Logger,
): Promise<LocalPackageInfo> {
  // Resolve relative to config file directory
  const absolutePath = path.isAbsolute(localPath)
    ? localPath
    : path.resolve(configDir, localPath);

  // Validate path exists
  if (!(await fs.pathExists(absolutePath))) {
    throw new Error(
      `Local package path not found: ${localPath} (resolved to ${absolutePath})`,
    );
  }

  // Validate package.json exists
  const pkgJsonPath = path.join(absolutePath, 'package.json');
  if (!(await fs.pathExists(pkgJsonPath))) {
    throw new Error(
      `No package.json found at ${absolutePath}. Is this a valid package directory?`,
    );
  }

  // Check for dist folder
  const distPath = path.join(absolutePath, 'dist');
  const hasDistFolder = await fs.pathExists(distPath);

  if (!hasDistFolder) {
    logger.warn(
      `⚠️  ${packageName}: No dist/ folder found. Using package root.`,
    );
  }

  return {
    name: packageName,
    absolutePath,
    distPath: hasDistFolder ? distPath : absolutePath,
    hasDistFolder,
  };
}

/**
 * Copy local package to target node_modules directory
 *
 * Copies package.json and dist/ folder to preserve the package structure
 * expected by module resolution (package.json exports reference ./dist/...)
 */
export async function copyLocalPackage(
  localPkg: LocalPackageInfo,
  targetDir: string,
  logger: Logger,
): Promise<string> {
  const packageDir = path.join(targetDir, 'node_modules', localPkg.name);

  await fs.ensureDir(path.dirname(packageDir));

  // Always copy package.json for module resolution
  await fs.copy(
    path.join(localPkg.absolutePath, 'package.json'),
    path.join(packageDir, 'package.json'),
  );

  // Copy dist folder AS dist folder (preserving structure for exports like ./dist/index.mjs)
  if (localPkg.hasDistFolder) {
    await fs.copy(localPkg.distPath, path.join(packageDir, 'dist'));
  } else {
    // No dist folder - copy package root contents (excluding node_modules, etc.)
    const entries = await fs.readdir(localPkg.absolutePath);
    for (const entry of entries) {
      if (!['node_modules', '.turbo', '.git'].includes(entry)) {
        await fs.copy(
          path.join(localPkg.absolutePath, entry),
          path.join(packageDir, entry),
        );
      }
    }
  }

  logger.info(`📦 Using local: ${localPkg.name} from ${localPkg.absolutePath}`);

  return packageDir;
}
