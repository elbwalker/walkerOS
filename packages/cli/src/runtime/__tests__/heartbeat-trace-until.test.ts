/**
 * Heartbeat -> traceUntil propagation.
 *
 * The app's heartbeat response carries the deployment's `traceUntil` value
 * (ISO timestamp or null). The CLI heartbeat client copies it into
 * `process.env.WALKEROS_TRACE_UNTIL` so the next call to
 * `resolveTelemetryOptions` picks the new state up without a redeploy.
 *
 * The resolver itself is exercised in `@walkeros/core`; here we assert the
 * plumbing: heartbeat tick reads the response field, env var is updated,
 * and the resolver, when re-invoked, returns trace-level options.
 */
import { createLogger, resolveTelemetryOptions } from '@walkeros/core';
import { createHeartbeat } from '../heartbeat.js';

function silentLogger() {
  // Custom handler swallows everything. Keeps test output clean while
  // still giving us a fully-typed Logger.Instance without test-only casts.
  return createLogger({ handler: () => undefined });
}

describe('heartbeat traceUntil propagation', () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = process.env.WALKEROS_TRACE_UNTIL;

  beforeEach(() => {
    delete process.env.WALKEROS_TRACE_UNTIL;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    if (originalEnv === undefined) {
      delete process.env.WALKEROS_TRACE_UNTIL;
    } else {
      process.env.WALKEROS_TRACE_UNTIL = originalEnv;
    }
    jest.restoreAllMocks();
  });

  it('writes traceUntil from the heartbeat response into the env, so the resolver upgrades to trace level', async () => {
    const future = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    globalThis.fetch = jest.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: () => Promise.resolve({ traceUntil: future }),
    });

    const heartbeat = createHeartbeat(
      {
        appUrl: 'http://localhost:3000',
        token: 'sk-walkeros-test',
        projectId: 'proj_1',
        flowId: 'flow_1',
        deploymentId: 'dep_1',
        intervalMs: 60000,
      },
      silentLogger(),
    );

    await heartbeat.sendOnce();

    expect(process.env.WALKEROS_TRACE_UNTIL).toBe(future);

    const opts = resolveTelemetryOptions({
      flowId: 'flow_1',
    });
    expect(opts).toEqual({
      flowId: 'flow_1',
      level: 'trace',
      includeIn: true,
      includeOut: true,
      sample: 1,
    });
  });

  it('clears the env var when the heartbeat response has traceUntil: null, so the resolver falls back to flow config', async () => {
    // Seed a stale env value from a previous trace window.
    process.env.WALKEROS_TRACE_UNTIL = new Date(
      Date.now() + 60_000,
    ).toISOString();

    globalThis.fetch = jest.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: () => Promise.resolve({ traceUntil: null }),
    });

    const heartbeat = createHeartbeat(
      {
        appUrl: 'http://localhost:3000',
        token: 'sk-walkeros-test',
        projectId: 'proj_1',
        flowId: 'flow_1',
        deploymentId: 'dep_1',
        intervalMs: 60000,
      },
      silentLogger(),
    );

    await heartbeat.sendOnce();

    expect(process.env.WALKEROS_TRACE_UNTIL).toBeUndefined();

    const opts = resolveTelemetryOptions({
      flowId: 'flow_1',
      observe: { level: 'standard' },
    });
    expect(opts).toEqual({
      flowId: 'flow_1',
      level: 'standard',
      sample: 1,
    });
  });

  it('leaves the env var untouched when the response body cannot be parsed', async () => {
    const previous = new Date(Date.now() + 60_000).toISOString();
    process.env.WALKEROS_TRACE_UNTIL = previous;

    globalThis.fetch = jest.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: () => Promise.reject(new Error('not json')),
    });

    const heartbeat = createHeartbeat(
      {
        appUrl: 'http://localhost:3000',
        token: 'sk-walkeros-test',
        projectId: 'proj_1',
        flowId: 'flow_1',
        deploymentId: 'dep_1',
        intervalMs: 60000,
      },
      silentLogger(),
    );

    await heartbeat.sendOnce();

    expect(process.env.WALKEROS_TRACE_UNTIL).toBe(previous);
  });

  it('does not touch the env var when the heartbeat fails (non-2xx)', async () => {
    const previous = new Date(Date.now() + 60_000).toISOString();
    process.env.WALKEROS_TRACE_UNTIL = previous;

    globalThis.fetch = jest.fn().mockResolvedValue({
      status: 500,
      ok: false,
      json: () => Promise.resolve({ traceUntil: null }),
    });

    const heartbeat = createHeartbeat(
      {
        appUrl: 'http://localhost:3000',
        token: 'sk-walkeros-test',
        projectId: 'proj_1',
        flowId: 'flow_1',
        deploymentId: 'dep_1',
        intervalMs: 60000,
      },
      silentLogger(),
    );

    await heartbeat.sendOnce();

    expect(process.env.WALKEROS_TRACE_UNTIL).toBe(previous);
  });
});
