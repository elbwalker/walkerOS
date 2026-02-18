import {
  initStatus,
  setRunning,
  setDegraded,
  getStatus,
  updateConfigVersion,
  updateLastPoll,
  updateLastHeartbeat,
} from '../../runtime/status.js';

describe('status module', () => {
  beforeEach(() => {
    initStatus({
      mode: 'collect',
      port: 8080,
      configSource: 'local',
      apiEnabled: false,
    });
  });

  it('returns starting status after init', () => {
    const status = getStatus();
    expect(status.status).toBe('starting');
    expect(status.mode).toBe('collect');
    expect(status.port).toBe(8080);
    expect(status.configSource).toBe('local');
    expect(status.apiEnabled).toBe(false);
    expect(status.version).toBeDefined();
    expect(status.instanceId).toBeDefined();
  });

  it('transitions to running', () => {
    setRunning();
    expect(getStatus().status).toBe('running');
  });

  it('transitions to degraded', () => {
    setDegraded();
    expect(getStatus().status).toBe('degraded');
  });

  it('tracks config version', () => {
    updateConfigVersion('v2');
    expect(getStatus().configVersion).toBe('v2');
  });

  it('tracks poll and heartbeat timestamps', () => {
    expect(getStatus().lastPoll).toBeUndefined();
    expect(getStatus().lastHeartbeat).toBeUndefined();

    updateLastPoll();
    updateLastHeartbeat();

    expect(getStatus().lastPoll).toBeDefined();
    expect(getStatus().lastHeartbeat).toBeDefined();
  });

  it('tracks uptime', () => {
    const status = getStatus();
    expect(status.uptime).toBeGreaterThanOrEqual(0);
  });
});
