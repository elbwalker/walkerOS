import { validateEnv } from '../../runtime/env.js';

describe('validateEnv', () => {
  it('returns local mode with no env vars', () => {
    const config = validateEnv({});
    expect(config.mode).toBe('collect');
    expect(config.apiEnabled).toBe(false);
    expect(config.remoteConfig).toBe(false);
    expect(config.pollInterval).toBe(30);
    expect(config.heartbeatInterval).toBe(60);
  });

  it('returns registered mode with TOKEN + PROJECT_ID', () => {
    const config = validateEnv({
      WALKEROS_TOKEN: 'sk-walkeros-abc',
      PROJECT_ID: 'proj_xxx',
    });
    expect(config.apiEnabled).toBe(true);
    expect(config.remoteConfig).toBe(false);
  });

  it('returns remote mode with TOKEN + PROJECT_ID + FLOW_ID', () => {
    const config = validateEnv({
      WALKEROS_TOKEN: 'sk-walkeros-abc',
      PROJECT_ID: 'proj_xxx',
      FLOW_ID: 'flow_xxx',
    });
    expect(config.apiEnabled).toBe(true);
    expect(config.remoteConfig).toBe(true);
  });

  it('throws if FLOW_ID without TOKEN', () => {
    expect(() => validateEnv({ FLOW_ID: 'flow_xxx' })).toThrow(
      'FLOW_ID requires WALKEROS_TOKEN and PROJECT_ID',
    );
  });

  it('throws if TOKEN without PROJECT_ID', () => {
    expect(() => validateEnv({ WALKEROS_TOKEN: 'sk-walkeros-abc' })).toThrow(
      'WALKEROS_TOKEN requires PROJECT_ID',
    );
  });

  it('uses custom intervals when provided', () => {
    const config = validateEnv({
      POLL_INTERVAL: '15',
      HEARTBEAT_INTERVAL: '120',
    });
    expect(config.pollInterval).toBe(15);
    expect(config.heartbeatInterval).toBe(120);
  });

  it('uses serve mode when MODE=serve', () => {
    const config = validateEnv({ MODE: 'serve' });
    expect(config.mode).toBe('serve');
  });

  it('uses custom port', () => {
    const config = validateEnv({ PORT: '3000' });
    expect(config.port).toBe(3000);
  });

  it('uses custom bundle path', () => {
    const config = validateEnv({ BUNDLE: '/custom/path.mjs' });
    expect(config.bundlePath).toBe('/custom/path.mjs');
  });

  it('uses custom cache dir', () => {
    const config = validateEnv({ CACHE_DIR: '/tmp/cache' });
    expect(config.cacheDir).toBe('/tmp/cache');
  });
});
