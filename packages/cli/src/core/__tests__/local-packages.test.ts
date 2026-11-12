import {
  resolveLocalPackage,
  copyLocalPackage,
  entriesOutsideDist,
} from '../local-packages';
import { hashInstalledDir } from '../content-digest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { createMockLogger } from '@walkeros/core';

const logger = createMockLogger();

describe('resolveLocalPackage', () => {
  const tmpDir = path.join(os.tmpdir(), `test-local-pkg-${Date.now()}`);

  beforeAll(async () => {
    await fs.ensureDir(path.join(tmpDir, 'src'));

    // Single .ts file
    await fs.writeFile(
      path.join(tmpDir, 'src', 'decoder.ts'),
      'export default function() {}',
    );

    // Directory without package.json
    await fs.ensureDir(path.join(tmpDir, 'src', 'utils'));
    await fs.writeFile(
      path.join(tmpDir, 'src', 'utils', 'index.ts'),
      'export default {}',
    );

    // Directory with package.json
    await fs.ensureDir(path.join(tmpDir, 'src', 'full-pkg'));
    await fs.writeJson(path.join(tmpDir, 'src', 'full-pkg', 'package.json'), {
      name: 'full-pkg',
      main: './index.ts',
    });
    await fs.writeFile(
      path.join(tmpDir, 'src', 'full-pkg', 'index.ts'),
      'export default {}',
    );
  });

  afterAll(() => fs.remove(tmpDir));

  it('resolves single .ts file (path without extension)', async () => {
    const result = await resolveLocalPackage(
      'my-decoder',
      './src/decoder',
      tmpDir,
      logger,
    );
    expect(result.type).toBe('file');
    expect(result.absolutePath).toContain('decoder.ts');
  });

  it('resolves single .ts file (path with extension)', async () => {
    const result = await resolveLocalPackage(
      'my-decoder',
      './src/decoder.ts',
      tmpDir,
      logger,
    );
    expect(result.type).toBe('file');
  });

  it('resolves directory without package.json', async () => {
    const result = await resolveLocalPackage(
      'my-utils',
      './src/utils',
      tmpDir,
      logger,
    );
    expect(result.type).toBe('directory');
  });

  it('resolves directory with package.json', async () => {
    const result = await resolveLocalPackage(
      'full-pkg',
      './src/full-pkg',
      tmpDir,
      logger,
    );
    expect(result.type).toBe('package');
  });

  it('throws for nonexistent path', async () => {
    await expect(
      resolveLocalPackage('nope', './src/nope', tmpDir, logger),
    ).rejects.toThrow('not found');
  });
});

describe('copyLocalPackage', () => {
  const tmpDir = path.join(os.tmpdir(), `test-copy-pkg-${Date.now()}`);
  const targetDir = path.join(tmpDir, 'build');

  beforeAll(async () => {
    await fs.ensureDir(path.join(tmpDir, 'src'));
    await fs.writeFile(
      path.join(tmpDir, 'src', 'decoder.ts'),
      'export default function decode() {}',
    );
  });

  afterAll(() => fs.remove(tmpDir));

  it('copies single file with generated package.json', async () => {
    const resolved = await resolveLocalPackage(
      'my-decoder',
      './src/decoder',
      tmpDir,
      logger,
    );
    const pkgDir = await copyLocalPackage(resolved, targetDir, logger);

    expect(await fs.pathExists(path.join(pkgDir, 'index.ts'))).toBe(true);
    expect(await fs.pathExists(path.join(pkgDir, 'package.json'))).toBe(true);

    const pkg = await fs.readJson(path.join(pkgDir, 'package.json'));
    expect(pkg.main).toBe('./index.ts');
  });
});

describe('copyLocalPackage entry points outside dist', () => {
  let root: string;

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'local-pkg-entry-'));
  });

  afterEach(() => fs.remove(root));

  async function install(files: Record<string, string>): Promise<string> {
    const source = path.join(root, 'src-pkg');
    for (const [rel, content] of Object.entries(files))
      await fs.outputFile(path.join(source, rel), content);
    const info = await resolveLocalPackage('pkg', source, root, logger);
    return copyLocalPackage(info, path.join(root, 'target'), logger);
  }

  // A `main` in lib/ beside a browser build in dist/, as `qs` ships.
  it('copies the package root when main lies outside dist', async () => {
    const dir = await install({
      'package.json': JSON.stringify({
        name: 'pkg',
        main: 'lib/index.js',
        browser: 'dist/pkg.js',
      }),
      'lib/index.js': 'module.exports = { answer: 42 };',
      'dist/pkg.js': 'window.pkg = {};',
      'node_modules/dep/index.js': 'module.exports = 1;',
    });

    expect(await fs.pathExists(path.join(dir, 'lib/index.js'))).toBe(true);
    expect(await fs.pathExists(path.join(dir, 'dist/pkg.js'))).toBe(true);
    expect(await fs.pathExists(path.join(dir, 'node_modules'))).toBe(false);
    const { main } = await fs.readJson(path.join(dir, 'package.json'));
    expect(await fs.readFile(path.join(dir, main), 'utf8')).toContain(
      'answer: 42',
    );
  });

  it('leaves node_modules out at any depth', async () => {
    const dir = await install({
      'package.json': JSON.stringify({ name: 'pkg', main: 'lib/index.js' }),
      'lib/index.js': 'module.exports = {};',
      'lib/node_modules/inner/index.js': 'module.exports = 1;',
      'dist/pkg.js': '',
    });

    expect(await fs.pathExists(path.join(dir, 'lib/index.js'))).toBe(true);
    expect(await fs.pathExists(path.join(dir, 'lib/node_modules'))).toBe(false);
  });

  it.each<[string, Record<string, string>]>([
    [
      'a root copy',
      {
        'package.json': JSON.stringify({ name: 'pkg', main: 'lib/index.js' }),
        'lib/index.js': '',
        'dist/pkg.js': '',
      },
    ],
    [
      'a package without dist',
      {
        'package.json': JSON.stringify({ name: 'pkg', main: 'index.js' }),
        'index.js': '',
      },
    ],
  ])('leaves .env files out of %s', async (_case, files) => {
    const dir = await install({
      ...files,
      '.env': 'SECRET=1',
      '.env.local': 'SECRET=2',
      'lib/.env.production': 'SECRET=3',
    });

    expect(await fs.pathExists(path.join(dir, 'package.json'))).toBe(true);
    expect(await fs.pathExists(path.join(dir, '.env'))).toBe(false);
    expect(await fs.pathExists(path.join(dir, '.env.local'))).toBe(false);
    expect(await fs.pathExists(path.join(dir, 'lib/.env.production'))).toBe(
      false,
    );
  });

  it('copies only dist when every entry point lies in it', async () => {
    const dir = await install({
      'package.json': JSON.stringify({
        name: 'pkg',
        main: './dist/index.js',
        exports: {
          '.': {
            types: './types/index.d.ts',
            import: './dist/index.mjs',
            require: './dist/index.js',
          },
          './package.json': './package.json',
          './schema.json': './schema.json',
        },
      }),
      'types/index.d.ts': 'export {};',
      'schema.json': '{}',
      'dist/index.js': 'module.exports = {};',
      'dist/index.mjs': 'export {};',
      'src/index.ts': 'export {};',
    });

    expect(await fs.pathExists(path.join(dir, 'dist/index.mjs'))).toBe(true);
    expect(await fs.pathExists(path.join(dir, 'src'))).toBe(false);
  });
});

describe('entriesOutsideDist', () => {
  it.each<[string, unknown, boolean]>([
    ['main in lib', { main: 'lib/index.js' }, true],
    ['main in dist', { main: './dist/index.js' }, false],
    [
      'an exports condition outside dist',
      {
        exports: {
          '.': { node: './lib/node.js', default: './dist/index.mjs' },
        },
      },
      true,
    ],
    ['a bin outside dist', { bin: { tool: './bin/tool.js' } }, true],
    ['no entry fields', { name: 'pkg' }, false],
    [
      'only a types condition and a json file outside dist',
      {
        main: 'dist/index.js',
        exports: {
          '.': { types: './types/index.d.ts', default: './dist/index.js' },
          './data.json': './data.json',
          './extra': { typings: './extra.d.mts', default: './dist/extra.js' },
        },
      },
      false,
    ],
    [
      'the manifest exported',
      {
        main: 'dist/index.js',
        exports: { './package.json': './package.json' },
      },
      false,
    ],
  ])('%s', (_name, manifest, outside) => {
    expect(entriesOutsideDist(manifest)).toBe(outside);
  });
});

describe('installed copy hash covers exactly the copied set', () => {
  let root: string;

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'local-pkg-hash-'));
  });

  afterEach(() => fs.remove(root));

  async function installedHash(source: string): Promise<string> {
    const target = path.join(root, `target-${Date.now()}-${Math.random()}`);
    const info = await resolveLocalPackage('pkg', source, root, logger);
    return hashInstalledDir(await copyLocalPackage(info, target, logger));
  }

  it.each([
    // [case, files, consumed edit, ignored edit]
    [
      'package',
      {
        'package.json': '{"name":"pkg"}',
        'dist/index.mjs': 'v1',
        'src/a.ts': 's1',
      },
      'dist/index.mjs',
      'src/a.ts',
    ],
    [
      'directory',
      { 'index.ts': 'v1', 'node_modules/dep/index.js': 'd1' },
      'index.ts',
      'node_modules/dep/index.js',
    ],
  ])(
    '%s: a consumed file changes the hash, an excluded one does not',
    async (_case, files, consumed, ignored) => {
      const source = path.join(root, 'src-pkg');
      for (const [rel, content] of Object.entries(files)) {
        await fs.outputFile(path.join(source, rel), content);
      }
      const before = await installedHash(source);

      await fs.outputFile(path.join(source, ignored), 'changed');
      expect(await installedHash(source)).toBe(before);

      await fs.outputFile(path.join(source, consumed), 'changed');
      expect(await installedHash(source)).not.toBe(before);
    },
  );

  it('file: the one file is consumed', async () => {
    const file = path.join(root, 'decoder.ts');
    await fs.outputFile(file, 'v1');
    const before = await installedHash(file);
    await fs.outputFile(file, 'v2');
    expect(await installedHash(file)).not.toBe(before);
  });
});
