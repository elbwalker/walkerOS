import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const versionFilename = fileURLToPath(import.meta.url);
const versionDirname = dirname(versionFilename);

/**
 * Find package.json in parent directories
 * Handles both source (src/) and bundled (dist/) contexts
 */
function findPackageJson(): string {
  const paths = [
    join(versionDirname, '../package.json'), // dist/ or src/
    join(versionDirname, '../../package.json'), // src/core/ (not used, but safe)
  ];
  for (const p of paths) {
    try {
      return readFileSync(p, 'utf-8');
    } catch {
      // Continue to next path
    }
  }
  return JSON.stringify({ version: '0.0.0' });
}

/**
 * Runtime package version, reported as `cliVersion` in the heartbeat.
 *
 * It is identical to `@walkeros/cli`'s version only because
 * `.changeset/config.json` keeps `@walkeros/*` in one fixed version group,
 * which is also why this package stays scoped as `@walkeros/runner` while its
 * bin is `runneros`. If that group is ever split, the heartbeat's
 * `cliVersion` field silently changes meaning.
 */
export const VERSION: string = JSON.parse(findPackageJson()).version;
