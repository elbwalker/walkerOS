import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const versionFilename = fileURLToPath(import.meta.url);
const versionDirname = dirname(versionFilename);
const versionPackageJson = JSON.parse(
  readFileSync(join(versionDirname, '../package.json'), 'utf-8'),
);

/** Package version - exported for use by @walkeros/cli and internal services */
export const VERSION: string = versionPackageJson.version;
