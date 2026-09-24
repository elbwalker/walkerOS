/**
 * `runPushCommand` with `--simulate destination.*` keeps every simulated
 * step's result on `PushResult.simulations`, and `--ingest` seeds the
 * pipeline context a destination's `before` chain and push read, under the
 * runtime's own `_meta`.
 */

import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import type { Flow } from '@walkeros/core';
import { runPushCommand } from '../run.js';
import { pushCommand } from '../index.js';

const config: Flow.Json = {
  version: 4,
  flows: {
    default: {
      transformers: {
        copyUa: {
          code: {
            type: 'copyUa',
            push: '$code:(event, ctx) => ({ event: { ...event, data: { ...event.data, ua: ctx.ingest.userAgent, origin: ctx.ingest._meta.path[0], hops: ctx.ingest._meta.hops } } })',
          },
          config: {},
        },
      },
      destinations: {
        demo: {
          package: '@walkeros/destination-demo',
          before: 'copyUa',
          config: {
            settings: { name: 'Demo', values: ['name', 'data'] },
            mapping: { page: { view: {} } },
          },
        },
      },
      config: {
        platform: 'server',
        bundle: {
          packages: {
            '@walkeros/collector': {
              version: 'latest',
              imports: ['startFlow'],
            },
            '@walkeros/destination-demo': { version: 'latest' },
          },
        },
      },
    },
  },
};

const event = JSON.stringify({ name: 'page view', data: { title: 'Home' } });

/** Inline destinations: one logs at INFO in init, two fail in init or push. */
const codeConfig: Flow.Json = {
  version: 4,
  flows: {
    default: {
      collector: { logger: { level: 'INFO' } },
      destinations: {
        loud: {
          code: {
            type: 'loud',
            init: '$code:(ctx) => { ctx.logger.info("loud init"); }',
            push: '$code:() => {}',
          },
          config: {},
        },
        brokenInit: {
          code: {
            type: 'brokenInit',
            init: '$code:() => { throw new Error("Config settings accessToken missing"); }',
            push: '$code:() => {}',
          },
          config: {},
        },
        brokenPush: {
          code: {
            type: 'brokenPush',
            push: '$code:() => { throw new Error("push boom"); }',
          },
          config: {},
        },
      },
      config: {
        platform: 'server',
        bundle: {
          packages: {
            '@walkeros/collector': {
              version: 'latest',
              imports: ['startFlow'],
            },
          },
        },
      },
    },
  },
};

describe('runPushCommand destination simulations', () => {
  let tmpDir: string;
  let configPath: string;

  beforeAll(async () => {
    tmpDir = path.join(
      os.tmpdir(),
      `push-simulations-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    await fs.ensureDir(tmpDir);
    configPath = path.join(tmpDir, 'flow.json');
    await fs.writeJSON(configPath, config);
  });

  afterAll(async () => {
    await fs.remove(tmpDir);
  });

  it('carries the recorded calls and the matched mapping key', async () => {
    const result = await runPushCommand({
      config: configPath,
      event,
      silent: true,
      simulate: ['destination.demo'],
    });

    expect(result.success).toBe(true);
    expect(result.simulations).toHaveLength(1);
    expect(result.simulations?.[0].calls.length).toBeGreaterThan(0);
    expect(result.simulations?.[0].mappingKey).toBe('page view');
  }, 120000);

  it('stops at the first failing destination and keeps its result', async () => {
    const result = await runPushCommand({
      config: configPath,
      event,
      silent: true,
      simulate: ['destination.nope', 'destination.demo'],
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/^simulate destination\.nope: /);
    expect(result.simulations).toHaveLength(1);
    expect(result.simulations?.[0].name).toBe('nope');
  }, 120000);

  it('seeds --ingest into the before chain under the runtime _meta', async () => {
    const result = await runPushCommand({
      config: configPath,
      event,
      silent: true,
      simulate: ['destination.demo'],
      ingestSource: JSON.stringify({
        userAgent: 'Mozilla/5.0 test',
        _meta: { hops: 99, path: ['forged'] },
      }),
    });

    expect(result.success).toBe(true);
    const logged = JSON.stringify(result.simulations?.[0].calls);
    expect(logged).toContain('Mozilla/5.0 test');
    expect(logged).toContain('\\"origin\\": \\"demo\\"');
    expect(logged).not.toContain('forged');
    expect(logged).not.toContain('\\"hops\\": 99');
  }, 120000);
});

describe('push --json stdout', () => {
  let tmpDir: string;
  let configPath: string;

  beforeAll(async () => {
    tmpDir = path.join(
      os.tmpdir(),
      `push-json-stdout-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    await fs.ensureDir(tmpDir);
    configPath = path.join(tmpDir, 'flow.json');
    await fs.writeJSON(configPath, codeConfig);
  });

  afterAll(async () => {
    await fs.remove(tmpDir);
    jest.restoreAllMocks();
  });

  function captureStdout(): string[] {
    const stdout: string[] = [];
    jest.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
      stdout.push(String(chunk));
      return true;
    });
    jest.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
      stdout.push(args.map(String).join(' '));
    });
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('exit');
    });
    return stdout;
  }

  it('carries only the JSON result, logs go to stderr', async () => {
    const stdout = captureStdout();

    await expect(
      pushCommand({
        config: configPath,
        event,
        json: true,
        simulate: ['destination.loud'],
      }),
    ).rejects.toThrow('exit');

    const parsed: unknown = JSON.parse(stdout.join(''));
    expect(parsed).toMatchObject({
      success: true,
      simulations: [{ name: 'loud' }],
    });
  }, 120000);

  it('carries only the JSON result for a real push', async () => {
    const stdout = captureStdout();

    await expect(
      pushCommand({ config: configPath, event, json: true }),
    ).rejects.toThrow('exit');

    const parsed: unknown = JSON.parse(stdout.join(''));
    expect(parsed).toMatchObject({ elbResult: expect.anything() });
  }, 120000);
});

describe('simulated destination failures', () => {
  let tmpDir: string;
  let configPath: string;

  beforeAll(async () => {
    tmpDir = path.join(
      os.tmpdir(),
      `push-dest-failure-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    await fs.ensureDir(tmpDir);
    configPath = path.join(tmpDir, 'flow.json');
    await fs.writeJSON(configPath, codeConfig);
  });

  afterAll(async () => {
    await fs.remove(tmpDir);
  });

  it.each([
    ['init', 'brokenInit', 'Config settings accessToken missing'],
    ['push', 'brokenPush', 'push boom'],
  ])(
    'reports a failed %s as the result error',
    async (_l, id, message) => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
      const result = await runPushCommand({
        config: configPath,
        event,
        silent: true,
        simulate: [`destination.${id}`],
      });
      jest.restoreAllMocks();

      expect(result.success).toBe(false);
      expect(result.error).toBe(`simulate destination.${id}: ${message}`);
      expect(result.simulations?.[0].error?.message).toBe(message);
    },
    120000,
  );
});

describe('runPushCommand --ingest scope', () => {
  it.each([
    ['source simulation', ['source.http']],
    ['a real push', []],
  ])('rejects --ingest for %s', async (_label, simulate) => {
    const result = await runPushCommand({
      config: '/tmp/non-existent-flow.json',
      event,
      silent: true,
      simulate,
      ingestSource: '{"userAgent":"x"}',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe(
      '--ingest applies to transformer, collector and destination simulation only',
    );
  });

  it('rejects an --ingest that is not a JSON object', async () => {
    const result = await runPushCommand({
      config: '/tmp/non-existent-flow.json',
      event,
      silent: true,
      simulate: ['destination.demo'],
      ingestSource: '[1, 2]',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('--ingest must be a JSON object');
  });
});
