import path from 'path';
import type { Flow } from '@walkeros/core';

/**
 * Resolve a package name to an import path, consulting flow config's
 * packages.path for local overrides.
 *
 * When a package has a `path` field in the flow config, resolves the
 * local filesystem path (relative to configDir). Otherwise returns the
 * bare package name for standard Node module resolution.
 *
 * @param packageName - The npm package name (e.g., "@walkeros/dest-ga4")
 * @param packages - The flow config's packages map
 * @param configDir - Directory of the flow config file (for resolving relative paths)
 * @param subpath - Optional subpath to append (e.g., "/dev" → resolved as "dev" subdirectory)
 */
export function resolvePackageImportPath(
  packageName: string,
  packages: Flow.Packages | undefined,
  configDir: string,
  subpath?: string,
): string {
  const entry = packages?.[packageName];

  if (entry?.path) {
    const resolved = path.isAbsolute(entry.path)
      ? entry.path
      : path.resolve(configDir, entry.path);
    return subpath ? path.join(resolved, subpath.replace(/^\//, '')) : resolved;
  }

  // No local path — return bare name (with subpath if provided)
  return subpath ? `${packageName}${subpath}` : packageName;
}
