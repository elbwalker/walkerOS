import path from 'path';
import fs from 'fs-extra';
import type { Logger } from '@walkeros/core';

export type LocalPackageInfo =
  | { name: string; absolutePath: string; type: 'file' }
  | { name: string; absolutePath: string; type: 'directory' }
  | {
      name: string;
      absolutePath: string;
      type: 'package';
      distPath: string;
      hasDistFolder: boolean;
    };

/**
 * Resolve and validate a local package path.
 *
 * Handles three cases:
 * 1. Single file (with or without extension) → type: 'file'
 * 2. Directory without package.json → type: 'directory'
 * 3. Directory with package.json → type: 'package' (existing behavior)
 */
export async function resolveLocalPackage(
  packageName: string,
  localPath: string,
  configDir: string,
  logger: Logger.Instance,
): Promise<LocalPackageInfo> {
  // Resolve relative to config file directory
  const absolutePath = path.isAbsolute(localPath)
    ? localPath
    : path.resolve(configDir, localPath);

  const stat = await fs.stat(absolutePath).catch(() => null);

  // Case 1a: Direct file reference (e.g., ./src/decoder.ts)
  if (stat?.isFile()) {
    return { name: packageName, absolutePath, type: 'file' };
  }

  // Case 1b: Try with extensions (e.g., ./src/decoder → ./src/decoder.ts)
  if (!stat) {
    for (const ext of ['.ts', '.mjs', '.js', '.json']) {
      const withExt = absolutePath + ext;
      if (await fs.pathExists(withExt)) {
        return { name: packageName, absolutePath: withExt, type: 'file' };
      }
    }
    throw new Error(
      `Local package path not found: ${localPath} (resolved to ${absolutePath})`,
    );
  }

  // Path is a directory
  if (stat.isDirectory()) {
    const hasPkgJson = await fs.pathExists(
      path.join(absolutePath, 'package.json'),
    );

    if (hasPkgJson) {
      // Case 3: Full package (existing behavior)
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
        type: 'package',
        distPath: hasDistFolder ? distPath : absolutePath,
        hasDistFolder,
      };
    }

    // Case 2: Directory without package.json
    return { name: packageName, absolutePath, type: 'directory' };
  }

  throw new Error(
    `Local package path not found: ${localPath} (resolved to ${absolutePath})`,
  );
}

/**
 * Copy local package to target node_modules directory.
 *
 * Handles three cases:
 * - file: Copy as index.{ext} with generated package.json
 * - directory: Copy contents with generated package.json
 * - package: Existing behavior (copy package.json + dist/)
 */
export async function copyLocalPackage(
  localPkg: LocalPackageInfo,
  targetDir: string,
  logger: Logger.Instance,
): Promise<string> {
  const packageDir = path.join(targetDir, 'node_modules', localPkg.name);

  if (localPkg.type === 'file') {
    await fs.ensureDir(packageDir);

    // Copy the single file as index (esbuild will resolve it)
    const ext = path.extname(localPkg.absolutePath);
    await fs.copy(localPkg.absolutePath, path.join(packageDir, `index${ext}`));

    // Create minimal package.json for module resolution
    await fs.writeJson(path.join(packageDir, 'package.json'), {
      name: localPkg.name,
      main: `./index${ext}`,
    });

    logger.info(
      `📦 Using local file: ${localPkg.name} from ${localPkg.absolutePath}`,
    );
    return packageDir;
  }

  if (localPkg.type === 'directory') {
    await fs.ensureDir(path.dirname(packageDir));

    // Copy directory contents (excluding node_modules etc.)
    const entries = await fs.readdir(localPkg.absolutePath);
    for (const entry of entries) {
      if (!['node_modules', '.turbo', '.git'].includes(entry)) {
        await fs.copy(
          path.join(localPkg.absolutePath, entry),
          path.join(packageDir, entry),
        );
      }
    }

    // Generate minimal package.json for module resolution
    await fs.writeJson(path.join(packageDir, 'package.json'), {
      name: localPkg.name,
      main: './index.ts',
    });

    logger.info(
      `📦 Using local dir: ${localPkg.name} from ${localPkg.absolutePath}`,
    );
    return packageDir;
  }

  // type === 'package': Existing behavior
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
