import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { buildModules } from '../index.mjs';

describe('buildModules createRequire banner', () => {
  let dir;

  const configFor = (walkerOS) => {
    dir = mkdtempSync(join(tmpdir(), 'walkeros-banner-'));
    writeFileSync(
      join(dir, 'package.json'),
      JSON.stringify({ name: 'pkg', version: '1.0.0', walkerOS }),
    );
    jest.spyOn(process, 'cwd').mockReturnValue(dir);
    return buildModules();
  };

  afterEach(() => {
    jest.restoreAllMocks();
    rmSync(dir, { recursive: true, force: true });
  });

  it('adds createRequire to the ESM build of a server package', () => {
    const config = configFor({ type: 'destination', platform: 'server' });
    expect(config.banner({ format: 'esm' }).js).toContain('createRequire');
    expect(config.banner({ format: 'cjs' }).js).toBeUndefined();
  });

  it('reads a platform list', () => {
    const config = configFor({ type: 'destination', platform: ['server'] });
    expect(config.banner({ format: 'esm' }).js).toContain('createRequire');
  });

  it.each([
    ['a web package', { type: 'destination', platform: ['web'] }],
    ['a package for web and server', { platform: ['web', 'server'] }],
    ['a package without a platform', undefined],
  ])('adds no banner to %s', (_, walkerOS) => {
    expect(configFor(walkerOS).banner).toBeUndefined();
  });
});
