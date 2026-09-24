import * as fs from 'fs';
import * as http from 'http';
import * as os from 'os';
import * as path from 'path';
import { createLogger, Level } from '@walkeros/core';
import { loadFlow } from '../runner.js';
import type { HealthServer } from '../health-server.js';

/**
 * In-memory HealthServer double recording the mounted flow handler, so the
 * mount can be asserted without binding a real port.
 */
function createFakeHealthServer(): {
  healthServer: HealthServer;
  getHandler: () => http.RequestListener | null;
} {
  let handler: http.RequestListener | null = null;
  const healthServer: HealthServer = {
    server: http.createServer(),
    setFlowHandler(next) {
      handler = next;
    },
    setReady: () => {},
    setFailed: () => {},
    setDegraded: () => {},
    close: async () => {},
  };
  return { healthServer, getHandler: () => handler };
}

const logger = createLogger({ level: Level.ERROR });

describe('loadFlow', () => {
  const tempDirs: string[] = [];
  let originalCwd: string;

  beforeEach(() => {
    originalCwd = process.cwd();
  });

  afterEach(() => {
    // loadFlow does process.chdir(flowDir); restore before removing temp dirs.
    process.chdir(originalCwd);
    for (const dir of tempDirs)
      fs.rmSync(dir, { recursive: true, force: true });
    tempDirs.length = 0;
  });

  function writeBundle(source: string): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'runner-load-'));
    tempDirs.push(dir);
    const file = path.join(dir, 'flow.mjs');
    fs.writeFileSync(file, source);
    return file;
  }

  it('mounts the bundle http handler and keeps a live status reference', async () => {
    const file = writeBundle(`
export default async function() {
  const status = { in: 0, out: 0 };
  return {
    collector: {
      status,
      push: async () => { status.in++; },
      command: async () => {},
    },
    httpHandler: (req, res) => res.end('ok'),
  };
}`);
    const fake = createFakeHealthServer();

    const handle = await loadFlow(
      file,
      {},
      logger,
      undefined,
      fake.healthServer,
    );

    expect(typeof fake.getHandler()).toBe('function');
    expect(handle.collector.status).toEqual({ in: 0, out: 0 });
    expect(typeof handle.collector.command).toBe('function');
  });

  it('omits a status that is not a collector status object', async () => {
    const file = writeBundle(`
export default async function() {
  return {
    collector: { status: 'running', push: async () => {}, command: async () => {} },
  };
}`);

    const handle = await loadFlow(file, {}, logger);

    expect(handle.collector.status).toBeUndefined();
  });
});
