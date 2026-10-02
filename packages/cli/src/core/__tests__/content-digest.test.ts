import os from 'os';
import path from 'path';
import fs from 'fs-extra';
import type { Flow } from '@walkeros/core';
import {
  canonicalJson,
  hashInstalledDir,
  releaseDigest,
} from '../content-digest';
import { loadBundleConfig } from '../../config/loader';

describe('canonicalJson', () => {
  it('sorts object keys at every depth and keeps array order', () => {
    expect(canonicalJson({ b: 1, a: { d: [3, 1], c: true } })).toBe(
      '{"a":{"c":true,"d":[3,1]},"b":1}',
    );
    expect(canonicalJson({ a: { c: true, d: [3, 1] }, b: 1 })).toBe(
      canonicalJson({ b: 1, a: { d: [3, 1], c: true } }),
    );
  });

  it('drops undefined object values like JSON.stringify', () => {
    expect(canonicalJson({ a: undefined, b: null })).toBe('{"b":null}');
  });
});

describe('hashInstalledDir', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'content-digest-'));
    await fs.outputFile(path.join(dir, 'package.json'), '{"name":"x"}');
    await fs.outputFile(path.join(dir, 'dist', 'index.mjs'), 'export a=1;');
  });

  afterEach(async () => {
    await fs.remove(dir);
  });

  it('returns 12 lowercase hex', async () => {
    expect(await hashInstalledDir(dir)).toMatch(/^[0-9a-f]{12}$/);
  });

  it('changes when one dist byte changes', async () => {
    const before = await hashInstalledDir(dir);
    await fs.outputFile(path.join(dir, 'dist', 'index.mjs'), 'export a=2;');
    expect(await hashInstalledDir(dir)).not.toBe(before);
  });

  it('changes when a file is renamed with identical bytes', async () => {
    const before = await hashInstalledDir(dir);
    await fs.move(
      path.join(dir, 'dist', 'index.mjs'),
      path.join(dir, 'dist', 'main.mjs'),
    );
    expect(await hashInstalledDir(dir)).not.toBe(before);
  });

  it('ignores mtime', async () => {
    const before = await hashInstalledDir(dir);
    const past = new Date('2001-01-01T00:00:00Z');
    await fs.utimes(path.join(dir, 'dist', 'index.mjs'), past, past);
    expect(await hashInstalledDir(dir)).toBe(before);
  });
});

describe('releaseDigest', () => {
  const base = {
    configDigest: 'a'.repeat(64),
    versions: ['@walkeros/collector@4.7.0', 'local-pkg@local:abcdef012345'],
    toolchain: '4.7.0',
  };

  it('is 12 lowercase hex and stable for the same input', () => {
    const first = releaseDigest(base);
    expect(first).toMatch(/^[0-9a-f]{12}$/);
    expect(releaseDigest({ ...base, versions: [...base.versions] })).toBe(
      first,
    );
  });

  it.each([
    ['configDigest', { configDigest: 'b'.repeat(64) }],
    ['versions', { versions: ['@walkeros/collector@4.7.1'] }],
    ['toolchain', { toolchain: '4.7.1' }],
  ])('changes with %s', (_name, change) => {
    expect(releaseDigest({ ...base, ...change })).not.toBe(releaseDigest(base));
  });
});

describe('configDigest', () => {
  function serverConfig(collector?: Flow['collector']): unknown {
    return {
      version: 4,
      flows: {
        default: {
          config: { platform: 'server' },
          ...(collector ? { collector } : {}),
          destinations: {
            api: {
              package: '@walkeros/server-destination-api',
              config: {
                settings: {
                  url: '$env.API_URL',
                  token: '$secret.API_TOKEN',
                },
              },
            },
          },
        },
      },
    };
  }

  function webConfig(declared: string): unknown {
    return {
      version: 4,
      flows: {
        default: {
          config: {
            platform: 'web',
            bundle: { env: { API_URL: declared } },
          },
          destinations: {
            api: {
              package: '@walkeros/web-destination-api',
              config: { settings: { url: '$env.API_URL' } },
            },
          },
        },
      },
    };
  }

  function digestOf(
    rawConfig: unknown,
    configPath: string,
    buildEnv: Record<string, string>,
  ): string {
    return loadBundleConfig(rawConfig, { configPath, buildEnv }).configDigest;
  }

  it('never sees a server $env or $secret value: a changed value leaves it unchanged', () => {
    const first = digestOf(serverConfig(), '/a/flow.json', {
      API_URL: 'https://one.example',
      API_TOKEN: 'super-secret-one',
    });
    const second = digestOf(serverConfig(), '/a/flow.json', {
      API_URL: 'https://two.example',
      API_TOKEN: 'super-secret-two',
    });
    expect(second).toBe(first);
  });

  it('never sees a web $env value, neither from the build env nor declared', () => {
    const first = digestOf(webConfig('https://declared-one.example'), '/a/f', {
      API_URL: 'https://shell-one.example',
    });
    const second = digestOf(webConfig('https://declared-two.example'), '/a/f', {
      API_URL: 'https://shell-two.example',
    });
    expect(second).toBe(first);
  });

  it('is insensitive to configDir and key order', () => {
    const a = digestOf(serverConfig(), '/one/flow.json', {});
    const b = digestOf(serverConfig(), '/two/elsewhere/flow.json', {});
    expect(b).toBe(a);

    const reordered = {
      flows: {
        default: {
          destinations: {
            api: {
              config: {
                settings: {
                  token: '$secret.API_TOKEN',
                  url: '$env.API_URL',
                },
              },
              package: '@walkeros/server-destination-api',
            },
          },
          config: { platform: 'server' },
        },
      },
      version: 4,
    };
    expect(digestOf(reordered, '/one/flow.json', {})).toBe(a);
  });

  it('ignores an authored collector.release and an absent collector.name', () => {
    const plain = digestOf(serverConfig(), '/a/flow.json', {});
    expect(
      digestOf(serverConfig({ release: 'authored' }), '/a/flow.json', {}),
    ).toBe(plain);
    expect(
      digestOf(serverConfig({ name: 'default' }), '/a/flow.json', {}),
    ).toBe(plain);
  });

  it('changes when the flow config changes', () => {
    const plain = digestOf(serverConfig(), '/a/flow.json', {});
    expect(
      digestOf(serverConfig({ globals: { tenant: 'b' } }), '/a/flow.json', {}),
    ).not.toBe(plain);
  });
});
