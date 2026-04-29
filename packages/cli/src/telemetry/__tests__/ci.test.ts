import { getCiInfo } from '../ci.js';

describe('getCiInfo', () => {
  it('returns ci=false in a non-CI environment', () => {
    const info = getCiInfo({ isCI: false });
    expect(info.ci).toBe(false);
    expect(info.ci_name).toBeUndefined();
  });

  it('returns ci=true with vendor name when on CI', () => {
    const info = getCiInfo({ isCI: true, name: 'GitHub Actions' });
    expect(info.ci).toBe(true);
    expect(info.ci_name).toBe('GitHub Actions');
  });

  it('omits ci_name when CI detected but vendor unknown', () => {
    const info = getCiInfo({ isCI: true, name: null });
    expect(info.ci).toBe(true);
    expect(info.ci_name).toBeUndefined();
  });
});
