/**
 * A server flow that lists web flows in `config.bundle.flows` builds them
 * into its output: each web flow first, one after another, into a scratch
 * folder, then the server, then each web file at its path in the server's
 * folder or archive. Stdout and URL outputs build the server alone.
 */

import path from 'path';
import { tmpdir } from 'os';
import fs from 'fs-extra';
import { t as tarList, x as tarExtract } from 'tar';
import { FlowReferenceError, type Flow } from '@walkeros/core';
import { bundle, bundleCommand } from '../index.js';
import { loadServedFlow, type BuiltServedFlow } from '../served.js';
import { loadBundleConfig } from '../../../config/index.js';
import type { PackageTree } from '../../../core/package-tree.js';

jest.mock('../bundler.js', () => ({
  ...jest.requireActual('../bundler.js'),
  bundleCore: jest.fn(),
}));

jest.mock('../upload.js', () => ({
  ...jest.requireActual('../upload.js'),
  uploadBundleToUrl: jest.fn(),
}));

jest.mock('../../../core/index.js', () => ({
  ...jest.requireActual('../../../core/index.js'),
  writeResult: jest.fn(),
}));

import { bundleCore, copyIncludes } from '../bundler.js';
import { writeResult } from '../../../core/index.js';

const mockBundleCore = jest.mocked(bundleCore);
const mockWriteResult = jest.mocked(writeResult);

const SERVED = { casamoda: 'casamoda/walker.js', venti: 'walker2.js' };

/** process.exit never returns: the stub throws, so its type is `never`. */
class ExitCalled extends Error {
  constructor(readonly code: string | number | null | undefined) {
    super(`process.exit(${String(code)})`);
  }
}

function flowJson(
  served: Record<string, string> = SERVED,
  root: Pick<Flow.Json, 'include'> = {},
  casamoda: Flow = { config: { platform: 'web' } },
): Flow.Json {
  return {
    version: 4,
    ...root,
    flows: {
      casamoda,
      venti: { config: { platform: 'web' } },
      server: { config: { platform: 'server', bundle: { flows: served } } },
    },
  };
}

function treeFor(flow: string): PackageTree {
  return {
    version: 1,
    registry: `https://registry.example/${flow}/`,
    before: null,
    packages: {},
  };
}

describe('a server flow that lists web flows', () => {
  let workDir: string;
  let dist: string;
  let lines: string[];
  let exit: jest.SpiedFunction<typeof process.exit>;

  async function writeFlow(json: Flow.Json): Promise<string> {
    const file = path.join(workDir, 'flow.json');
    await fs.writeJson(file, json);
    return file;
  }

  async function read(...parts: string[]): Promise<string> {
    return fs.readFile(path.join(...parts), 'utf8');
  }

  function isInside(dir: string, file: string): boolean {
    const relative = path.relative(dir, path.resolve(file));
    return !relative.startsWith('..') && !path.isAbsolute(relative);
  }

  /** Every file or folder under `dir` named `name`. */
  async function findNamed(dir: string, name: string): Promise<string[]> {
    const found: string[] = [];
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.name === name) found.push(full);
      if (entry.isDirectory()) found.push(...(await findNamed(full, name)));
    }
    return found;
  }

  function calls() {
    return mockBundleCore.mock.calls.map(
      ([, buildOptions, , , provenance]) => ({ buildOptions, provenance }),
    );
  }

  function browserCalls() {
    return calls().filter(
      ({ buildOptions }) => buildOptions.platform === 'browser',
    );
  }

  beforeEach(async () => {
    workDir = await fs.mkdtemp(path.join(tmpdir(), 'walkeros-served-'));
    dist = path.join(workDir, 'dist');
    lines = [];
    const capture = (...args: unknown[]): void => {
      lines.push(args.map(String).join(' '));
    };
    jest.spyOn(console, 'log').mockImplementation(capture);
    jest.spyOn(console, 'error').mockImplementation(capture);
    jest.spyOn(console, 'warn').mockImplementation(capture);
    jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    exit = jest.spyOn(process, 'exit').mockImplementation((code) => {
      throw new ExitCalled(code);
    });

    // A node call writes what the real server build leaves beside its output
    // and copies the includes as finishArtifact does; a browser call writes
    // its flow's name.
    mockWriteResult.mockReset();
    mockBundleCore.mockReset();
    mockBundleCore.mockImplementation(
      async (_flow, buildOptions, logger, _stats, provenance) => {
        const output = path.resolve(buildOptions.output);
        const dir = path.dirname(output);
        if (buildOptions.platform === 'browser') {
          await fs.outputFile(output, `// ${provenance?.flowName}`);
          return undefined;
        }
        await fs.outputFile(output, 'export default function flow() {}\n');
        await fs.writeJson(path.join(dir, 'package.json'), {
          name: 'walkeros-bundle',
          type: 'module',
        });
        await fs.outputFile(
          path.join(dir, 'node_modules', 'demo-pkg', 'index.js'),
          'module.exports = {};\n',
        );
        await copyIncludes(
          buildOptions.include ?? [],
          buildOptions.configDir ?? workDir,
          dir,
          logger,
        );
        return undefined;
      },
    );
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await fs.remove(workDir);
  });

  describe('a folder output', () => {
    beforeEach(async () => {
      const file = await writeFlow(flowJson());
      await bundle(file, {
        flowName: 'server',
        buildOverrides: { output: path.join(dist, 'flow.mjs') },
      });
    });

    it('holds the server build and each web file at its path', async () => {
      expect(await read(dist, 'casamoda', 'walker.js')).toBe('// casamoda');
      expect(await read(dist, 'walker2.js')).toBe('// venti');
      expect(await fs.pathExists(path.join(dist, 'flow.mjs'))).toBe(true);
      expect(await fs.pathExists(path.join(dist, 'package.json'))).toBe(true);
      expect(
        await fs.pathExists(
          path.join(dist, 'node_modules', 'demo-pkg', 'index.js'),
        ),
      ).toBe(true);
    });

    it('builds the web flows first, in key order, then the server', () => {
      expect(
        calls().map(({ buildOptions, provenance }) => [
          buildOptions.platform,
          provenance?.flowName,
        ]),
      ).toEqual([
        ['browser', 'casamoda'],
        ['browser', 'venti'],
        ['node', 'server'],
      ]);
    });

    it('builds each web flow with the cdn flags', () => {
      const cdn = { skipWrapper: false, withDev: false, externalizeDev: false };

      expect(
        browserCalls().map(
          ({ buildOptions: { skipWrapper, withDev, externalizeDev } }) => ({
            skipWrapper,
            withDev,
            externalizeDev,
          }),
        ),
      ).toEqual([cdn, cdn]);
    });

    it('builds each web flow without includes', () => {
      expect(
        browserCalls().map(({ buildOptions }) => buildOptions.include),
      ).toEqual([[], []]);
    });

    it('builds each web flow outside the output folder', () => {
      expect(
        browserCalls().map(({ buildOptions }) =>
          isInside(dist, buildOptions.output),
        ),
      ).toEqual([false, false]);
    });

    it('logs one line per placed file and no include line', () => {
      expect(lines).toContainEqual(
        expect.stringContaining('Served flow casamoda: casamoda/walker.js'),
      );
      expect(lines).toContainEqual(
        expect.stringContaining('Served flow venti: walker2.js'),
      );
      expect(lines.some((line) => line.includes('include is ignored'))).toBe(
        false,
      );
    });
  });

  describe('package installs', () => {
    const output = (): string => path.join(dist, 'flow.mjs');

    it('builds served flows with the cdn flags and without the server install', async () => {
      const file = await writeFlow(flowJson());
      await bundle(file, {
        flowName: 'server',
        target: 'runner',
        buildOverrides: {
          output: output(),
          packageInstall: { tree: treeFor('server') },
        },
      });

      const cdn = {
        skipWrapper: false,
        withDev: false,
        externalizeDev: false,
        packageInstall: undefined,
      };
      expect(
        browserCalls().map(({ buildOptions }) => ({
          skipWrapper: buildOptions.skipWrapper,
          withDev: buildOptions.withDev,
          externalizeDev: buildOptions.externalizeDev,
          packageInstall: buildOptions.packageInstall,
        })),
      ).toEqual([cdn, cdn]);
    });

    it('gives each served flow its own install from servedPackageInstall', async () => {
      const file = await writeFlow(flowJson());
      await bundle(file, {
        flowName: 'server',
        target: 'runner',
        buildOverrides: {
          output: output(),
          packageInstall: { tree: treeFor('server') },
        },
        servedPackageInstall: (flow) => ({ tree: treeFor(flow) }),
      });

      expect(
        calls().map(({ buildOptions, provenance }) => [
          provenance?.flowName,
          buildOptions.packageInstall,
        ]),
      ).toEqual([
        ['casamoda', { tree: treeFor('casamoda') }],
        ['venti', { tree: treeFor('venti') }],
        ['server', { tree: treeFor('server') }],
      ]);
    });
  });

  describe('an archive output', () => {
    let archive: string;

    beforeEach(async () => {
      archive = path.join(workDir, 'out', 'server.tar.gz');
      const file = await writeFlow(flowJson());
      await bundle(file, {
        flowName: 'server',
        buildOverrides: { output: archive },
      });
    });

    it('packs the server entries and exactly the listed paths', async () => {
      const entries: string[] = [];
      await tarList({
        file: archive,
        onReadEntry: (entry) => {
          if (entry.type !== 'Directory') entries.push(entry.path);
        },
      });

      expect(entries.sort()).toEqual([
        'casamoda/walker.js',
        'flow.mjs',
        'node_modules/demo-pkg/index.js',
        'package.json',
        'walker2.js',
      ]);
    });

    it('packs each web file as its flow built it', async () => {
      const extracted = path.join(workDir, 'extracted');
      await fs.ensureDir(extracted);
      await tarExtract({ cwd: extracted, file: archive });

      expect(await read(extracted, 'casamoda', 'walker.js')).toBe(
        '// casamoda',
      );
      expect(await read(extracted, 'walker2.js')).toBe('// venti');
    });
  });

  it('hands the built files to onServed after placement and removes them once bundle() settles', async () => {
    const file = await writeFlow(flowJson());
    const seen: Array<{
      flow: string;
      path: string;
      onDisk: boolean;
      placed: boolean;
    }> = [];
    const files: string[] = [];
    const onServed = jest.fn(async (built: readonly BuiltServedFlow[]) => {
      for (const entry of built) {
        seen.push({
          flow: entry.flow,
          path: entry.path,
          onDisk: await fs.pathExists(entry.file),
          placed: await fs.pathExists(path.join(dist, entry.path)),
        });
        files.push(entry.file);
      }
    });

    await bundle(file, {
      flowName: 'server',
      buildOverrides: { output: path.join(dist, 'flow.mjs') },
      onServed,
    });

    expect(onServed).toHaveBeenCalledTimes(1);
    expect(seen).toEqual([
      {
        flow: 'casamoda',
        path: 'casamoda/walker.js',
        onDisk: true,
        placed: true,
      },
      { flow: 'venti', path: 'walker2.js', onDisk: true, placed: true },
    ]);
    expect(
      await Promise.all(files.map((built) => fs.pathExists(built))),
    ).toEqual([false, false]);
  });

  it.each([
    ['stdout', undefined],
    ['URL upload', 'http://127.0.0.1:1/x'],
  ])(
    'builds the server alone for %s and names the flows left out',
    async (kind, output) => {
      mockBundleCore.mockImplementation(async (_flow, buildOptions) => {
        await fs.outputFile(buildOptions.output, '// server');
        return undefined;
      });
      const file = await writeFlow(flowJson());

      await expect(
        bundleCommand({ config: file, flow: 'server', output }),
      ).rejects.toThrow(ExitCalled);
      await fs.remove(mockBundleCore.mock.calls[0][1].output);

      expect(exit).toHaveBeenNthCalledWith(1, 0);
      expect(mockBundleCore).toHaveBeenCalledTimes(1);
      expect(lines).toContainEqual(
        expect.stringContaining(
          `Served flows left out (${kind}): casamoda, venti`,
        ),
      );
      expect(await findNamed(workDir, 'casamoda')).toEqual([]);
    },
  );

  it.each([
    [
      'without -o',
      undefined,
      1,
      {
        flowName: 'server',
        success: true,
        servedLeftOut: ['casamoda', 'venti'],
      },
    ],
    ['with a folder -o', 'dist', 3, { flowName: 'server', success: true }],
  ])(
    'names the served flows left out in the --json result %s',
    async (_name, output, builds, entry) => {
      const file = await writeFlow(flowJson());

      await expect(
        bundleCommand({
          config: file,
          flow: 'server',
          output: output && path.join(workDir, output),
          json: true,
        }),
      ).rejects.toThrow(ExitCalled);
      const written = mockWriteResult.mock.calls.map(([content]) =>
        String(content),
      );
      await fs.remove(mockBundleCore.mock.calls[0][1].output);

      expect(exit).toHaveBeenNthCalledWith(1, 0);
      expect(mockBundleCore).toHaveBeenCalledTimes(builds);
      // The first write is the result; the stubbed exit(0) throws, so the
      // catch writes an error result after it.
      const result: unknown = JSON.parse(written[0]);
      expect(result).toHaveProperty(['data', 'flows'], [entry]);
    },
  );

  describe('a call with buildOverrides.tempDir', () => {
    let work: string;
    let atServerBuild: string[];

    beforeEach(async () => {
      work = path.join(workDir, 'work');
      atServerBuild = [];
      // Each build installs into its tempDir, as installPackages does.
      mockBundleCore.mockImplementation(async (_flow, buildOptions) => {
        const tempDir = buildOptions.tempDir ?? workDir;
        if (buildOptions.platform === 'node') {
          atServerBuild = await fs.readdir(tempDir);
        }
        await fs.outputFile(
          path.join(tempDir, 'node_modules', '.installed'),
          '',
        );
        await fs.outputFile(buildOptions.output, '// built');
        return undefined;
      });
      const file = await writeFlow(flowJson());
      await bundle(file, {
        flowName: 'server',
        buildOverrides: { output: path.join(dist, 'flow.mjs'), tempDir: work },
      });
    });

    it('installs each served flow in a folder of its own inside it', () => {
      const roots = browserCalls().map(
        ({ buildOptions }) => buildOptions.tempDir,
      );

      expect(roots).toHaveLength(2);
      expect(new Set([...roots, work]).size).toBe(3);
      expect(
        roots.every((root) => root !== undefined && isInside(work, root)),
      ).toBe(true);
      expect(
        calls().find(({ buildOptions }) => buildOptions.platform === 'node')
          ?.buildOptions.tempDir,
      ).toBe(work);
    });

    it('removes each served install folder before the server builds', async () => {
      expect(atServerBuild).toEqual([]);
      expect(await fs.readdir(work)).toEqual(['node_modules']);
    });
  });

  it.each([
    [
      'the server bundle file',
      'server.mjs',
      'server.mjs',
      {},
      '"server.mjs" collides with "server.mjs", the server bundle\'s file',
    ],
    [
      'a file an include copies',
      'public/robots.txt',
      'flow.mjs',
      { include: ['./public'] },
      '"public/robots.txt" collides with a file that include "./public" copies',
    ],
  ])(
    'refuses a served path that %s takes before anything builds',
    async (_name, value, outputFile, root, line) => {
      await fs.outputFile(
        path.join(workDir, 'public', 'robots.txt'),
        'User-agent: *\n',
      );
      const file = await writeFlow(flowJson({ casamoda: value }, root));

      await expect(
        bundle(file, {
          flowName: 'server',
          buildOverrides: { output: path.join(dist, outputFile) },
        }),
      ).rejects.toThrow(
        `Invalid configuration:\n  - flows.server.config.bundle.flows.casamoda: ${line}`,
      );
      expect(mockBundleCore).not.toHaveBeenCalled();
    },
  );

  it.each([
    [
      'the server bundle file',
      'Server.mjs',
      'server.mjs',
      {},
      '"Server.mjs" collides with "server.mjs", the server bundle\'s file',
    ],
    [
      'a file an include copies',
      'Public/robots.txt',
      'flow.mjs',
      { include: ['./public'] },
      '"Public/robots.txt" collides with a file that include "./public" copies',
    ],
  ])(
    'refuses a served path whose first part is %s in another case',
    async (_name, value, outputFile, root, line) => {
      await fs.outputFile(
        path.join(workDir, 'public', 'robots.txt'),
        'User-agent: *\n',
      );
      const file = await writeFlow(flowJson({ casamoda: value }, root));

      await expect(
        bundle(file, {
          flowName: 'server',
          buildOverrides: { output: path.join(dist, outputFile) },
        }),
      ).rejects.toThrow(
        `Invalid configuration:\n  - flows.server.config.bundle.flows.casamoda: ${line}`,
      );
      expect(mockBundleCore).not.toHaveBeenCalled();
    },
  );

  it('places a served file inside an include folder that holds other files', async () => {
    await fs.outputFile(path.join(workDir, 'public', 'logo.png'), 'png');
    const file = await writeFlow(
      flowJson({ casamoda: 'public/walker.js' }, { include: ['./public'] }),
    );

    await bundle(file, {
      flowName: 'server',
      buildOverrides: { output: path.join(dist, 'flow.mjs') },
    });

    expect(await read(dist, 'public', 'logo.png')).toBe('png');
    expect(await read(dist, 'public', 'walker.js')).toBe('// casamoda');
  });

  const esbuildFailed = new Error('esbuild failed');

  it.each([
    [
      'its build rejects',
      flowJson(),
      esbuildFailed,
      esbuildFailed,
      'esbuild failed',
    ],
    [
      'it fails to load',
      flowJson(
        SERVED,
        {},
        {
          config: { platform: 'web' },
          collector: { globals: { ga4: '$env.GA4_ID' } },
        },
      ),
      undefined,
      expect.any(FlowReferenceError),
      'Environment variable "GA4_ID" not found and no default provided',
    ],
  ])(
    'fails naming the web flow when %s, before the server builds',
    async (_name, json, rejection, cause, message) => {
      mockBundleCore.mockImplementation(async (_flow, buildOptions) => {
        if (rejection) throw rejection;
        await fs.outputFile(buildOptions.output, '// built');
        return undefined;
      });
      const file = await writeFlow(json);

      const built = bundle(file, {
        flowName: 'server',
        buildEnv: {},
        buildOverrides: { output: path.join(dist, 'flow.mjs') },
      });

      await expect(built).rejects.toThrow(
        `Served flow casamoda failed to build: ${message}`,
      );
      await expect(built).rejects.toHaveProperty('cause', cause);
      expect(
        calls().some(({ buildOptions }) => buildOptions.platform === 'node'),
      ).toBe(false);
      expect(await fs.pathExists(dist)).toBe(false);
    },
  );

  const brokenCasamoda: Flow = {
    config: { platform: 'web' },
    collector: { globals: { ga4: '$env.GA4_ID' } },
  };

  it('loads every listed flow before it builds one, so a broken later flow fails first', async () => {
    const file = await writeFlow(
      flowJson(
        { venti: 'walker2.js', casamoda: 'casamoda/walker.js' },
        {},
        brokenCasamoda,
      ),
    );

    await expect(
      bundle(file, {
        flowName: 'server',
        buildEnv: {},
        buildOverrides: { output: path.join(dist, 'flow.mjs') },
      }),
    ).rejects.toThrow(
      'Served flow casamoda failed to build: Environment variable "GA4_ID" not found and no default provided',
    );
    expect(mockBundleCore).not.toHaveBeenCalled();
  });

  it('loadServedFlow rejects with the served line and the original error as its cause', async () => {
    const json = flowJson(SERVED, {}, brokenCasamoda);
    const file = await writeFlow(json);

    const loaded = loadServedFlow('casamoda', {
      rawConfig: json,
      configPath: file,
      buildEnv: {},
    });

    await expect(loaded).rejects.toThrow(
      'Served flow casamoda failed to build: Environment variable "GA4_ID" not found and no default provided',
    );
    await expect(loaded).rejects.toHaveProperty(
      'cause',
      expect.any(FlowReferenceError),
    );
  });

  it('reports the build error when removing its install folder fails too', async () => {
    const realRemove = fs.remove;
    jest
      .spyOn(fs, 'remove')
      .mockImplementation((dir: string) =>
        path.basename(dir).startsWith('served-')
          ? Promise.reject(new Error('EBUSY: resource busy or locked'))
          : realRemove(dir),
      );
    mockBundleCore.mockImplementation(async () => {
      throw esbuildFailed;
    });
    const file = await writeFlow(flowJson());

    const built = bundle(file, {
      flowName: 'server',
      buildOverrides: {
        output: path.join(dist, 'flow.mjs'),
        tempDir: path.join(workDir, 'work'),
      },
    });

    await expect(built).rejects.toThrow(
      'Served flow casamoda failed to build: esbuild failed',
    );
    await expect(built).rejects.toHaveProperty('cause', esbuildFailed);
  });

  describe('--all', () => {
    let out: string;

    beforeEach(async () => {
      out = path.join(workDir, 'out');
      const file = await writeFlow(flowJson());
      await expect(
        bundleCommand({
          config: file,
          all: true,
          output: out,
          release: 'r1',
          silent: true,
        }),
      ).rejects.toThrow(ExitCalled);
    });

    it('places the served files in the server flow folder and keeps each web flow folder', async () => {
      expect(exit).toHaveBeenNthCalledWith(1, 0);
      expect(await read(out, 'server', 'casamoda', 'walker.js')).toBe(
        '// casamoda',
      );
      expect(await fs.pathExists(path.join(out, 'server', 'flow.mjs'))).toBe(
        true,
      );
      expect(await read(out, 'casamoda', 'walker.js')).toBe('// casamoda');
    });

    it('stamps the release on the flow it builds, never on its served build', () => {
      const casamoda = calls().filter(
        ({ provenance }) => provenance?.flowName === 'casamoda',
      );
      const standalone = path.join(out, 'casamoda', 'walker.js');

      expect(
        casamoda.map(({ buildOptions, provenance }) => [
          path.resolve(buildOptions.output) === standalone,
          provenance?.release,
        ]),
      ).toEqual(
        expect.arrayContaining([
          [true, 'r1'],
          [false, undefined],
        ]),
      );
      expect(casamoda).toHaveLength(2);
    });
  });

  it('stamps the release on the server and builds each served flow with its own digest', async () => {
    const json = flowJson();
    const file = await writeFlow(json);
    const digest = (flowName: string): string =>
      loadBundleConfig(json, { configPath: file, flowName }).configDigest;

    await bundle(file, {
      flowName: 'server',
      release: 'r1',
      buildOverrides: { output: path.join(dist, 'flow.mjs') },
    });

    expect(calls().map(({ provenance }) => provenance)).toStrictEqual([
      { flowName: 'casamoda', configDigest: digest('casamoda') },
      { flowName: 'venti', configDigest: digest('venti') },
      { flowName: 'server', release: 'r1', configDigest: digest('server') },
    ]);
  });
});
