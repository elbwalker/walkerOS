import path from 'path';
import { resolvePackageImportPath } from '../../../core/package-path.js';

describe('resolvePackageImportPath', () => {
  const configDir = '/workspace/my-project';

  it('returns bare package name when no packages config', () => {
    expect(resolvePackageImportPath('@walkeros/dest-ga4', {}, configDir)).toBe(
      '@walkeros/dest-ga4',
    );
  });

  it('returns bare package name when packages is undefined', () => {
    expect(
      resolvePackageImportPath('@walkeros/dest-ga4', undefined, configDir),
    ).toBe('@walkeros/dest-ga4');
  });

  it('returns bare package name when package has no path field', () => {
    const packages = {
      '@walkeros/dest-ga4': { version: '1.0.0' },
    };
    expect(
      resolvePackageImportPath('@walkeros/dest-ga4', packages, configDir),
    ).toBe('@walkeros/dest-ga4');
  });

  it('resolves relative local path against configDir', () => {
    const packages = {
      '@walkeros/dest-ga4': { path: '../my-local-ga4' },
    };
    expect(
      resolvePackageImportPath('@walkeros/dest-ga4', packages, configDir),
    ).toBe(path.resolve(configDir, '../my-local-ga4'));
  });

  it('preserves absolute local path', () => {
    const packages = {
      '@walkeros/dest-ga4': { path: '/opt/packages/ga4' },
    };
    expect(
      resolvePackageImportPath('@walkeros/dest-ga4', packages, configDir),
    ).toBe('/opt/packages/ga4');
  });

  it('returns bare name for unknown package', () => {
    const packages = {
      '@walkeros/dest-ga4': { path: '../ga4' },
    };
    expect(
      resolvePackageImportPath('@walkeros/other-pkg', packages, configDir),
    ).toBe('@walkeros/other-pkg');
  });

  it('resolves subpath appended to local path', () => {
    const packages = {
      '@walkeros/dest-ga4': { path: '../my-local-ga4' },
    };
    expect(
      resolvePackageImportPath(
        '@walkeros/dest-ga4',
        packages,
        configDir,
        '/dev',
      ),
    ).toBe(path.join(path.resolve(configDir, '../my-local-ga4'), 'dev'));
  });

  it('appends subpath to bare package name when no local path', () => {
    expect(
      resolvePackageImportPath('@walkeros/dest-ga4', {}, configDir, '/dev'),
    ).toBe('@walkeros/dest-ga4/dev');
  });
});
