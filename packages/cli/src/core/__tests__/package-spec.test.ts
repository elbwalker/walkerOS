import os from 'os';
import path from 'path';
import fs from 'fs-extra';
import pacote from 'pacote';
import { createMockLogger } from '@walkeros/core';
import { isRegistrySpec } from '../package-spec';
import {
  collectAllSpecs,
  loadNpmConfigForPacote,
  PACOTE_OPTS,
} from '../package-manager';

function fakeManifest(
  name: string,
  version: string,
  dependencies: Record<string, string> = {},
): pacote.AbbreviatedManifest & pacote.ManifestResult {
  return {
    name,
    version,
    dependencies,
    dist: { tarball: `https://registry.example/${name}-${version}.tgz` },
    deprecated: undefined,
    _from: `${name}@${version}`,
    _resolved: `https://registry.example/${name}-${version}.tgz`,
    _integrity: 'sha512-test',
    _id: `${name}@${version}`,
  };
}

describe('isRegistrySpec', () => {
  it.each([
    ['1.2.3', true],
    ['^4.0.0', true],
    ['latest', true],
    ['npm:other@^1.0.0', false],
    ['github:user/repo', false],
    ['git+https://github.com/user/repo.git', false],
    ['file:../local', false],
    ['link:../local', false],
    ['https://example.com/pkg.tgz', false],
    ['../local', false],
  ])('%s -> %s', (spec, expected) => {
    expect(isRegistrySpec('@walkeros/x', spec)).toBe(expected);
  });

  it('admits a registry-backed alias only when asked', () => {
    expect(isRegistrySpec('strip', 'npm:strip-ansi@^6.0.1', true)).toBe(true);
    expect(isRegistrySpec('strip', 'npm:github:user/repo', true)).toBe(false);
  });
});

describe('collectAllSpecs spec-type gate', () => {
  const logger = createMockLogger();

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('refuses non-registry direct specs and override values before any fetch', async () => {
    const manifest = jest.spyOn(pacote, 'manifest');
    await expect(
      collectAllSpecs(
        [
          { name: '@walkeros/a', version: 'github:user/repo' },
          { name: '@walkeros/b', version: '^1.0.0' },
          { name: 'local', version: 'latest', path: './local' },
        ],
        logger,
        undefined,
        { 'left-pad': 'file:../evil' },
      ),
    ).rejects.toThrow(
      /@walkeros\/a@github:user\/repo \(from flow\.json\), left-pad@file:\.\.\/evil \(from config\.bundle\.overrides\)/,
    );
    expect(manifest).not.toHaveBeenCalled();
  });

  it('refuses a transitive git dependency, admits a registry alias', async () => {
    jest.spyOn(pacote, 'manifest').mockImplementation(async (spec: string) => {
      if (spec === '@walkeros/a@1.0.0') {
        return fakeManifest('@walkeros/a', '1.0.0', {
          strip: 'npm:strip-ansi@^6.0.1',
          evil: 'github:user/evil',
        });
      }
      return fakeManifest('strip-ansi', '6.0.1');
    });

    await expect(
      collectAllSpecs([{ name: '@walkeros/a', version: '1.0.0' }], logger),
    ).rejects.toThrow('evil@github:user/evil (from @walkeros/a)');
  });
});

describe('collectAllSpecs optional dependencies', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('skips an optional non-registry peer with a warning', async () => {
    const logger = createMockLogger();
    jest.spyOn(pacote, 'manifest').mockImplementation(async () => ({
      ...fakeManifest('@walkeros/a', '1.0.0'),
      peerDependencies: { maybe: 'github:user/maybe' },
      peerDependenciesMeta: { maybe: { optional: true } },
    }));

    const specs = await collectAllSpecs(
      [{ name: '@walkeros/a', version: '1.0.0' }],
      logger,
    );

    expect(specs.has('maybe')).toBe(false);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining(
        'Skipping optional dependency maybe@github:user/maybe',
      ),
    );
  });
});

describe('ignoreScripts', () => {
  it('is set on the default options and survives an .npmrc', async () => {
    expect(PACOTE_OPTS.ignoreScripts).toBe(true);
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'npmrc-'));
    try {
      await fs.writeFile(path.join(dir, '.npmrc'), 'ignoreScripts=false\n');
      const config = await loadNpmConfigForPacote(dir, dir);
      expect(config.ignoreScripts).toBe(true);
    } finally {
      await fs.remove(dir);
    }
  });
});
