import type { Store, Transformer, WalkerOS } from '@walkeros/core';
import type { RespondFn, RespondOptions } from '@walkeros/core';
import {
  createIngest,
  createMockContext,
  createMockLogger,
} from '@walkeros/core';
import { transformerFile } from '../transformer';
import type { Types } from '../types';
import { examples } from '../dev';

function createMockStore(): Store.Instance {
  const data = new Map<string, unknown>();
  return {
    type: 'mock',
    config: {},
    get(key) {
      return data.get(key);
    },
    set(key, value) {
      data.set(key, value);
    },
    delete(key) {
      data.delete(key);
    },
  };
}

describe('Step Examples', () => {
  const mockLogger = createMockLogger();

  const createInitContext = (
    config: Transformer.Config<Types>,
    env: Partial<Transformer.Env<Types>> = {},
  ) =>
    createMockContext<Types>({
      config,
      env: env as Transformer.Env<Types>,
      logger: mockLogger,
      id: 'test-file',
    });

  const createPushContext = (
    ingestData: Record<string, unknown> = {},
    respond?: RespondFn,
  ) =>
    createMockContext<Types>({
      config: {},
      env: respond ? { respond } : {},
      logger: mockLogger,
      id: 'test-file',
      ingest: {
        ...createIngest('test'),
        ...ingestData,
        _meta: createIngest('test')._meta,
      },
    });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each(Object.entries(examples.step))('%s', async (name, example) => {
    const event = example.in as WalkerOS.DeepPartialEvent;

    // Create store with a file matching the example path
    const store = createMockStore();
    store.set('walker.js', Buffer.from('console.log("walkerOS")'));

    const transformer = await transformerFile(
      createInitContext(
        {
          settings: {
            prefix: '/static',
            headers: { 'Cache-Control': 'public, max-age=3600' },
          },
        },
        { store },
      ),
    );

    let capturedOptions: RespondOptions | undefined;
    const respond: RespondFn = (options) => {
      capturedOptions = options;
    };

    const result = await transformer.push(
      event,
      createPushContext({ path: '/static/walker.js' }, respond),
    );

    // File transformer returns false when it serves a file (stops the chain)
    expect(result).toBe(false);
    expect(capturedOptions).toBeDefined();
    const [callable, expected] = example.out![0] as readonly [
      string,
      { status: number; headers: Record<string, string> },
    ];
    expect(callable).toBe('respond');
    expect(capturedOptions!.status).toBe(expected.status);
    expect(capturedOptions!.headers).toMatchObject(expected.headers);
  });
});
