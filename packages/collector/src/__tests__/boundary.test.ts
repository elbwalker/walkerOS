/**
 * The collector takes a host's `authorize` through its options only: it
 * never depends on, nor imports, the package that reads a service credential
 * and signs with it (`@walkeros/server-core`), so no step reaches a key.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = resolve(__dirname, '../..');
const SERVER_CORE = ['@walkeros', 'server-core'].join('/');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

describe('the collector and the credential client', () => {
  it('names no server-core in package.json', () => {
    const pkg: unknown = JSON.parse(
      readFileSync(join(root, 'package.json'), 'utf8'),
    );
    const named = JSON.stringify(pkg);

    expect(named).not.toContain(SERVER_CORE);
  });

  it('imports server-core from no file under src', () => {
    const importing = sourceFiles(join(root, 'src'))
      .filter((file) => readFileSync(file, 'utf8').includes(`'${SERVER_CORE}`))
      .map((file) => relative(root, file));

    expect(importing).toEqual([]);
  });
});
