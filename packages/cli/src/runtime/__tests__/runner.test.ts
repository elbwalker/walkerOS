import http from 'http';
import { createLogger, Level } from '@walkeros/core';
import { swapFlow, type FlowHandle, type FlowLoader } from '../runner.js';
import type { HealthServer } from '../health-server.js';

/**
 * In-memory HealthServer double recording the mounted flow handler and the
 * functional readiness flag, so the swap's mount/readiness ordering can be
 * asserted without binding a real port.
 */
function createFakeHealthServer(): {
  healthServer: HealthServer;
  getHandler: () => http.RequestListener | null;
  isReady: () => boolean;
  failures: string[];
} {
  let handler: http.RequestListener | null = null;
  let ready = false;
  const failures: string[] = [];

  const healthServer: HealthServer = {
    server: http.createServer(),
    setFlowHandler(next) {
      handler = next;
    },
    setReady(value) {
      ready = value;
    },
    setFailed(reason) {
      ready = false;
      failures.push(reason);
    },
    close: async () => {},
  };

  return {
    healthServer,
    getHandler: () => handler,
    isReady: () => ready,
    failures,
  };
}

type Handler = NonNullable<FlowHandle['httpHandler']>;

function makeHandle(
  file: string,
  command: FlowHandle['collector']['command'],
  httpHandler?: Handler,
): FlowHandle {
  return { collector: { command }, file, httpHandler };
}

// The flow handler is the opaque runner shape `(...args: unknown[]) => void`,
// matching `FlowHandle['httpHandler']` (not http.RequestListener, which the
// runner only widens to when handing off to the health server). The body is
// never invoked here — these tests assert handle identity and mount ordering —
// so each handler is a distinct no-op tagged by `label` only for readability.
function makeHandler(label: string): Handler {
  const handler: Handler = () => {
    void label;
  };
  return handler;
}

const logger = createLogger({ level: Level.DEBUG });

describe('swapFlow — atomic load-then-swap with rollback', () => {
  it('rolls back to the old handle when the new bundle fails to load', async () => {
    const fake = createFakeHealthServer();
    // Old flow is already mounted and serving.
    const oldHandler = makeHandler('old');
    fake.healthServer.setFlowHandler(oldHandler);
    fake.healthServer.setReady(true);

    const oldShutdown = jest.fn(async () => {});
    const oldHandle = makeHandle('/old/bundle.mjs', oldShutdown, oldHandler);

    const failingLoader: FlowLoader = async () => {
      throw new Error('bundle blew up');
    };

    const result = await swapFlow(
      oldHandle,
      '/new/bundle.mjs',
      undefined,
      logger,
      undefined,
      fake.healthServer,
      undefined,
      failingLoader,
    );

    // Old handle returned unchanged (no wedge).
    expect(result).toBe(oldHandle);
    // Old handler still mounted — setFlowHandler(null) was never called.
    expect(fake.getHandler()).toBe(oldHandler);
    // Readiness never dropped.
    expect(fake.isReady()).toBe(true);
    // Old collector NOT shut down on a failed swap.
    expect(oldShutdown).not.toHaveBeenCalled();
  });

  it('never detaches the old handler (no setFlowHandler(null)) on failure', async () => {
    const fake = createFakeHealthServer();
    const oldHandler = makeHandler('old');
    fake.healthServer.setFlowHandler(oldHandler);
    fake.healthServer.setReady(true);

    const setFlowHandlerSpy = jest.spyOn(fake.healthServer, 'setFlowHandler');
    const oldHandle = makeHandle('/old/bundle.mjs', async () => {}, oldHandler);

    const failingLoader: FlowLoader = async () => {
      throw new Error('load failed');
    };

    await swapFlow(
      oldHandle,
      '/new/bundle.mjs',
      undefined,
      logger,
      undefined,
      fake.healthServer,
      undefined,
      failingLoader,
    );

    // setFlowHandler must not have been called with null at any point.
    for (const call of setFlowHandlerSpy.mock.calls) {
      expect(call[0]).not.toBeNull();
    }
  });

  it('logs the load error on a failed swap', async () => {
    const fake = createFakeHealthServer();
    const errorSpy = jest.spyOn(logger, 'error');
    const oldHandle = makeHandle('/old/bundle.mjs', async () => {});

    const failingLoader: FlowLoader = async () => {
      throw new Error('boom-during-load');
    };

    await swapFlow(
      oldHandle,
      '/new/bundle.mjs',
      undefined,
      logger,
      undefined,
      fake.healthServer,
      undefined,
      failingLoader,
    );

    expect(
      errorSpy.mock.calls.some((call) =>
        String(call[0]).includes('boom-during-load'),
      ),
    ).toBe(true);
    errorSpy.mockRestore();
  });

  it('mounts the new handler and shuts the old collector down exactly once on success', async () => {
    const fake = createFakeHealthServer();
    const oldHandler = makeHandler('old');
    fake.healthServer.setFlowHandler(oldHandler);
    fake.healthServer.setReady(true);

    const order: string[] = [];
    const oldShutdown = jest.fn(async () => {
      order.push('old-shutdown');
    });
    const oldHandle = makeHandle('/old/bundle.mjs', oldShutdown, oldHandler);

    const newHandler = makeHandler('new');
    const newHandle = makeHandle('/new/bundle.mjs', async () => {}, newHandler);

    const successLoader: FlowLoader = async () => {
      order.push('load');
      return newHandle;
    };

    const result = await swapFlow(
      oldHandle,
      '/new/bundle.mjs',
      undefined,
      logger,
      undefined,
      fake.healthServer,
      undefined,
      successLoader,
    );

    expect(result).toBe(newHandle);
    // New handler is mounted after a successful load.
    expect(fake.getHandler()).toBe(newHandler);
    expect(fake.isReady()).toBe(true);
    // Old collector shut down exactly once.
    expect(oldShutdown).toHaveBeenCalledTimes(1);
    // Load happens before old shutdown (load-then-swap, not shut-then-load).
    expect(order).toEqual(['load', 'old-shutdown']);
  });

  it('mounts the new handler before shutting the old collector down', async () => {
    const fake = createFakeHealthServer();
    const order: string[] = [];

    const oldShutdown = jest.fn(async () => {
      order.push('shutdown');
    });
    const oldHandle = makeHandle('/old/bundle.mjs', oldShutdown);

    const newHandler = makeHandler('new');
    const newHandle = makeHandle('/new/bundle.mjs', async () => {}, newHandler);

    jest.spyOn(fake.healthServer, 'setFlowHandler').mockImplementation((h) => {
      if (h === newHandler) order.push('mount');
    });

    const successLoader: FlowLoader = async () => newHandle;

    await swapFlow(
      oldHandle,
      '/new/bundle.mjs',
      undefined,
      logger,
      undefined,
      fake.healthServer,
      undefined,
      successLoader,
    );

    expect(order).toEqual(['mount', 'shutdown']);
  });

  it('swallows an old-collector shutdown error after a successful swap', async () => {
    const fake = createFakeHealthServer();
    const newHandler = makeHandler('new');
    const newHandle = makeHandle('/new/bundle.mjs', async () => {}, newHandler);
    const oldHandle = makeHandle('/old/bundle.mjs', async () => {
      throw new Error('shutdown failed');
    });

    const successLoader: FlowLoader = async () => newHandle;

    const result = await swapFlow(
      oldHandle,
      '/new/bundle.mjs',
      undefined,
      logger,
      undefined,
      fake.healthServer,
      undefined,
      successLoader,
    );

    // Swap still succeeds — new flow is mounted, old shutdown error is non-fatal.
    expect(result).toBe(newHandle);
    expect(fake.getHandler()).toBe(newHandler);
  });
});
