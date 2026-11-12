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

/** Top-level entries a copy of a package root leaves out. */
const ROOT_COPY_EXCLUDED = ['.turbo', '.git'];

/**
 * Whether a copy of a package root leaves a path out: `node_modules` at any
 * depth (links are followed, so a nested one would pull in a whole tree) and
 * `.env` files, which hold secrets and are never code a flow loads.
 */
function excludedFromCopy(root: string, file: string): boolean {
  const relative = path.relative(root, file);
  if (relative === '') return false;
  const parts = relative.split(path.sep);
  if (ROOT_COPY_EXCLUDED.includes(parts[0])) return true;
  if (parts.includes('node_modules')) return true;
  const name = parts[parts.length - 1];
  return name === '.env' || name.startsWith('.env.');
}

/** Copies a package root, links resolved: a workspace's relative symlinks break once copied. */
async function copyPackageRoot(source: string, target: string): Promise<void> {
  await fs.copy(source, target, {
    dereference: true,
    filter: (file) => !excludedFromCopy(source, file),
  });
}

/** Every string a manifest field holds, at any depth (`exports` conditions). */
export function stringLeaves(value: unknown, into: string[] = []): string[] {
  if (typeof value === 'string') into.push(value);
  else if (value && typeof value === 'object')
    for (const inner of Object.values(value)) stringLeaves(inner, into);
  return into;
}

/** Condition keys of `exports` that name type declarations, never code. */
const TYPE_CONDITIONS = ['types', 'typings'];

/** The code leaves of an `exports` value: no type conditions, declarations or JSON. */
function codeExports(value: unknown, into: string[] = []): string[] {
  if (typeof value === 'string') {
    if (!/\.d\.[cm]?ts$/.test(value) && !value.endsWith('.json'))
      into.push(value);
  } else if (value && typeof value === 'object') {
    for (const [key, inner] of Object.entries(value))
      if (!TYPE_CONDITIONS.includes(key)) codeExports(inner, into);
  }
  return into;
}

/**
 * Whether a manifest's entry points (`main`, `module`, the code leaves of
 * `exports`, `bin`) name a file outside `dist/`. A package without them
 * resolves nothing outside it either; type declarations and JSON a package
 * exports are no code to load.
 */
export function entriesOutsideDist(manifest: unknown): boolean {
  if (!manifest || typeof manifest !== 'object') return false;
  const fields = [
    ...['main', 'module', 'bin'].flatMap((field) =>
      stringLeaves(Reflect.get(manifest, field)),
    ),
    ...codeExports(Reflect.get(manifest, 'exports')),
  ];
  return fields.some((entry) => {
    const relative = path.posix.normalize(entry.replace(/^\.\//, ''));
    return (
      relative !== 'package.json' &&
      relative !== 'dist' &&
      !relative.startsWith('dist/')
    );
  });
}

/**
 * Copy local package to target node_modules directory.
 *
 * Handles three cases:
 * - file: Copy as index.{ext} with generated package.json
 * - directory: Copy contents with generated package.json
 * - package: package.json plus dist/, or the package root when it has no
 *   dist/ or an entry point outside it (a `main` in `lib/` beside a browser
 *   build in `dist/`)
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

    // Copy directory contents (without node_modules, .env files etc.)
    await copyPackageRoot(localPkg.absolutePath, packageDir);

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

  // Copy dist folder AS dist folder (preserving structure for exports like
  // ./dist/index.mjs), unless an entry point names a file outside it: then
  // dist/ alone would leave the package without the file it resolves to.
  const manifest: unknown = await fs
    .readJson(path.join(localPkg.absolutePath, 'package.json'))
    .catch(() => undefined);
  if (localPkg.hasDistFolder && !entriesOutsideDist(manifest)) {
    await fs.copy(localPkg.distPath, path.join(packageDir, 'dist'));
  } else {
    await copyPackageRoot(localPkg.absolutePath, packageDir);
  }

  logger.info(`📦 Using local: ${localPkg.name} from ${localPkg.absolutePath}`);

  return packageDir;
}
