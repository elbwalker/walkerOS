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

  it('responds 503 to GET /ready when no flow handler set', async () => {
    const res = await fetch(port, '/ready');
    expect(res.status).toBe(503);
  });

  it('responds 200 to GET /ready when flow handler is set', async () => {
    server.setFlowHandler((_req, res) => {
      res.writeHead(200);
      res.end('flow');
    });
    const res = await fetch(port, '/ready');
    expect(res.status).toBe(200);
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
