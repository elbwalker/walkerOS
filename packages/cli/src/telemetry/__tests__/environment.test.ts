import { getEnvironment } from '../environment.js';

describe('getEnvironment', () => {
  it('returns platform-appropriate user fields', () => {
    const env = getEnvironment();
    expect(['linux', 'darwin', 'win32', 'freebsd', 'openbsd']).toContain(
      env.os,
    );
    expect(env.osVersion).toEqual(expect.any(String));
    expect(env.node).toMatch(/^v\d+\.\d+\.\d+/);
    expect(env.language).toEqual(expect.any(String));
    expect(env.timezone).toEqual(expect.any(String));
  });
});
