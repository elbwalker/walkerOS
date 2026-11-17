import { loadBundle } from '../load-bundle';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { createMockLogger } from './helpers/mock-logger.js';

const mockLogger = createMockLogger();

describe('loadBundle', () => {
  const tempFiles: string[] = [];

  function createTempBundle(code: string): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'load-bundle-test-'));
    const file = path.join(dir, 'bundle.mjs');
    fs.writeFileSync(file, code, 'utf8');
    tempFiles.push(dir);
    return file;
  }

  afterEach(() => {
    for (const dir of tempFiles) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
    tempFiles.length = 0;
    jest.clearAllMocks();
  });

  it('loads a valid bundle and returns collector', async () => {
    const file = createTempBundle(`
      export default function(context) {
        return {
          collector: {
            push: async (event) => ({ id: '123', ...event }),
            command: async (cmd) => {},
          },
        };
      }
    `);

    const result = await loadBundle(file, {}, mockLogger);

    expect(result.collector).toBeDefined();
    expect(typeof result.collector.push).toBe('function');
    expect(typeof result.collector.command).toBe('function');
    expect(result.httpHandler).toBeUndefined();
  });

  it('returns httpHandler when bundle provides one', async () => {
    const file = createTempBundle(`
      export default function(context) {
        return {
          collector: {
            push: async () => ({}),
            command: async () => {},
          },
          httpHandler: (req, res) => { res.end('ok'); },
        };
      }
    `);

    const result = await loadBundle(file, {}, mockLogger);

    expect(result.httpHandler).toBeDefined();
    expect(typeof result.httpHandler).toBe('function');
  });

  it('passes context to factory function', async () => {
    const file = createTempBundle(`
      export default function(context) {
        return {
          collector: {
            push: async () => context,
            command: async () => {},
          },
        };
      }
    `);

    const ctx = { logger: { level: 0 }, port: 8080 };
    const result = await loadBundle(file, ctx, mockLogger);

    const pushed = await result.collector.push();
    expect(pushed).toEqual(ctx);
  });

  it('defaults context to empty object when not provided', async () => {
    const file = createTempBundle(`
      export default function(context) {
        return {
          collector: {
            push: async () => context,
            command: async () => {},
          },
        };
      }
    `);

    const result = await loadBundle(file);
    const pushed = await result.collector.push();
    expect(pushed).toEqual({});
  });

  it.each<[string, string, unknown]>([
    [
      'the declared env export',
      `export const __walkerosEnv = { secrets: ['API_KEY'], env: ['HOST'] };`,
      { secrets: ['API_KEY'], env: ['HOST'] },
    ],
    ['undefined for an artifact without it', '', undefined],
  ])(
    'calls beforeStart once with %s before the factory runs',
    async (_case, declaration, declared) => {
      const order: string[] = [];
      const file = createTempBundle(`
      ${declaration}
      export default function(context) {
        context.order.push('factory');
        return { collector: { push: async () => ({}), command: async () => {} } };
      }
    `);
      const beforeStart = jest.fn(async () => {
        order.push('beforeStart');
      });

      await loadBundle(file, { order }, mockLogger, beforeStart);

      expect(beforeStart).toHaveBeenCalledTimes(1);
      expect(beforeStart).toHaveBeenCalledWith(declared);
      expect(order).toEqual(['beforeStart', 'factory']);
    },
  );

  it('rejects without calling the factory when beforeStart rejects', async () => {
    const order: string[] = [];
    const file = createTempBundle(`
      export const __walkerosEnv = { secrets: ['API_KEY'], env: [] };
      export default function(context) {
        context.order.push('factory');
        return { collector: { push: async () => ({}), command: async () => {} } };
      }
    `);

    await expect(
      loadBundle(file, { order }, mockLogger, async () => {
        throw new Error('Secrets refused: API_KEY (secret-in-env)');
      }),
    ).rejects.toThrow('Secrets refused: API_KEY (secret-in-env)');
    expect(order).toEqual([]);
  });

  it('throws when bundle has no default export', async () => {
    const file = createTempBundle(`
      export function notDefault() { return {}; }
    `);

    await expect(loadBundle(file, {}, mockLogger)).rejects.toThrow(
      'must export a default factory function',
    );
  });

  it('throws when default export is not a function', async () => {
    const file = createTempBundle(`
      export default { notAFunction: true };
    `);

    await expect(loadBundle(file, {}, mockLogger)).rejects.toThrow(
      'must export a default factory function',
    );
  });

  it('throws when factory returns no collector', async () => {
    const file = createTempBundle(`
      export default function() {
        return { somethingElse: true };
      }
    `);

    await expect(loadBundle(file, {}, mockLogger)).rejects.toThrow(
      'factory must return { collector } with a push function',
    );
  });

  it('throws when factory returns null', async () => {
    const file = createTempBundle(`
      export default function() {
        return null;
      }
    `);

    await expect(loadBundle(file, {}, mockLogger)).rejects.toThrow(
      'factory must return { collector } with a push function',
    );
  });

  it('throws when collector has no push function', async () => {
    const file = createTempBundle(`
      export default function() {
        return {
          collector: { command: async () => {} },
        };
      }
    `);

    await expect(loadBundle(file, {}, mockLogger)).rejects.toThrow(
      'factory must return { collector } with a push function',
    );
  });
});
