import crypto from 'crypto';
import http from 'http';
import os from 'os';
import path from 'path';
import fs from 'fs-extra';
import { x as tarExtract } from 'tar';
import { FlowReferenceError } from '@walkeros/core';
import {
  runBuildManifest,
  resolveManifestSource,
  manifestFlagConflicts,
} from '../manifest';
import { BuildManifestSchema } from '../../../schemas/build-manifest';
import { BuildResultSchema } from '../../../schemas/build-manifest';
import { VERSION } from '../../../version';
import { bundle } from '../index';
import { packBundleDir } from '../archive';
import type { BuiltServedFlow } from '../served';
import { wrapSkeleton } from '../wrap';
import {
  PackageTreeError,
  PackageTreeSchema,
  packageTreeDigest,
  type PackageInstall,
  type PackageTree,
} from '../../../core/package-tree';
import { PackageUnavailableError } from '../../../core/package-manager';

jest.mock('../index', () => ({ bundle: jest.fn() }));
jest.mock('../wrap', () => ({ wrapSkeleton: jest.fn() }));

const mockedBundle = jest.mocked(bundle);
const mockedWrap = jest.mocked(wrapSkeleton);

interface Stub {
  base: string;
  puts: Map<string, { body: Buffer; contentType?: string; sse?: string }>;
  close: () => Promise<void>;
}

/**
 * Serves GET /manifest.json and /skeleton.mjs, records every PUT. `statuses`
 * answers the first requests to a path with those statuses, in order.
 */
async function startStub(
  manifest: (base: string) => unknown,
  statuses: Record<string, number[]> = {},
): Promise<Stub> {
  const puts: Stub['puts'] = new Map();
  let base = '';
  const server = http.createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => {
      const url = (req.url ?? '/').split('?')[0];
      const status = statuses[url]?.shift();
      if (status !== undefined) {
        res.writeHead(status).end();
      } else if (req.method === 'PUT') {
        puts.set(url, {
          body: Buffer.concat(chunks),
          contentType: req.headers['content-type'],
          sse: req.headers['x-amz-server-side-encryption']?.toString(),
        });
        res.writeHead(200).end();
      } else if (url === '/manifest.json') {
        res.writeHead(200).end(JSON.stringify(manifest(base)));
      } else if (url === '/skeleton.mjs') {
        res.writeHead(200).end('export const skeleton = true;');
      } else {
        res.writeHead(404).end();
      }
    });
  });
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('no port');
  base = `http://127.0.0.1:${address.port}`;
  return {
    base,
    puts,
    close: () => new Promise((resolve) => server.close(() => resolve())),
  };
}

function webFlow(value: string) {
  return {
    version: 4,
    flows: {
      web: {
        config: { platform: 'web', bundle: { env: { GA4_ID: 'G-1' } } },
        destinations: {
          d: {
            package: '@walkeros/web-destination-gtag',
            config: { id: value },
          },
        },
      },
    },
  };
}

/** Every artifact path: manifest GET, skeleton GET, output PUT. */
function wrapManifest(base: string) {
  return {
    version: 1,
    toolchain: VERSION,
    flowConfig: webFlow('x'),
    artifacts: [
      {
        target: 'wrap',
        platform: 'browser',
        skeleton: { url: `${base}/skeleton.mjs?X-Amz-Signature=secret` },
        outputName: 'remote.js',
        putUrl: `${base}/out/remote.js?X-Amz-Signature=secret`,
      },
    ],
    resultPutUrl: `${base}/result.json`,
  };
}

/** A localhost port nothing listens on: connections are refused. */
async function closedPort(): Promise<number> {
  const server = http.createServer();
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('no port');
  await new Promise((resolve) => server.close(resolve));
  return address.port;
}

function urlOf(input: string | URL | Request): string {
  if (typeof input === 'string') return input;
  return input instanceof URL ? input.href : input.url;
}

function readResult(stub: Stub) {
  const put = stub.puts.get('/result.json');
  if (!put) throw new Error('no result PUT');
  return BuildResultSchema.parse(JSON.parse(put.body.toString()));
}

describe('runBuildManifest', () => {
  let stub: Stub | undefined;
  const sleep = jest.fn(async (_ms: number) => {});
  const warn = jest.fn((_message: string) => {});
  const retry = { sleep, warn };

  beforeEach(() => {
    mockedBundle.mockImplementation(async (_config, options) => {
      const output = options?.buildOverrides?.output;
      if (!output) throw new Error('no output');
      await fs.outputFile(output, `bundle:${options?.target}`);
    });
    mockedWrap.mockImplementation(async (options) => {
      const skeleton = await fs.readFile(options.skeletonPath, 'utf-8');
      await fs.outputFile(options.outputPath, `wrapped(${skeleton})`);
    });
  });

  afterEach(async () => {
    await stub?.close();
    stub = undefined;
    sleep.mockClear();
    warn.mockClear();
  });

  it('builds, PUTs every output and a result, never passing process.env', async () => {
    process.env.KEK = 'app-secret';
    stub = await startStub((base) => ({
      version: 1,
      toolchain: VERSION,
      flowConfig: webFlow('$env.GA4_ID'),
      flowName: 'web',
      buildEnv: { EXTRA: 'x' },
      artifacts: [
        {
          target: 'cdn-skeleton',
          outputName: 'bundle.mjs',
          putUrl: `${base}/out/bundle.mjs?X-Amz-Signature=secret`,
        },
        {
          target: 'wrap',
          platform: 'browser',
          skeleton: { artifact: 'bundle.mjs' },
          options: { windowCollector: 'collector', windowElb: 'elb' },
          outputName: 'wrapped.js',
          putUrl: `${base}/out/wrapped.js`,
        },
        {
          target: 'wrap',
          platform: 'browser',
          skeleton: { url: `${base}/skeleton.mjs` },
          outputName: 'remote.js',
          putUrl: `${base}/out/remote.js`,
          contentType: 'text/javascript',
          headers: { 'x-amz-server-side-encryption': 'AES256' },
        },
      ],
      resultPutUrl: `${base}/result.json`,
      orchestratorOnly: 'tolerated',
    }));

    const { result, reported } = await runBuildManifest(
      `${stub.base}/manifest.json`,
    );
    delete process.env.KEK;

    expect(reported).toBe(true);
    expect(result.ok).toBe(true);
    expect(readResult(stub)).toEqual(result);
    expect(result.artifacts.map((a) => [a.outputName, a.bytes])).toEqual([
      ['bundle.mjs', 'bundle:cdn-skeleton'.length],
      ['wrapped.js', 'wrapped(bundle:cdn-skeleton)'.length],
      ['remote.js', 'wrapped(export const skeleton = true;)'.length],
    ]);
    expect(stub.puts.get('/out/bundle.mjs')?.contentType).toBe(
      'application/javascript',
    );
    expect(stub.puts.get('/out/remote.js')?.contentType).toBe(
      'text/javascript',
    );
    expect(stub.puts.get('/out/remote.js')?.sse).toBe('AES256');
    expect(mockedBundle).toHaveBeenCalledWith(
      expect.stringMatching(/flow\.json$/),
      expect.objectContaining({
        flowName: 'web',
        target: 'cdn-skeleton',
        cache: false,
        buildEnv: { EXTRA: 'x' },
      }),
    );
    expect(mockedWrap).toHaveBeenCalledWith(
      expect.objectContaining({
        windowCollector: 'collector',
        windowElb: 'elb',
      }),
    );
  });

  it.each([
    ['$env.MISSING', 'MISSING_BUILD_ENV'],
    ['$secret.TOKEN', 'WEB_SECRET_REF'],
  ])('reports %s as %s before any build', async (value, code) => {
    stub = await startStub((base) => ({
      version: 1,
      toolchain: VERSION,
      flowConfig: webFlow(value),
      artifacts: [
        { target: 'cdn', outputName: 'walker.js', putUrl: `${base}/w.js` },
      ],
      resultPutUrl: `${base}/result.json`,
    }));

    const { result } = await runBuildManifest(`${stub.base}/manifest.json`);

    expect(result.error?.code).toBe(code);
    expect(readResult(stub).ok).toBe(false);
    expect(mockedBundle).not.toHaveBeenCalled();
  });

  it.each([
    [
      'a local step package',
      { destinations: { d: { package: './my-dest' } } },
      {},
      'destinations.d.package',
      {},
    ],
    [
      'bundle.packages path',
      {},
      { packages: { '@walkeros/x': { path: '/etc' } } },
      'config.bundle.packages.@walkeros/x.path',
      {},
    ],
    [
      'bundle.traceInclude',
      {},
      { traceInclude: ['/etc/passwd'] },
      'config.bundle.traceInclude',
      {},
    ],
    ['include', {}, {}, 'include', { include: ['/etc'] }],
  ])(
    'refuses %s before any build',
    async (_label, steps, bundleConfig, location, root) => {
      stub = await startStub((base) => ({
        version: 1,
        toolchain: VERSION,
        flowConfig: {
          version: 4,
          ...root,
          flows: {
            s: {
              config: { platform: 'server', bundle: bundleConfig },
              ...steps,
            },
          },
        },
        artifacts: [
          { target: 'cdn', outputName: 'f.tar.gz', putUrl: `${base}/f` },
        ],
        resultPutUrl: `${base}/result.json`,
      }));

      const { result } = await runBuildManifest(`${stub.base}/manifest.json`);

      expect(result.error?.code).toBe('LOCAL_PATH_NOT_ALLOWED');
      expect(result.error?.message).toContain(location);
      expect(result.error?.message).not.toMatch(/etc|my-dest/);
      expect(mockedBundle).not.toHaveBeenCalled();
    },
  );

  it('builds a web flow with a root include, which a browser build ignores', async () => {
    stub = await startStub((base) => ({
      version: 1,
      toolchain: VERSION,
      flowConfig: { ...webFlow('G-1'), include: ['/etc'] },
      flowName: 'web',
      artifacts: [
        { target: 'cdn', outputName: 'walker.js', putUrl: `${base}/w.js` },
      ],
      resultPutUrl: `${base}/result.json`,
    }));

    const { result } = await runBuildManifest(`${stub.base}/manifest.json`);

    expect(result.error).toBeUndefined();
    expect(result.ok).toBe(true);
    expect(mockedBundle).toHaveBeenCalledTimes(1);
  });

  it.each([
    [
      'a local step package',
      { d: { package: './my-dest' } },
      {},
      'destinations.d.package',
    ],
    [
      'bundle.traceInclude',
      {},
      { traceInclude: ['/etc/passwd'] },
      'config.bundle.traceInclude',
    ],
  ])(
    'still refuses %s on a web flow',
    async (_label, destinations, bundleConfig, location) => {
      stub = await startStub((base) => ({
        version: 1,
        toolchain: VERSION,
        flowConfig: {
          version: 4,
          include: ['/etc'],
          flows: {
            w: {
              config: { platform: 'web', bundle: bundleConfig },
              destinations,
            },
          },
        },
        artifacts: [
          { target: 'cdn', outputName: 'walker.js', putUrl: `${base}/w.js` },
        ],
        resultPutUrl: `${base}/result.json`,
      }));

      const { result } = await runBuildManifest(`${stub.base}/manifest.json`);

      expect(result.error?.code).toBe('LOCAL_PATH_NOT_ALLOWED');
      // Only the step's location: the root `include` is not refused here.
      expect(result.error?.message).toBe(
        `Local filesystem paths are not allowed in a manifest build: ${location}`,
      );
      expect(mockedBundle).not.toHaveBeenCalled();
    },
  );

  it('refuses a manifest for another toolchain', async () => {
    stub = await startStub((base) => ({
      version: 1,
      toolchain: '0.0.1',
      flowConfig: webFlow('x'),
      artifacts: [
        { target: 'cdn', outputName: 'walker.js', putUrl: `${base}/w.js` },
      ],
      resultPutUrl: `${base}/result.json`,
    }));

    const { result } = await runBuildManifest(`${stub.base}/manifest.json`);

    expect(result.error?.code).toBe('TOOLCHAIN_MISMATCH');
    expect(readResult(stub).error?.code).toBe('TOOLCHAIN_MISMATCH');
    expect(mockedBundle).not.toHaveBeenCalled();
  });

  it('reports an invalid manifest to a readable resultPutUrl', async () => {
    stub = await startStub((base) => ({
      version: 1,
      toolchain: VERSION,
      artifacts: [
        { target: 'cdn', outputName: '../escape.js', putUrl: `${base}/w.js` },
      ],
      resultPutUrl: `${base}/result.json`,
    }));

    const { result, reported } = await runBuildManifest(
      `${stub.base}/manifest.json`,
    );

    expect(reported).toBe(true);
    expect(result.error?.code).toBe('INVALID_MANIFEST');
    expect(result.error?.message).toMatch(/outputName/);
    expect(result.error?.message).toMatch(/flowConfig/);
  });

  it('reports a network-level PUT failure as UPLOAD_FAILED after 3 attempts', async () => {
    const port = await closedPort();
    stub = await startStub((base) => ({
      version: 1,
      toolchain: VERSION,
      flowConfig: webFlow('x'),
      artifacts: [
        {
          target: 'cdn',
          outputName: 'w.js',
          putUrl: `http://127.0.0.1:${port}/w.js?X-Amz-Signature=secret`,
        },
      ],
      resultPutUrl: `${base}/result.json`,
    }));

    const { result, reported } = await runBuildManifest(
      `${stub.base}/manifest.json`,
      retry,
    );

    expect(reported).toBe(true);
    expect(result.error).toEqual({
      code: 'UPLOAD_FAILED',
      message: 'Upload failed after 3 attempts: fetch failed (ECONNREFUSED)',
      outputName: 'w.js',
    });
  });

  it('retries a manifest download that rejects once, logging the cause', async () => {
    const realFetch = globalThis.fetch;
    let manifestCalls = 0;
    jest.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
      if (urlOf(input).includes('/manifest.json') && manifestCalls++ === 0) {
        return Promise.reject(
          new TypeError('fetch failed', { cause: { code: 'ECONNRESET' } }),
        );
      }
      return realFetch(input, init);
    });
    stub = await startStub(wrapManifest);

    const { result, reported } = await runBuildManifest(
      `${stub.base}/manifest.json?X-Amz-Signature=secret`,
      retry,
    );

    expect(result.ok).toBe(true);
    expect(reported).toBe(true);
    expect(manifestCalls).toBe(2);
    expect(sleep.mock.calls).toEqual([[1000]]);
    expect(warn.mock.calls).toEqual([
      [
        'Manifest download attempt 1/3 failed: fetch failed (ECONNRESET), retrying in 1s',
      ],
    ]);
  });

  it('fails INVALID_MANIFEST naming the cause after 3 rejected downloads', async () => {
    const realFetch = globalThis.fetch;
    const fetchSpy = jest
      .spyOn(globalThis, 'fetch')
      .mockImplementation((input, init) =>
        urlOf(input).includes('/manifest.json')
          ? Promise.reject(
              new TypeError('fetch failed', { cause: { code: 'ECONNRESET' } }),
            )
          : realFetch(input, init),
      );
    stub = await startStub(wrapManifest);

    const { result, reported } = await runBuildManifest(
      `${stub.base}/manifest.json?X-Amz-Signature=secret`,
      retry,
    );

    expect(reported).toBe(false);
    expect(fetchSpy).toHaveBeenCalledTimes(3);
    expect(sleep.mock.calls).toEqual([[1000], [3000]]);
    expect(result.error?.code).toBe('INVALID_MANIFEST');
    expect(result.error?.message).toContain('ECONNRESET');
    expect(result.error?.message).not.toContain('127.0.0.1');
  });

  it.each([
    ['/manifest.json', [503]],
    ['/manifest.json', [429, 500]],
    ['/skeleton.mjs', [503, 502]],
    ['/out/remote.js', [503, 500]],
  ])('heals transient statuses on %s %j', async (target, codes) => {
    stub = await startStub(wrapManifest, { [target]: [...codes] });

    const { result, reported } = await runBuildManifest(
      `${stub.base}/manifest.json`,
      retry,
    );

    expect(result.error).toBeUndefined();
    expect(result.ok).toBe(true);
    expect(reported).toBe(true);
    expect(sleep).toHaveBeenCalledTimes(codes.length);
  });

  it.each([
    [
      '/manifest.json',
      'INVALID_MANIFEST',
      'Manifest download failed: HTTP 403',
    ],
    ['/skeleton.mjs', 'BUILD_FAILED', 'Skeleton download failed: HTTP 403'],
    ['/out/remote.js', 'UPLOAD_FAILED', 'Upload failed: HTTP 403'],
  ])('fails %s on 403 at once as %s', async (target, code, message) => {
    stub = await startStub(wrapManifest, { [target]: [403] });

    const { result } = await runBuildManifest(
      `${stub.base}/manifest.json`,
      retry,
    );

    expect(result.error?.code).toBe(code);
    expect(result.error?.message).toBe(message);
    expect(sleep).not.toHaveBeenCalled();
  });

  it.each([
    ['/skeleton.mjs', 'BUILD_FAILED', 'Skeleton download'],
    ['/out/remote.js', 'UPLOAD_FAILED', 'Upload'],
  ])('gives up on %s after 3 failures as %s', async (target, code, label) => {
    stub = await startStub(wrapManifest, { [target]: [503, 503, 503] });

    const { result, reported } = await runBuildManifest(
      `${stub.base}/manifest.json`,
      retry,
    );

    expect(reported).toBe(true);
    expect(result.error).toEqual({
      code,
      message: `${label} failed after 3 attempts: HTTP 503`,
      outputName: 'remote.js',
    });
    expect(sleep.mock.calls).toEqual([[1000], [3000]]);
  });

  it('names the failing artifact and keeps the ones already PUT', async () => {
    mockedBundle
      .mockImplementationOnce(async (_config, options) => {
        await fs.outputFile(options?.buildOverrides?.output ?? '', 'ok');
      })
      .mockRejectedValueOnce(new Error('esbuild exploded'));
    stub = await startStub((base) => ({
      version: 1,
      toolchain: VERSION,
      flowConfig: webFlow('x'),
      artifacts: [
        { target: 'cdn-skeleton', outputName: 'a.mjs', putUrl: `${base}/a` },
        { target: 'cdn', outputName: 'b.js', putUrl: `${base}/b` },
      ],
      resultPutUrl: `${base}/result.json`,
    }));

    const { result } = await runBuildManifest(`${stub.base}/manifest.json`);

    expect(result.artifacts.map((a) => a.outputName)).toEqual(['a.mjs']);
    expect(result.error).toEqual({
      code: 'BUILD_FAILED',
      message: 'esbuild exploded',
      outputName: 'b.js',
    });
  });
});

describe('resolveManifestSource', () => {
  it('reads BUILD_MANIFEST_URL for a bare flag and refuses without it', () => {
    expect(resolveManifestSource('./m.json', {})).toBe('./m.json');
    expect(
      resolveManifestSource(true, { BUILD_MANIFEST_URL: 'https://x/m' }),
    ).toBe('https://x/m');
    expect(() => resolveManifestSource(true, {})).toThrow('BUILD_MANIFEST_URL');
  });
});

describe('manifestFlagConflicts', () => {
  it.each([
    [undefined, { manifest: true, json: true, cache: true }, []],
    ['flow.json', { manifest: 'x' }, ['a config file']],
    [undefined, { manifest: 'x', target: 'cdn' }, ['--target']],
    [
      undefined,
      { manifest: 'x', release: '7', stats: true },
      ['--release', '--stats'],
    ],
    [undefined, { manifest: 'x', cache: false }, ['--no-cache']],
  ])('file %s, options %j -> %j', (file, options, expected) => {
    expect(manifestFlagConflicts(file, options)).toEqual(expected);
  });
});

describe('BuildManifestSchema headers', () => {
  it('refuses a header the CLI sets itself', () => {
    const result = BuildManifestSchema.safeParse({
      version: 1,
      toolchain: VERSION,
      flowConfig: {},
      artifacts: [
        {
          target: 'cdn',
          outputName: 'w.js',
          putUrl: 'https://x/w',
          headers: { 'Content-Type': 'text/plain' },
        },
      ],
      resultPutUrl: 'https://x/r',
    });
    expect(result.success).toBe(false);
  });
});

describe('BuildManifestSchema wrap options', () => {
  const manifest = (options: Record<string, unknown>) => ({
    version: 1,
    toolchain: VERSION,
    artifacts: [
      {
        target: 'wrap',
        platform: 'browser',
        skeleton: { url: 'https://x/s.mjs' },
        options,
        outputName: 'w.js',
        putUrl: 'https://x/w',
      },
    ],
    resultPutUrl: 'https://x/r',
  });
  const STAGE = {
    app: 'https://stage.app.walkeros.io',
    base: 'https://stage.cdn.walkeros.io/tag-mode/',
  };

  it('accepts a Tag Mode loader target', () => {
    expect(
      BuildManifestSchema.safeParse(manifest({ moin: STAGE })).success,
    ).toBe(true);
  });

  it('refuses an unknown field in the loader target', () => {
    expect(
      BuildManifestSchema.safeParse(manifest({ moin: { ...STAGE, file: 'x' } }))
        .success,
    ).toBe(false);
  });

  const PREVIEW = {
    url: 'https://ingest.example.com/preview',
    token: 'wos_preview_t1_secret',
  };

  it('accepts Observe preview reporting', () => {
    expect(
      BuildManifestSchema.safeParse(manifest({ observe: { preview: PREVIEW } }))
        .success,
    ).toBe(true);
  });

  it.each([
    ['usage', { preview: PREVIEW, usage: PREVIEW }],
    ['usage alone', { usage: PREVIEW }],
    ['no preview', {}],
    ['an unknown preview key', { preview: { ...PREVIEW, interval: 60 } }],
    ['an empty token', { preview: { ...PREVIEW, token: '' } }],
    ['a url that is not http', { preview: { ...PREVIEW, url: 'ftp://x/p' } }],
    ['a reference', { preview: { ...PREVIEW, url: '$env.OBSERVE_URL' } }],
  ])('refuses observe with %s', (_, observe) => {
    expect(BuildManifestSchema.safeParse(manifest({ observe })).success).toBe(
      false,
    );
  });

  it('refuses observe beside preview activation, which makes a host build', () => {
    const activation = {
      enabled: true,
      keyring: [],
      iss: 'https://app.example.com',
      previewOrigin: 'cdn.example.com',
    };
    expect(
      BuildManifestSchema.safeParse(
        manifest({ observe: { preview: PREVIEW }, preview: activation }),
      ).success,
    ).toBe(false);
    expect(
      BuildManifestSchema.safeParse(manifest({ preview: activation })).success,
    ).toBe(true);
  });

  it('refuses observe on a node wrap', () => {
    const node = manifest({ observe: { preview: PREVIEW } });
    node.artifacts[0].platform = 'node';
    expect(BuildManifestSchema.safeParse(node).success).toBe(false);
  });
});

const fixtureTree: PackageTree = PackageTreeSchema.parse(
  JSON.parse(
    fs.readFileSync(
      path.join(
        __dirname,
        '../../../core/__tests__/fixtures/package-trees.json',
      ),
      'utf8',
    ),
  ).cases[0].tree,
);

describe('runBuildManifest packages', () => {
  let stub: Stub | undefined;
  const installs: Array<PackageInstall | undefined> = [];

  beforeEach(() => {
    installs.length = 0;
    mockedBundle.mockImplementation(async (_config, options) => {
      const output = options?.buildOverrides?.output;
      if (!output) throw new Error('no output');
      const install = options?.buildOverrides?.packageInstall;
      installs.push(install);
      if (install && 'resolve' in install) install.onTree(fixtureTree);
      await fs.outputFile(output, `bundle:${options?.target}`);
    });
  });

  afterEach(async () => {
    await stub?.close();
    stub = undefined;
  });

  const serverManifest =
    (packages: unknown) =>
    (base: string): Record<string, unknown> => ({
      version: 1,
      toolchain: VERSION,
      flowConfig: webFlow('x'),
      artifacts: ['a.mjs', 'b.tar.gz', 'c.tar.gz'].map((outputName) => ({
        target: outputName === 'b.tar.gz' ? 'cdn' : 'cdn-skeleton',
        outputName,
        putUrl: `${base}/out/${outputName}`,
      })),
      resultPutUrl: `${base}/result.json`,
      ...(packages === undefined ? {} : { packages }),
    });

  it('resolves once under the cutoff and installs that tree for every later artifact', async () => {
    const before = '2026-11-03T12:00:00.000Z';
    stub = await startStub(
      serverManifest({ resolve: { before, exempt: ['@walkeros/'] } }),
    );
    const { result } = await runBuildManifest(`${stub.base}/manifest.json`);

    expect(result.ok).toBe(true);
    const [first, ...later] = installs;
    expect(first && 'resolve' in first && first.resolve).toEqual({
      before: new Date(before),
      exempt: ['@walkeros/'],
    });
    expect(later).toEqual([{ tree: fixtureTree }, { tree: fixtureTree }]);
    expect(result.packages).toEqual({
      digest: packageTreeDigest(fixtureTree),
      tree: fixtureTree,
    });
    expect(readResult(stub)).toEqual(result);
  });

  it('installs a recorded tree for every artifact and echoes its digest', async () => {
    stub = await startStub(serverManifest({ tree: fixtureTree }));
    const { result } = await runBuildManifest(`${stub.base}/manifest.json`);

    expect(result.ok).toBe(true);
    expect(installs).toEqual([
      { tree: fixtureTree },
      { tree: fixtureTree },
      { tree: fixtureTree },
    ]);
    expect(result.packages?.digest).toBe(packageTreeDigest(fixtureTree));
  });

  it('leaves installs and the result as they were without packages', async () => {
    stub = await startStub(serverManifest(undefined));
    const { result } = await runBuildManifest(`${stub.base}/manifest.json`);

    expect(result.ok).toBe(true);
    expect(installs).toEqual([undefined, undefined, undefined]);
    expect(result).not.toHaveProperty('packages');
  });

  it.each([
    [
      'PACKAGE_TREE_INVALID',
      () =>
        new PackageTreeError([
          'registry https://registry.evil.test/ is not https://registry.npmjs.org/',
        ]),
    ],
    [
      'PACKAGE_UNAVAILABLE',
      () =>
        new PackageUnavailableError(
          'node_modules/arrify',
          { name: 'arrify', version: '3.0.0', integrity: 'sha512-A' },
          'E404',
        ),
    ],
  ])('reports %s and uploads nothing', async (code, error) => {
    mockedBundle.mockImplementation(async () => {
      throw error();
    });
    stub = await startStub(serverManifest({ tree: fixtureTree }));
    const { result } = await runBuildManifest(`${stub.base}/manifest.json`);

    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe(code);
    expect([...stub.puts.keys()]).toEqual(['/result.json']);
  });
});

describe('runBuildManifest served flows', () => {
  let stub: Stub | undefined;
  const sleep = jest.fn(async (_ms: number) => {});
  const SERVED = { casamoda: 'casamoda/walker.js', venti: 'venti/track.js' };

  interface BundleCall {
    outputName: string;
    named: PackageInstall | undefined;
    served: Record<string, PackageInstall | undefined>;
    onServed: boolean;
  }
  const calls: BundleCall[] = [];

  function treeFor(flow: string): PackageTree {
    return {
      version: 1,
      registry: `https://registry.example/${flow}/`,
      before: null,
      packages: {},
    };
  }

  function servingFlow(
    casamoda: Record<string, unknown> = { config: { platform: 'web' } },
    flows: Record<string, string> = SERVED,
  ) {
    return {
      version: 4,
      flows: {
        casamoda,
        venti: { config: { platform: 'web' } },
        server: { config: { platform: 'server', bundle: { flows } } },
      },
    };
  }

  function servedOutputs(base: string, flows = Object.keys(SERVED)) {
    return Object.fromEntries(
      flows.map((flow) => [
        flow,
        { putUrl: `${base}/served/${flow}?X-Amz-Signature=secret` },
      ]),
    );
  }

  /** The archive names both served flows, the skeleton none. */
  const servingManifest =
    (overrides: (base: string) => Record<string, unknown> = () => ({})) =>
    (base: string) => ({
      version: 1,
      toolchain: VERSION,
      flowConfig: servingFlow(),
      flowName: 'server',
      artifacts: [
        {
          target: 'cdn',
          outputName: 'bundle.server.tar.gz',
          putUrl: `${base}/out/bundle.server.tar.gz`,
          served: servedOutputs(base),
        },
        {
          target: 'cdn-skeleton',
          outputName: 'skeleton.mjs',
          putUrl: `${base}/out/skeleton.mjs`,
        },
      ],
      resultPutUrl: `${base}/result.json`,
      ...overrides(base),
    });

  function sha256Of(content: Buffer): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  async function archiveEntry(
    archive: Buffer | undefined,
    entry: string,
  ): Promise<Buffer> {
    if (!archive) throw new Error('no archive PUT');
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'manifest-archive-'));
    try {
      const file = path.join(dir, 'archive.tar.gz');
      await fs.writeFile(file, archive);
      await tarExtract({ file, cwd: dir });
      return await fs.readFile(path.join(dir, entry));
    } finally {
      await fs.remove(dir);
    }
  }

  beforeEach(() => {
    calls.length = 0;
    // As bundle() does: each served flow asks for its install, the web
    // files land in the server's archive, and onServed gets the same files.
    mockedBundle.mockImplementation(async (_config, options) => {
      const output = options?.buildOverrides?.output;
      if (!output) throw new Error('no output');
      const served: Record<string, PackageInstall | undefined> = {};
      for (const flow of Object.keys(SERVED)) {
        const install = options?.servedPackageInstall?.(flow);
        if (install && 'resolve' in install) install.onTree(treeFor(flow));
        served[flow] = install;
      }
      const named = options?.buildOverrides?.packageInstall;
      if (named && 'resolve' in named) named.onTree(fixtureTree);
      calls.push({
        outputName: path.basename(output),
        named,
        served,
        onServed: options?.onServed !== undefined,
      });

      const scratch = await fs.mkdtemp(
        path.join(os.tmpdir(), 'manifest-served-'),
      );
      try {
        const built: BuiltServedFlow[] = [];
        for (const [flow, servedPath] of Object.entries(SERVED)) {
          const file = path.join(scratch, 'built', flow, 'file.js');
          await fs.outputFile(file, `web:${flow}`);
          await fs.copy(file, path.join(scratch, 'server', servedPath));
          built.push({ flow, path: servedPath, file });
        }
        if (output.endsWith('.tar.gz')) {
          await fs.outputFile(path.join(scratch, 'server', 'flow.mjs'), 's');
          await packBundleDir(path.join(scratch, 'server'), output, [
            'flow.mjs',
            ...Object.values(SERVED),
          ]);
        } else {
          await fs.outputFile(output, `bundle:${options?.target}`);
        }
        await options?.onServed?.(built);
      } finally {
        await fs.remove(scratch);
      }
    });
  });

  afterEach(async () => {
    await stub?.close();
    stub = undefined;
    sleep.mockClear();
  });

  it('PUTs each served file of the archive and reports it on that entry', async () => {
    stub = await startStub(servingManifest());
    const { result } = await runBuildManifest(`${stub.base}/manifest.json`);

    expect(result.ok).toBe(true);
    const archive = stub.puts.get('/out/bundle.server.tar.gz')?.body;
    const expected = [];
    for (const [flow, servedPath] of Object.entries(SERVED)) {
      const entry = await archiveEntry(archive, servedPath);
      const put = stub.puts.get(`/served/${flow}`);
      expect({ body: put?.body, contentType: put?.contentType }).toEqual({
        body: entry,
        contentType: 'application/javascript',
      });
      expected.push({
        flow,
        path: servedPath,
        bytes: entry.length,
        sha256: sha256Of(entry),
      });
    }
    expect(result.artifacts.map((a) => [a.outputName, a.served])).toEqual([
      ['bundle.server.tar.gz', expected],
      ['skeleton.mjs', undefined],
    ]);
    expect(readResult(stub)).toEqual(result);
  });

  it('hands onServed only to the artifact that names served outputs', async () => {
    stub = await startStub(servingManifest());
    await runBuildManifest(`${stub.base}/manifest.json`);

    expect(calls.map((call) => [call.outputName, call.onServed])).toEqual([
      ['bundle.server.tar.gz', true],
      ['skeleton.mjs', false],
    ]);
  });

  it.each([
    [
      'served outputs name a flow the server does not serve',
      (base: string) => ({
        artifacts: [
          {
            target: 'cdn',
            outputName: 'bundle.server.tar.gz',
            putUrl: `${base}/out/a`,
            served: servedOutputs(base, ['casamoda', 'venti', 'ghost']),
          },
        ],
      }),
      'Served outputs name "ghost", which flow "server" does not serve',
    ],
    [
      'served outputs leave out a flow the server serves',
      (base: string) => ({
        artifacts: [
          {
            target: 'cdn',
            outputName: 'bundle.server.tar.gz',
            putUrl: `${base}/out/a`,
            served: servedOutputs(base, ['casamoda']),
          },
        ],
      }),
      'Served outputs leave out "venti", which flow "server" serves',
    ],
    [
      'served outputs appear on two artifacts',
      (base: string) => ({
        artifacts: ['a.tar.gz', 'b.tar.gz'].map((outputName) => ({
          target: 'cdn',
          outputName,
          putUrl: `${base}/out/${outputName}`,
          served: servedOutputs(base),
        })),
      }),
      'artifacts.1.served: Only one artifact may name served outputs',
    ],
    [
      'package trees name a flow the server does not serve',
      () => ({
        packages: {
          tree: fixtureTree,
          served: {
            casamoda: fixtureTree,
            venti: fixtureTree,
            ghost: fixtureTree,
          },
        },
      }),
      'Package trees name "ghost", which flow "server" does not serve',
    ],
  ])(
    'refuses a manifest whose %s before any build',
    async (_label, overrides, message) => {
      stub = await startStub(servingManifest(overrides));
      const { result } = await runBuildManifest(`${stub.base}/manifest.json`);

      expect(result.error).toEqual({ code: 'INVALID_MANIFEST', message });
      expect(mockedBundle).not.toHaveBeenCalled();
    },
  );

  it('reports a served PUT that fails three times as UPLOAD_FAILED of its artifact', async () => {
    stub = await startStub(servingManifest(), {
      '/served/venti': [503, 503, 503],
    });
    const { result } = await runBuildManifest(`${stub.base}/manifest.json`, {
      sleep,
    });

    expect(result.error).toEqual({
      code: 'UPLOAD_FAILED',
      message: 'Served output venti: Upload failed after 3 attempts: HTTP 503',
      outputName: 'bundle.server.tar.gz',
    });
  });

  it.each([
    [
      'a local package path',
      {
        config: {
          platform: 'web',
          bundle: { packages: { x: { path: './x' } } },
        },
      },
      'LOCAL_PATH_NOT_ALLOWED',
      'Local filesystem paths are not allowed in a manifest build: flows.casamoda.config.bundle.packages.x.path',
    ],
    [
      'an $env that buildEnv lacks',
      {
        config: { platform: 'web' },
        destinations: {
          d: {
            package: '@walkeros/web-destination-gtag',
            config: { id: '$env.MISSING' },
          },
        },
      },
      'MISSING_BUILD_ENV',
      'Served flow casamoda failed to build: Environment variable "MISSING" not found and no default provided',
    ],
  ])(
    'refuses a served flow with %s before any build',
    async (_label, casamoda, code, message) => {
      stub = await startStub(
        servingManifest(() => ({ flowConfig: servingFlow(casamoda) })),
      );
      const { result } = await runBuildManifest(`${stub.base}/manifest.json`);

      expect(result.error).toEqual({ code, message });
      expect(mockedBundle).not.toHaveBeenCalled();
    },
  );

  it.each(['bundle.mjs', 'Bundle.mjs/x.js'])(
    'refuses a served path %s that an artifact output takes before any build',
    async (servedPath) => {
      stub = await startStub(
        servingManifest((base) => ({
          flowConfig: servingFlow(undefined, {
            casamoda: servedPath,
            venti: 'venti/track.js',
          }),
          artifacts: [
            {
              target: 'cdn-skeleton',
              outputName: 'bundle.mjs',
              putUrl: `${base}/out/bundle.mjs`,
            },
          ],
        })),
      );
      const { result } = await runBuildManifest(`${stub.base}/manifest.json`);

      expect(result.error).toEqual({
        code: 'INVALID_CONFIG',
        message: `Invalid configuration:\n  - flows.server.config.bundle.flows.casamoda: "${servedPath}" collides with "bundle.mjs", which this manifest builds`,
      });
      expect(mockedBundle).not.toHaveBeenCalled();
      expect([...stub.puts.keys()]).toEqual(['/result.json']);
    },
  );

  it('classifies a served build failure by its cause', async () => {
    const message =
      'Served flow casamoda failed to build: Environment variable "X" not found and no default provided';
    mockedBundle.mockRejectedValue(
      new Error(message, {
        cause: new FlowReferenceError(
          'MISSING_ENV',
          'X',
          'Environment variable "X" not found and no default provided',
        ),
      }),
    );
    stub = await startStub(servingManifest());
    const { result } = await runBuildManifest(`${stub.base}/manifest.json`);

    expect(result.error).toEqual({
      code: 'MISSING_BUILD_ENV',
      message,
      outputName: 'bundle.server.tar.gz',
    });
  });

  describe('package trees', () => {
    const before = '2026-11-03T12:00:00.000Z';
    const recorded = {
      casamoda: { tree: treeFor('casamoda') },
      venti: { tree: treeFor('venti') },
    };

    it('resolves each served flow once under the cutoff and installs its tree for later artifacts', async () => {
      stub = await startStub(
        servingManifest(() => ({
          packages: { resolve: { before, exempt: ['@walkeros/'] } },
        })),
      );
      const { result } = await runBuildManifest(`${stub.base}/manifest.json`);

      expect(result.ok).toBe(true);
      const [first, second] = calls;
      const request = { before: new Date(before), exempt: ['@walkeros/'] };
      expect(
        Object.values(first.served).map((install) =>
          install && 'resolve' in install ? install.resolve : install,
        ),
      ).toEqual([request, request]);
      expect(second.served).toEqual(recorded);
      expect(result.packages?.served).toEqual({
        casamoda: {
          digest: packageTreeDigest(treeFor('casamoda')),
          tree: treeFor('casamoda'),
        },
        venti: {
          digest: packageTreeDigest(treeFor('venti')),
          tree: treeFor('venti'),
        },
      });
      expect(readResult(stub)).toEqual(result);
    });

    it('installs the recorded tree of each served flow for every artifact', async () => {
      stub = await startStub(
        servingManifest(() => ({
          packages: {
            tree: fixtureTree,
            served: { casamoda: treeFor('casamoda'), venti: treeFor('venti') },
          },
        })),
      );
      const { result } = await runBuildManifest(`${stub.base}/manifest.json`);

      expect(result.ok).toBe(true);
      expect(calls.map((call) => call.served)).toEqual([recorded, recorded]);
    });

    it('refuses a recorded tree without one for a served flow before any build', async () => {
      stub = await startStub(
        servingManifest(() => ({
          packages: {
            tree: fixtureTree,
            served: { casamoda: treeFor('casamoda') },
          },
        })),
      );
      const { result } = await runBuildManifest(`${stub.base}/manifest.json`);

      expect(result.error).toEqual({
        code: 'PACKAGE_TREE_INVALID',
        message: 'No recorded tree for served flow "venti"',
      });
      expect(mockedBundle).not.toHaveBeenCalled();
    });

    it('resolves served flows fresh without packages', async () => {
      stub = await startStub(servingManifest());
      const { result } = await runBuildManifest(`${stub.base}/manifest.json`);

      expect(result.ok).toBe(true);
      const fresh = { casamoda: undefined, venti: undefined };
      expect(calls.map((call) => call.served)).toEqual([fresh, fresh]);
      expect(result).not.toHaveProperty('packages');
    });
  });
});

describe('BuildManifestSchema packages', () => {
  const manifest = (packages: unknown) => ({
    version: 1,
    toolchain: VERSION,
    flowConfig: {},
    artifacts: [{ target: 'cdn', outputName: 'w.js', putUrl: 'https://x/w' }],
    resultPutUrl: 'https://x/r',
    packages,
  });

  it.each([
    [
      'a resolve request',
      {
        resolve: { before: '2026-11-03T12:00:00.000Z', exempt: ['@walkeros/'] },
      },
      true,
    ],
    [
      'a resolve request without a date',
      { resolve: { before: 'last week', exempt: [] } },
      false,
    ],
    [
      'both at once',
      { resolve: { before: '2026-11-03T12:00:00.000Z', exempt: [] }, tree: {} },
      false,
    ],
    [
      'a tree with an unknown key',
      {
        tree: {
          version: 1,
          registry: 'https://registry.npmjs.org/',
          before: null,
          packages: {},
          extra: 1,
        },
      },
      false,
    ],
    ['an unknown mode', { latest: true }, false],
    [
      'a tree with a tree per served flow',
      { tree: fixtureTree, served: { casamoda: fixtureTree } },
      true,
    ],
    [
      'a resolve request with served trees',
      {
        resolve: { before: '2026-11-03T12:00:00.000Z', exempt: [] },
        served: { casamoda: fixtureTree },
      },
      false,
    ],
  ])('%s', (_name, packages, ok) => {
    expect(BuildManifestSchema.safeParse(manifest(packages)).success).toBe(ok);
  });
});
