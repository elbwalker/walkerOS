import os from 'os';
import path from 'path';
import fs from 'fs-extra';
import { cacheInfo, clearCache } from '../cache';

describe('clearCache', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cache-clear-'));
    for (const scope of ['packages', 'builds', 'code']) {
      await fs.outputFile(path.join(tmpDir, 'cache', scope, 'k.js'), '');
    }
  });

  afterEach(() => fs.remove(tmpDir));

  async function remaining(): Promise<string[]> {
    return (await fs.readdir(path.join(tmpDir, 'cache'))).sort();
  }

  it('builds removes the build and the code cache, keeps packages', async () => {
    await clearCache('builds', tmpDir);
    expect(await remaining()).toEqual(['packages']);
  });

  it('packages removes only the package cache', async () => {
    await clearCache('packages', tmpDir);
    expect(await remaining()).toEqual(['builds', 'code']);
  });

  it('info counts packages, builds and compiled code entries', async () => {
    // One code entry is a `.js` and a `.mjs` file under the same key.
    await fs.outputFile(path.join(tmpDir, 'cache', 'code', 'k.mjs'), '');
    await fs.outputFile(path.join(tmpDir, 'cache', 'code', 'm.mjs'), '');
    await fs.outputFile(
      path.join(tmpDir, 'cache', 'code', 'j.js.tmp-abcd1234'),
      '',
    );
    expect(await cacheInfo(tmpDir)).toEqual({
      packages: 1,
      builds: 1,
      code: 2,
    });
  });

  it('all removes the whole cache', async () => {
    await clearCache('all', tmpDir);
    expect(await fs.pathExists(path.join(tmpDir, 'cache'))).toBe(false);
  });
});
