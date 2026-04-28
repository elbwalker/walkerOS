import { buildInitConfig } from '../init-config.js';

describe('buildInitConfig', () => {
  const env = {
    os: 'linux',
    osVersion: '6.x',
    node: 'v22.0.0',
    language: 'en-US',
    timezone: 'UTC',
  };

  it('produces an init config with user, consent, and destination', () => {
    const cfg = buildInitConfig({
      installationId: 'install-1',
      environment: env,
      endpoint: 'http://example/api/telemetry',
    });
    expect(cfg.consent).toEqual({ telemetry: true });
    expect(cfg.user).toMatchObject({
      device: 'install-1',
      os: 'linux',
      osVersion: '6.x',
      node: 'v22.0.0',
      language: 'en-US',
      timezone: 'UTC',
    });
    expect(cfg.user?.session).toBeUndefined();
    expect(cfg.destinations?.api).toMatchObject({
      package: '@walkeros/server-destination-api',
      config: { url: 'http://example/api/telemetry' },
    });
  });

  it('includes user.session when provided (MCP case)', () => {
    const cfg = buildInitConfig({
      installationId: 'install-1',
      session: 'sess-abc',
      environment: env,
      endpoint: 'http://example',
    });
    expect(cfg.user?.session).toBe('sess-abc');
  });
});
