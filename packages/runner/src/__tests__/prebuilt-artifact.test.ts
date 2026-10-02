/**
 * Runtime side of the bundle-then-start workflow: a prebuilt artifact with the
 * shape `walkeros bundle` emits (a default factory returning `{ collector,
 * httpHandler }`) passes the refusal assertion, loads, and serves HTTP through
 * the runner's health server. The CLI side builds a real artifact and asserts
 * that shape; this package cannot build one, so the artifact is written here.
 */
import * as fs from 'fs';
import * as http from 'http';
import * as os from 'os';
import * as path from 'path';
import type { AddressInfo } from 'net';
import { createMockLogger } from './helpers/mock-logger.js';
import { createHealthServer, type HealthServer } from '../health-server.js';
import { loadFlow } from '../runner.js';
import { resolveBundle } from '../resolve-bundle.js';
import { assertPrebuiltArtifact } from '../run.js';

function get(
  port: number,
  urlPath: string,
): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    http
      .get(`http://127.0.0.1:${port}${urlPath}`, (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => resolve({ status: res.statusCode ?? 0, body }));
      })
      .on('error', reject);
  });
}

function portOf(server: http.Server): number {
  const address: AddressInfo | string | null = server.address();
  if (address === null || typeof address === 'string')
    throw new Error('server is not listening on a port');
  return address.port;
}

describe('prebuilt artifact', () => {
  const originalCwd = process.cwd();
  let dir: string;
  let healthServer: HealthServer | undefined;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'runtime-artifact-'));
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    if (healthServer) await healthServer.close();
    healthServer = undefined;
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('resolves, passes the refusal assertion, loads and serves', async () => {
    const artifact = path.join(dir, 'flow.mjs');
    fs.writeFileSync(
      artifact,
      `export default async function(context = {}) {
  const status = { in: 0, out: 0 };
  return {
    collector: {
      status,
      push: async () => { status.in++; },
      command: async () => {},
    },
    httpHandler: (req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('collected ' + req.url);
    },
  };
}`,
    );

    const resolved = await resolveBundle(artifact);
    expect(() => assertPrebuiltArtifact(resolved)).not.toThrow();

    const logger = createMockLogger();
    healthServer = await createHealthServer(0, logger);
    await loadFlow(resolved.path, { port: 0 }, logger, undefined, healthServer);
    healthServer.setReady(true);

    const port = portOf(healthServer.server);
    await expect(get(port, '/ready')).resolves.toEqual({
      status: 200,
      body: JSON.stringify({ status: 'ready' }),
    });
    await expect(get(port, '/collect')).resolves.toEqual({
      status: 200,
      body: 'collected /collect',
    });
  });
});
