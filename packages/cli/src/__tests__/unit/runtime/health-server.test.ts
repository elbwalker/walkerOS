import http from 'http';
import { createHealthServer } from '../../../runtime/health-server.js';
import { createMockLogger } from '../../helpers/mock-logger.js';

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
  port = (server.server.address() as { port: number }).port;
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
    // Mounting an HTTP handler is not the readiness signal — collector
    // construction is. Without setReady, /ready must not flip to 200.
    server.setFlowHandler((_req, res) => {
      res.writeHead(200);
      res.end('flow');
    });
    const res = await fetch(port, '/ready');
    expect(res.status).toBe(503);
  });

  it('responds 503 with a reason to GET /ready when construction failed', async () => {
    server.setFailed('WebSecretRefError: missing secret API_KEY');
    const res = await fetch(port, '/ready');
    expect(res.status).toBe(503);
    expect(JSON.parse(res.body)).toEqual({
      status: 'failed',
      reason: 'WebSecretRefError: missing secret API_KEY',
    });
  });

  it('clears the failure reason once setReady(true) is called', async () => {
    server.setFailed('transient failure');
    server.setReady(true);
    const res = await fetch(port, '/ready');
    expect(res.status).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ status: 'ready' });
  });

  it('returns to 503 after setReady(false) (e.g. during hot-swap)', async () => {
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
      reason: 'out-of-band error hot loop',
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
