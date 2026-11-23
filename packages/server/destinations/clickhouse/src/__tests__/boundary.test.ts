/**
 * The destination takes a host's `authorize` through its env only: no code
 * under src reaches the package that reads a service credential and signs
 * with it (`@walkeros/server-core`). The package names server-core for its
 * destination types alone, so every import of it is `import type`, erased
 * at build, and no file names the client's or the signer's functions.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = resolve(__dirname, '../..');
const SERVER_CORE = ['@walkeros', 'server-core'].join('/');
const CLIENT_NAMES = [
  'readServiceCredential',
  'createServiceAuth',
  'sendWithServiceAuth',
  'createDoorAuthorize',
  'signDoorRequest',
  'signRequest',
];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(entry.name) && path !== __filename ? [path] : [];
  });
}

const files = sourceFiles(join(root, 'src')).map((file) => ({
  file: relative(root, file),
  text: readFileSync(file, 'utf8'),
}));

describe('the destination and the credential client', () => {
  it('imports server-core for types only', () => {
    const runtime = files
      .flatMap(({ file, text }) =>
        (text.match(/^import\s[^;]*?from\s+'[^']+';/gms) ?? [])
          .filter((statement) => statement.includes(`'${SERVER_CORE}`))
          .filter((statement) => !/^import\s+type\s/.test(statement))
          .map((statement) => `${file}: ${statement}`),
      )
      .concat(
        files
          .filter(({ text }) =>
            new RegExp(`(require|import)\\(\\s*'${SERVER_CORE}`).test(text),
          )
          .map(({ file }) => file),
      );

    expect(runtime).toEqual([]);
  });

  it('names no function of the client or the signer', () => {
    const naming = files
      .filter(({ text }) =>
        CLIENT_NAMES.some((name) => new RegExp(`\\b${name}\\b`).test(text)),
      )
      .map(({ file }) => file);

    expect(naming).toEqual([]);
  });
});
