import path from 'path';
import os from 'os';
import fs from 'fs-extra';
import type { Flow } from '@walkeros/core';
import { loadStepPackage } from '../../../core/step-loader.js';
import { createMockLogger } from '../../helpers/mock-logger.js';

jest.setTimeout(120_000);

const logger = createMockLogger();
const REGISTRY_PIN = '4.4.0';

describe('setup package acquisition (integration)', () => {
  let workDir: string;

  beforeEach(async () => {
    workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'setup-int-'));
  });

  afterEach(async () => {
    await fs.remove(workDir);
  });

  it('acquires a path: package offline and runs its setup', async () => {
    const pkgDir = path.join(workDir, 'fixture-dest');
    await fs.ensureDir(pkgDir);
    await fs.writeJson(path.join(pkgDir, 'package.json'), {
      name: '@walkeros/fixture-dest',
      version: '1.0.0',
      main: './index.mjs',
    });
    await fs.writeFile(
      path.join(pkgDir, 'index.mjs'),
      'export default { type: "fixture", push: () => {}, setup: async () => ({ provisioned: true }) };\n',
    );

    const flow: Flow = {
      config: {
        platform: 'server',
        bundle: { packages: { '@walkeros/fixture-dest': { path: pkgDir } } },
      },
      destinations: {
        d: { package: '@walkeros/fixture-dest', config: { setup: true } },
      },
    };

    const loaded = await loadStepPackage(flow, 'destination', 'd', {
      configDir: workDir,
      logger,
    });
    try {
      const def = loaded.module.default;
      // Narrow without casts, mirroring isComponentDefault in setup/index.ts
      expect(def).toBeDefined();
      if (def === null || typeof def !== 'object' || !('setup' in def)) {
        throw new Error('fixture default export lost its setup function');
      }
      const setupFn = def.setup;
      if (typeof setupFn !== 'function') {
        throw new Error('setup is not callable');
      }
      await expect(
        setupFn({ id: 'd', config: {}, env: {}, logger }),
      ).resolves.toEqual({ provisioned: true });
    } finally {
      await fs.remove(loaded.installDir);
    }
  });

  it('downloads the pinned version from the registry and imports it', async () => {
    const flow: Flow = {
      config: {
        platform: 'web',
        bundle: {
          packages: {
            '@walkeros/web-destination-api': { version: REGISTRY_PIN },
          },
        },
      },
      destinations: {
        api: { package: '@walkeros/web-destination-api', config: {} },
      },
    };

    const loaded = await loadStepPackage(flow, 'destination', 'api', {
      configDir: workDir,
      logger,
    });
    try {
      const manifest = await fs.readJson(
        path.join(loaded.packageDir, 'package.json'),
      );
      expect(manifest.version).toBe(REGISTRY_PIN);
      expect(loaded.module.default).toBeDefined();
    } finally {
      await fs.remove(loaded.installDir);
    }
  });
});
