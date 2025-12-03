import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

// Read version from package.json (ESM-compatible)
const moduleFilename = fileURLToPath(import.meta.url);
const moduleDir = path.dirname(moduleFilename);
const packageJson = JSON.parse(
  readFileSync(path.join(moduleDir, '../package.json'), 'utf-8'),
) as { version: string };

/**
 * Package version - exported for use by @walkeros/cli and internal services
 */
export const VERSION = packageJson.version;
