import { parsePackageSpec } from '../bundler';

describe('parsePackageSpec', () => {
  it.each([
    ['@walkeros/web-source-browser', '@walkeros/web-source-browser', undefined],
    [
      '@walkeros/web-source-browser@1.2.3',
      '@walkeros/web-source-browser',
      '1.2.3',
    ],
    ['lodash', 'lodash', undefined],
    ['lodash@4.17.21', 'lodash', '4.17.21'],
    [
      '@walkeros/web-source-browser@4.3.0-next-1783517345197',
      '@walkeros/web-source-browser',
      '4.3.0-next-1783517345197',
    ],
    ['@walkeros/collector@^2.0.0', '@walkeros/collector', '^2.0.0'],
    ['@walkeros/collector@latest', '@walkeros/collector', 'latest'],
  ])('parses %s', (spec, name, version) => {
    expect(parsePackageSpec(spec)).toEqual(
      version === undefined ? { name } : { name, version },
    );
  });

  it('treats a trailing @ as no version', () => {
    expect(parsePackageSpec('@walkeros/core@')).toEqual({
      name: '@walkeros/core',
    });
  });

  it('never splits on the scope @ at index 0', () => {
    expect(parsePackageSpec('@scope-only')).toEqual({ name: '@scope-only' });
  });
});
