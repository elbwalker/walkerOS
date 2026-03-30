import { resolveLocalPackage, copyLocalPackage } from '../local-packages';
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
