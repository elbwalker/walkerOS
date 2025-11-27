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
 */
export async function copyLocalPackage(
  localPkg: LocalPackageInfo,
  targetDir: string,
  logger: Logger,
): Promise<string> {
  const packageDir = path.join(targetDir, 'node_modules', localPkg.name);

  await fs.ensureDir(path.dirname(packageDir));

  // Copy dist folder contents (or package root if no dist)
  await fs.copy(localPkg.distPath, packageDir);

  // Always copy package.json for module resolution
  await fs.copy(
    path.join(localPkg.absolutePath, 'package.json'),
    path.join(packageDir, 'package.json'),
  );

  logger.info(`📦 Using local: ${localPkg.name} from ${localPkg.absolutePath}`);

  return packageDir;
}
