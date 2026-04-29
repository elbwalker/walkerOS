// The monaco-types module imports `virtual:walkeros-core-types` which is a
// build-time virtual module resolved by tsup. Jest doesn't know how to resolve
// it, so stub it with an empty string at module load time.
jest.mock('virtual:walkeros-core-types', () => '', { virtual: true });

import { setPackageTypesBaseUrl, resolveTypesUrl } from '../monaco-types';

describe('resolveTypesUrl', () => {
  beforeEach(() => setPackageTypesBaseUrl(undefined));
  afterAll(() => setPackageTypesBaseUrl(undefined));

  it('uses the configured baseUrl when set', () => {
    setPackageTypesBaseUrl('/api/packages');
    expect(resolveTypesUrl('@walkeros/x', '1.0.0')).toBe(
      '/api/packages/%40walkeros%2Fx/types?version=1.0.0',
    );
  });

  it('falls back to jsdelivr when baseUrl is unset', () => {
    setPackageTypesBaseUrl(undefined);
    expect(resolveTypesUrl('@walkeros/x', '1.0.0')).toBe(
      'https://cdn.jsdelivr.net/npm/@walkeros/x@1.0.0/dist/index.d.ts',
    );
  });

  it('encodes special characters in version', () => {
    setPackageTypesBaseUrl('/api/packages');
    expect(resolveTypesUrl('@walkeros/x', '1.0.0-beta+1')).toBe(
      '/api/packages/%40walkeros%2Fx/types?version=1.0.0-beta%2B1',
    );
  });

  // Trailing-slash handling: the resolver inserts a `/` between baseUrl and the
  // package name. Callers MUST NOT pass a trailing slash; passing one produces
  // a double slash. This is documented in `setPackageTypesBaseUrl`'s JSDoc.
  it('produces a double slash if caller passes a trailing slash (documented contract)', () => {
    setPackageTypesBaseUrl('/api/packages/');
    expect(resolveTypesUrl('@walkeros/x', '1.0.0')).toBe(
      '/api/packages//%40walkeros%2Fx/types?version=1.0.0',
    );
  });
});
