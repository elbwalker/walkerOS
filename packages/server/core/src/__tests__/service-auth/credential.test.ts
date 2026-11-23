import { existsSync, readFileSync } from 'node:fs';
import { builtinModules } from 'node:module';
import { dirname, resolve } from 'node:path';
import type { ServiceCredential } from '@walkeros/core';
import { encodeServiceCredential } from '@walkeros/core';
import { readServiceCredential } from '../../service-auth/credential';
import { testCredential } from './rfc9421-vectors';

const credential = testCredential();

describe('readServiceCredential', () => {
  it.each<[string, string | undefined, ServiceCredential | null]>([
    ['a credential', encodeServiceCredential(credential), credential],
    ['no variable', undefined, null],
  ])('reads %s once and leaves no variable', (_name, value, expected) => {
    const env: NodeJS.ProcessEnv =
      value === undefined ? {} : { WALKEROS_CREDENTIAL: value };
    expect(readServiceCredential(env)).toEqual(expected);
    expect('WALKEROS_CREDENTIAL' in env).toBe(false);
  });

  it('refuses a value that is no credential, and still removes it', () => {
    const env: NodeJS.ProcessEnv = { WALKEROS_CREDENTIAL: 'wos_pat_0123' };
    expect(() => readServiceCredential(env)).toThrow(
      'WALKEROS_CREDENTIAL is not a walkerOS credential',
    );
    expect('WALKEROS_CREDENTIAL' in env).toBe(false);
  });
});

/**
 * The relative modules and the packages a source file reaches through its
 * top-level imports and re-exports (the code has no other kind).
 */
function moduleGraph(entry: string): { files: string[]; packages: string[] } {
  const files = new Set<string>();
  const packages = new Set<string>();
  const queue = [entry];
  for (let file = queue.pop(); file !== undefined; file = queue.pop()) {
    if (files.has(file)) continue;
    files.add(file);
    const source = readFileSync(file, 'utf8');
    for (const match of source.matchAll(
      /(?:\bfrom|^\s*import)\s+['"]([^'"]+)['"]/gm,
    )) {
      const specifier = match[1];
      if (!specifier.startsWith('.')) {
        packages.add(specifier);
        continue;
      }
      const base = resolve(dirname(file), specifier);
      const target = [`${base}.ts`, resolve(base, 'index.ts')].find(existsSync);
      if (target === undefined) throw new Error(`Unresolved ${specifier}`);
      queue.push(target);
    }
  }
  return { files: [...files], packages: [...packages] };
}

describe("server-core's main entry", () => {
  it('reaches no third-party package but @walkeros/core, the client included', () => {
    const { files, packages } = moduleGraph(
      resolve(__dirname, '../../index.ts'),
    );
    // The walk reaches the client, so the list below covers it.
    expect(files).toContainEqual(
      expect.stringMatching(/service-auth\/client\.ts$/),
    );
    const thirdParty = packages.filter(
      (name) =>
        name !== '@walkeros/core' &&
        !builtinModules.includes(name.replace(/^node:/, '')),
    );
    expect(thirdParty).toEqual([]);
  });
});
