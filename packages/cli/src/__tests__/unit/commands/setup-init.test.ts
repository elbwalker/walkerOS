import os from 'os';
import path from 'path';
import fs from 'fs-extra';
import { StepError } from '@walkeros/core';
import { setupCommand } from '../../../commands/setup/index.js';
import { createMockLogger } from '../../helpers/mock-logger.js';

/**
 * A step's `init` that fails during `walkeros setup` ends the command with an
 * error naming the reason (non-zero exit through the CLI's error handler),
 * never a quiet skip.
 */
describe('walkeros setup and the init contract', () => {
  let workDir: string;
  const setupCalls: unknown[] = [];

  beforeEach(async () => {
    workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'setup-init-'));
    setupCalls.length = 0;
    Reflect.set(globalThis, 'walkerosSetupCalls', setupCalls);
  });

  afterEach(async () => {
    Reflect.deleteProperty(globalThis, 'walkerosSetupCalls');
    Reflect.deleteProperty(globalThis, 'walkerosSetupInitError');
    await fs.remove(workDir);
  });

  async function flowWithInit(init: string): Promise<string> {
    const pkgDir = path.join(workDir, 'fixture-dest');
    await fs.ensureDir(pkgDir);
    await fs.writeJson(path.join(pkgDir, 'package.json'), {
      name: '@walkeros/fixture-dest',
      version: '1.0.0',
      main: './index.mjs',
    });
    await fs.writeFile(
      path.join(pkgDir, 'index.mjs'),
      `export default {
  type: 'fixture',
  push: () => {},
  init: ${init},
  setup: async () => { globalThis.walkerosSetupCalls.push('setup'); return { provisioned: true }; },
};
`,
    );
    const file = path.join(workDir, 'flow.json');
    await fs.writeJson(file, {
      version: 4,
      flows: {
        default: {
          config: {
            platform: 'server',
            bundle: {
              packages: { '@walkeros/fixture-dest': { path: pkgDir } },
            },
          },
          destinations: {
            d: { package: '@walkeros/fixture-dest', config: { setup: true } },
          },
        },
      },
    });
    return file;
  }

  const run = (config: string) =>
    setupCommand({
      target: 'destination.d',
      config,
      logger: createMockLogger(),
    });

  it("fails with the StepError's code and message", async () => {
    Reflect.set(
      globalThis,
      'walkerosSetupInitError',
      new StepError('apiKey is required', { code: 'config' }),
    );
    const config = await flowWithInit(
      '() => { throw globalThis.walkerosSetupInitError; }',
    );

    await expect(run(config)).rejects.toThrow(
      'setup: destination.d init failed (config): apiKey is required',
    );
    expect(setupCalls).toEqual([]);
  });

  it('fails as not-ready when init returns false', async () => {
    const config = await flowWithInit('() => false');

    await expect(run(config)).rejects.toThrow(
      'setup: destination.d init failed (not-ready): init returned false, so the step is not ready',
    );
    expect(setupCalls).toEqual([]);
  });

  it('runs setup after an init that resolves', async () => {
    const config = await flowWithInit('async () => undefined');

    await expect(run(config)).resolves.toBeUndefined();
    expect(setupCalls).toEqual(['setup']);
  });
});
