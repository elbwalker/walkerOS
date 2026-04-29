import fs from 'fs';
import path from 'path';
import type { Flow } from '@walkeros/core';

/**
 * Resolve a package name to an import path, consulting flow config's
 * packages.path for local overrides.
 *
 * When a package has a `path` field in the flow config, resolves the
 * local filesystem path (relative to configDir). For subpaths (e.g., "/dev"),
 * reads the package's exports map to find the actual file path.
 * Otherwise returns the bare package name for standard Node module resolution.
 */
export function resolvePackageImportPath(
  packageName: string,
  packages: Record<string, Flow.BundlePackage> | undefined,
  configDir: string,
  subpath?: string,
): string {
  const entry = packages?.[packageName];

  if (entry?.path) {
    const resolved = path.isAbsolute(entry.path)
      ? entry.path
      : path.resolve(configDir, entry.path);

    if (!subpath) return resolved;

    // Resolve subpath via package.json exports map (e.g., "./dev" → "./dist/dev.mjs")
    try {
      const pkgJson = JSON.parse(
        fs.readFileSync(path.join(resolved, 'package.json'), 'utf8'),
      );
      const exportKey = `.${subpath.startsWith('/') ? subpath : `/${subpath}`}`;
      const exp = pkgJson.exports?.[exportKey];
      if (exp) {
        const target =
          typeof exp === 'string'
            ? exp
            : exp.import || exp.require || exp.default;
        if (target) return path.join(resolved, target);
      }
    } catch {
      // Fall through to direct path join
    }

    return path.join(resolved, subpath.replace(/^\//, ''));
  }

  // No local path — return bare name (with subpath if provided)
  return subpath ? `${packageName}${subpath}` : packageName;
}
