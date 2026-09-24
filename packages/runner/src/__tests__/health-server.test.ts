import http from 'http';
import { createHealthServer } from '../health-server.js';
import { createMockLogger } from './helpers/mock-logger.js';

function portOf(server: http.Server): number {
  const address = server.address();
  if (address === null || typeof address === 'string')
    throw new Error('server is not listening on a port');
  return address.port;
}

const mockLogger = createMockLogger();

function fetch(
  port: number,
  path: string,
): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://127.0.0.1:${port}${path}`, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => resolve({ status: res.statusCode!, body }));
    });
    req.on('error', reject);
  });
}

let server: Awaited<ReturnType<typeof createHealthServer>>;
let port: number;

beforeEach(async () => {
  // Use port 0 for random available port
  server = await createHealthServer(0, mockLogger);
  port = portOf(server.server);
});

afterEach(async () => {
  await server.close();
});

describe('createHealthServer', () => {
  it('responds 200 to GET /health', async () => {
    const res = await fetch(port, '/health');
    expect(res.status).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ status: 'ok' });
  });

  it('responds 503 to GET /ready before the collector is constructed', async () => {
    const res = await fetch(port, '/ready');
    expect(res.status).toBe(503);
    expect(JSON.parse(res.body)).toEqual({ status: 'not_ready' });
  });

  it('responds 200 to GET /ready after setReady(true)', async () => {
    server.setReady(true);
    const res = await fetch(port, '/ready');
    expect(res.status).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ status: 'ready' });
  });

  it('stays 503 to GET /ready when only the flow handler is set (no readiness)', async () => {
    // Mounting an HTTP handler is not the readiness signal, collector
    // construction is. Without setReady, /ready must not flip to 200.
    server.setFlowHandler((_req, res) => {
      res.writeHead(200);
      res.end('flow');
    });
    const res = await fetch(port, '/ready');
    expect(res.status).toBe(503);
  });

  it('responds 503 with a generic reason, never the raw error, when construction failed', async () => {
    const secret = 'sk_live_abcdefghijklmnopqrstuvwxyz0123';
    server.setFailed(`Auth failed with key ${secret} at /app/flow/flow.mjs`);
    const res = await fetch(port, '/ready');
    expect(res.status).toBe(503);
    expect(JSON.parse(res.body)).toEqual({
      status: 'failed',
      reason: 'flow failed to start, see the runtime log',
    });
    expect(res.body).not.toContain(secret);
    expect(res.body).not.toContain('/app/flow');
  });

  it('logs the failure detail redacted', () => {
    const secret = 'sk_live_abcdefghijklmnopqrstuvwxyz0123';
    server.setFailed(`Auth failed with key ${secret}`);
    const logged = jest
      .mocked(mockLogger.error)
      .mock.calls.map(([message]) => String(message))
      .join('\n');
    expect(logged).toContain('Readiness failed: Auth failed with key');
    expect(logged).not.toContain(secret);
  });

  it('clears the failure reason once setReady(true) is called', async () => {
    server.setFailed('transient failure');
    server.setReady(true);
    const res = await fetch(port, '/ready');
    expect(res.status).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ status: 'ready' });
  });

  it('returns to 503 after setReady(false) (e.g. during shutdown)', async () => {
    server.setReady(true);
    server.setReady(false);
    const res = await fetch(port, '/ready');
    expect(res.status).toBe(503);
    expect(JSON.parse(res.body)).toEqual({ status: 'not_ready' });
  });

  it('responds 503 with a degraded status and reason after setDegraded', async () => {
    server.setReady(true);
    server.setDegraded('out-of-band error hot loop');
    const res = await fetch(port, '/ready');
    expect(res.status).toBe(503);
    expect(JSON.parse(res.body)).toEqual({
      status: 'degraded',
      reason: 'flow degraded, see the runtime log',
    });
  });

  it('clears a degraded state once setReady(true) is called again', async () => {
    server.setDegraded('out-of-band error hot loop');
    server.setReady(true);
    const res = await fetch(port, '/ready');
    expect(res.status).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ status: 'ready' });
  });

  it('delegates non-health requests to flow handler', async () => {
    server.setFlowHandler((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('from-flow');
    });
    const res = await fetch(port, '/collect');
    expect(res.status).toBe(200);
    expect(res.body).toBe('from-flow');
  });

  it('returns 503 for non-health requests when no flow handler', async () => {
    const res = await fetch(port, '/collect');
    expect(res.status).toBe(503);
  });

  it('health still works after setFlowHandler(null)', async () => {
    server.setFlowHandler((_req, res) => {
      res.writeHead(200);
      res.end();
    });
    server.setFlowHandler(null);
    const res = await fetch(port, '/health');
    expect(res.status).toBe(200);
  });
});
