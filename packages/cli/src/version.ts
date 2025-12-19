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

/** CLI package version */
export const VERSION: string = JSON.parse(findPackageJson()).version;
