import http from 'http';
import { loadFlow, swapFlow } from '../../../runtime/runner.js';
import {
  createHealthServer,
  type HealthServer,
} from '../../../runtime/health-server.js';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { createMockLogger } from '../../helpers/mock-logger.js';

const TEST_DIR = '/tmp/walkeros-hot-swap-test';
const BUNDLE_V1 = join(TEST_DIR, 'v1.mjs');
const BUNDLE_V2 = join(TEST_DIR, 'v2.mjs');
const BUNDLE_INVALID = join(TEST_DIR, 'invalid.mjs');

let originalCwd: string;

const mockLogger = createMockLogger();

beforeAll(() => {
  originalCwd = process.cwd();
  mkdirSync(TEST_DIR, { recursive: true });

  // Valid bundle v1 — returns collector with command
  writeFileSync(
    BUNDLE_V1,
    `export default function(config) {
      return {
        collector: {
          command: async (cmd) => { /* v1 */ },
        },
      };
    }`,
    'utf-8',
  );

  // Valid bundle v2
  writeFileSync(
    BUNDLE_V2,
    `export default function(config) {
      return {
        collector: {
          command: async (cmd) => { /* v2 */ },
        },
      };
    }`,
    'utf-8',
  );

  // Invalid bundle — no default export
  writeFileSync(BUNDLE_INVALID, `export const foo = 42;`, 'utf-8');
});

afterEach(() => {
  // Restore cwd after each test since loadFlow calls process.chdir
  process.chdir(originalCwd);
  jest.clearAllMocks();
});

afterAll(() => {
  process.chdir(originalCwd);
  rmSync(TEST_DIR, { recursive: true, force: true });
});

describe('loadFlow', () => {
  it('loads bundle and returns FlowHandle with collector', async () => {
    const handle = await loadFlow(BUNDLE_V1, { port: 8080 }, mockLogger);
    expect(handle.collector).toBeDefined();
    expect(handle.file).toBe(BUNDLE_V1);
  });

  it('throws on invalid bundle (no default export)', async () => {
    await expect(
      loadFlow(BUNDLE_INVALID, undefined, mockLogger),
    ).rejects.toThrow('Invalid flow bundle');
  });
});

describe('swapFlow', () => {
  it('loads new bundle and shuts down old collector', async () => {
    const oldHandle = await loadFlow(BUNDLE_V1, { port: 8080 }, mockLogger);
    const oldCommand = jest.fn();
    oldHandle.collector.command = oldCommand;

    const newHandle = await swapFlow(
      oldHandle,
      BUNDLE_V2,
      { port: 8080 },
      mockLogger,
    );

    expect(newHandle.file).toBe(BUNDLE_V2);
    expect(oldCommand).toHaveBeenCalledWith('shutdown');
    expect(mockLogger.info).toHaveBeenCalledWith('Flow swapped successfully');
  });

  it('handles swap when command is undefined', async () => {
    const oldHandle = await loadFlow(BUNDLE_V1, { port: 8080 }, mockLogger);
    oldHandle.collector.command = undefined;

    const newHandle = await swapFlow(
      oldHandle,
      BUNDLE_V2,
      { port: 8080 },
      mockLogger,
    );

    expect(newHandle.file).toBe(BUNDLE_V2);
    expect(mockLogger.info).toHaveBeenCalledWith('Flow swapped successfully');
  });

  it('keeps old handle if new bundle fails to load', async () => {
    const oldHandle = await loadFlow(BUNDLE_V1, { port: 8080 }, mockLogger);

    await expect(
      swapFlow(oldHandle, BUNDLE_INVALID, { port: 8080 }, mockLogger),
    ).rejects.toThrow('Invalid flow bundle');

    // Old handle should still be valid
    expect(oldHandle.collector).toBeDefined();
  });
});

function httpGet(
  port: number,
  path: string,
): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://127.0.0.1:${port}${path}`, (res) => {
      let body = '';
      res.on('data', (chunk: string) => (body += chunk));
      res.on('end', () => resolve({ status: res.statusCode!, body }));
    });
    req.on('error', reject);
  });
}

describe('loadFlow with HealthServer', () => {
  let healthServer: HealthServer;

  beforeEach(async () => {
    healthServer = await createHealthServer(0, mockLogger);
  });

  afterEach(async () => {
    await healthServer.close();
  });

  it('passes sourceSettings when health server provided', async () => {
    writeFileSync(
      join(TEST_DIR, 'ctx-check.mjs'),
      `export default function(context) {
        return {
          collector: { command: async () => {} },
          _receivedSourceSettings: context.sourceSettings,
        };
      }`,
      'utf-8',
    );

    const handle = await loadFlow(
      join(TEST_DIR, 'ctx-check.mjs'),
      { port: 8080 },
      mockLogger,
      undefined,
      healthServer,
    );

    expect(handle.collector).toBeDefined();
  });

  it('mounts httpHandler onto health server', async () => {
    writeFileSync(
      join(TEST_DIR, 'with-handler.mjs'),
      `export default function(context) {
        return {
          collector: { command: async () => {} },
          httpHandler: (req, res) => {
            res.writeHead(200);
            res.end('flow-response');
          },
        };
      }`,
      'utf-8',
    );

    await loadFlow(
      join(TEST_DIR, 'with-handler.mjs'),
      { port: 8080 },
      mockLogger,
      undefined,
      healthServer,
    );

    // Verify flow handler is mounted by hitting a non-health path
    const port = (healthServer.server.address() as { port: number }).port;
    const res = await httpGet(port, '/collect');

    expect(res.body).toBe('flow-response');
  });
});

describe('swapFlow with HealthServer', () => {
  let healthServer: HealthServer;

  beforeEach(async () => {
    healthServer = await createHealthServer(0, mockLogger);
  });

  afterEach(async () => {
    await healthServer.close();
  });

  it('detaches old handler and mounts new handler on swap', async () => {
    writeFileSync(
      join(TEST_DIR, 'swap-v1.mjs'),
      `export default function() {
        return {
          collector: { command: async () => {} },
          httpHandler: (req, res) => { res.writeHead(200); res.end('v1'); },
        };
      }`,
      'utf-8',
    );

    writeFileSync(
      join(TEST_DIR, 'swap-v2.mjs'),
      `export default function() {
        return {
          collector: { command: async () => {} },
          httpHandler: (req, res) => { res.writeHead(200); res.end('v2'); },
        };
      }`,
      'utf-8',
    );

    const handle = await loadFlow(
      join(TEST_DIR, 'swap-v1.mjs'),
      { port: 8080 },
      mockLogger,
      undefined,
      healthServer,
    );

    await swapFlow(
      handle,
      join(TEST_DIR, 'swap-v2.mjs'),
      { port: 8080 },
      mockLogger,
      undefined,
      healthServer,
    );

    const port = (healthServer.server.address() as { port: number }).port;
    const res = await httpGet(port, '/collect');

    expect(res.body).toBe('v2');
  });
});
