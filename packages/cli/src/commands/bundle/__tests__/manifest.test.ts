import http from 'http';
import fs from 'fs-extra';
import {
  runBuildManifest,
  resolveManifestSource,
  manifestFlagConflicts,
} from '../manifest';
import { BuildManifestSchema } from '../../../schemas/build-manifest';
import { BuildResultSchema } from '../../../schemas/build-manifest';
import { VERSION } from '../../../version';
import { bundle } from '../index';
import { wrapSkeleton } from '../wrap';

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
