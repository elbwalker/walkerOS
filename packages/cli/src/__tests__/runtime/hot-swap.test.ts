import { loadFlow, swapFlow } from '../../runtime/runner.js';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

const TEST_DIR = '/tmp/walkeros-hot-swap-test';
const BUNDLE_V1 = join(TEST_DIR, 'v1.mjs');
const BUNDLE_V2 = join(TEST_DIR, 'v2.mjs');
const BUNDLE_INVALID = join(TEST_DIR, 'invalid.mjs');

let originalCwd: string;

const mockLogger = {
  error: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  throw: jest.fn((msg: string | Error) => {
    throw msg instanceof Error ? msg : new Error(String(msg));
  }),
  scope: jest.fn(),
};

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

  it('keeps old handle if new bundle fails to load', async () => {
    const oldHandle = await loadFlow(BUNDLE_V1, { port: 8080 }, mockLogger);

    await expect(
      swapFlow(oldHandle, BUNDLE_INVALID, { port: 8080 }, mockLogger),
    ).rejects.toThrow('Invalid flow bundle');

    // Old handle should still be valid
    expect(oldHandle.collector).toBeDefined();
  });
});
