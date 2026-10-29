import { packageMetaOf, parsePackageMeta } from '../packageMeta';

describe('parsePackageMeta', () => {
  it('keeps every $meta field that has its published type', () => {
    const meta = {
      package: '@walkeros/web-destination-x',
      version: '1.0.0',
      type: 'destination',
      platform: ['web'],
      renderer: 'web',
      exports: { destinationX: 'X' },
      docs: 'https://www.walkeros.io/docs/x',
      source: 'https://github.com/elbwalker/walkerOS/tree/main/x/src',
    };
    expect(parsePackageMeta({ ...meta, bundle: { external: [] } })).toEqual(
      meta,
    );
  });

  it('drops mistyped fields and lists a single platform', () => {
    expect(
      parsePackageMeta({
        package: 1,
        version: '1.0.0',
        platform: 'web',
        exports: { destinationX: 1 },
      }),
    ).toEqual({ version: '1.0.0', platform: ['web'] });
    expect(parsePackageMeta(undefined)).toEqual({});
  });
});

describe('packageMetaOf', () => {
  const pkg = {
    name: '@walkeros/web-destination-x',
    version: '1.0.0',
    repository: {
      url: 'git+https://github.com/elbwalker/walkerOS.git',
      directory: 'packages/web/destinations/x',
    },
  };

  it('writes the $meta of a package.json, in the order walkerOS.json publishes it', () => {
    const meta = packageMetaOf({
      ...pkg,
      walkerOS: {
        docs: 'https://www.walkeros.io/docs/x',
        renderer: 'web',
        platform: 'web',
        type: 'destination',
        bundle: { external: [] },
      },
    });
    expect(JSON.stringify(meta)).toBe(
      JSON.stringify({
        package: '@walkeros/web-destination-x',
        version: '1.0.0',
        type: 'destination',
        platform: ['web'],
        renderer: 'web',
        exports: {},
        docs: 'https://www.walkeros.io/docs/x',
        source:
          'https://github.com/elbwalker/walkerOS/tree/main/packages/web/destinations/x/src',
      }),
    );
  });

  const two = { destinationA: 'A', destinationB: 'B' };
  it.each([
    [
      'a multi-export package keeps its declared exports',
      { type: 'destination', exports: two },
      two,
    ],
    [
      'a single-export package keeps its one declared export',
      { type: 'destination', exports: { destinationA: 'A' } },
      { destinationA: 'A' },
    ],
    [
      'a step package without declared exports publishes an empty list',
      { type: 'source' },
      {},
    ],
    ['a non-step package publishes no list', { type: 'core' }, undefined],
    ['a package without a type publishes no list', {}, undefined],
  ])('%s', (_label, walkerOS, exports) => {
    expect(packageMetaOf({ ...pkg, walkerOS }).exports).toEqual(exports);
  });

  it('publishes no source without a repository directory', () => {
    expect(
      packageMetaOf({ name: pkg.name, version: '1.0.0' }).source,
    ).toBeUndefined();
  });

  it.each([
    ['no name', { version: '1.0.0' }, 'package.json names no package'],
    [
      'no version',
      { name: pkg.name },
      '@walkeros/web-destination-x: package.json names no version',
    ],
  ])('throws for a package.json with %s', (_label, given, message) => {
    expect(() => packageMetaOf(given)).toThrow(message);
  });
});
