import { startFlow } from '@walkeros/collector';
import { createIngest, createMockLogger, Source } from '@walkeros/core';
import type {
  Collector,
  Ingest,
  MockLogger,
  Source as SourceNS,
} from '@walkeros/core';
import express, {
  type NextFunction,
  type Request,
  type Response,
} from 'express';
import { sourceExpress } from '../index';
import type { ExpressSource, Types } from '../types';

/**
 * Harness note: this file keeps its own `createSourceContext` on purpose.
 * It needs a populated `collector.status` literal so the rejection counter
 * has somewhere real to land, which the bare stub in `index.test.ts` does
 * not provide.
 */
function createSourceContext(
  config: Partial<SourceNS.Config<Types>> = {},
  env: Partial<Types['env']> = {},
): SourceNS.Context<Types> {
  const baseEnv = env as Types['env'];
  return {
    config,
    env: baseEnv,
    logger: env.logger || createMockLogger(),
    id: 'test-express',
    collector: {
      status: {
        startedAt: 0,
        in: 0,
        out: 0,
        failed: 0,
        sources: {},
        destinations: {},
        dropped: {},
        connectionErrors: {},
        breakers: {},
      },
    } as Collector.Instance,
    withScope: async (_raw, respond, body) => {
      const ingest: Ingest = createIngest('test-express');
      return body({ ...baseEnv, push: baseEnv.push, ingest, respond });
    },
  };
}

async function startServer(context: SourceNS.Context<Types>): Promise<{
  source: ExpressSource;
  url: string;
  close: () => Promise<void>;
}> {
  const source = await sourceExpress(context);
  const address = source.server?.address();
  if (!address || typeof address === 'string') {
    await new Promise<void>((resolve) => {
      if (!source.server) return resolve();
      source.server.close(() => resolve());
    });
    throw new Error('Server did not bind');
  }
  return {
    source,
    url: `http://127.0.0.1:${address.port}`,
    close: () =>
      new Promise<void>((resolve) => source.server?.close(() => resolve())),
  };
}

/**
 * Real express with the route parser swapped for a middleware that raises
 * `err`. Gives the error boundary a live request to classify when no
 * body-parser failure can produce the error under test. With
 * `afterResponse`, the middleware answers first so the boundary sees a
 * fault on an already-sent response.
 */
function expressRaising(
  err: unknown,
  { afterResponse = false }: { afterResponse?: boolean } = {},
): typeof express {
  return Object.assign(() => express(), express, {
    json: () => (_req: Request, res: Response, next: NextFunction) => {
      if (afterResponse) res.status(200).json({ success: true });
      next(err);
    },
  });
}

/**
 * `Source.getSource` hands back the generic instance shape, which does not
 * declare the express source's HTTP server. Structural assignment recovers
 * it without a cast.
 */
function serverOf(
  source: SourceNS.Instance<Types>,
): ExpressSource['server'] | undefined {
  const candidate: { type: string; server?: ExpressSource['server'] } = source;
  return candidate.server;
}

describe('express input hygiene', () => {
  let mockPush: jest.MockedFunction<(...args: unknown[]) => unknown>;

  beforeEach(() => {
    mockPush = jest
      .fn()
      .mockResolvedValue({ event: { id: 'test-id' }, ok: true });
  });

  const liveContext = (
    logger: MockLogger = createMockLogger(),
    extraEnv: Partial<Types['env']> = {},
  ) =>
    createSourceContext(
      { settings: { port: 0, paths: ['/collect'] } },
      {
        push: mockPush as never,
        command: jest.fn() as never,
        elb: jest.fn() as never,
        logger,
        ...extraEnv,
      },
    );

  it.each([
    ['test_data', 'application/json', 400],
    ['(wget --no-check http://x', 'application/json', 400],
    ['not json either', 'text/plain', 400],
    ['{"a":1}', 'application/json; charset=klingon', 415],
  ])(
    'rejects %p (%s) with %i and a JSON body',
    async (payload, contentType, status) => {
      const { url, close } = await startServer(liveContext());
      try {
        const response = await fetch(`${url}/collect`, {
          method: 'POST',
          headers: { 'content-type': contentType },
          body: payload,
        });
        expect(response.status).toBe(status);
        expect(response.headers.get('content-type')).toContain(
          'application/json',
        );
        const body: { success: boolean } = await response.json();
        expect(body.success).toBe(false);
        expect(mockPush).not.toHaveBeenCalled();
      } finally {
        await close();
      }
    },
  );

  it('rejects an oversized body with 413', async () => {
    const { url, close } = await startServer(liveContext());
    try {
      const response = await fetch(`${url}/collect`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: `{"pad":"${'x'.repeat(1024 * 1024 + 64)}"}`,
      });
      expect(response.status).toBe(413);
      const body: { success: boolean } = await response.json();
      expect(body.success).toBe(false);
    } finally {
      await close();
    }
  });

  it('logs a rejected body once at debug with a truncated sample, never at error', async () => {
    const logger = createMockLogger();
    const { url, close } = await startServer(liveContext(logger));
    try {
      await fetch(`${url}/collect`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: 'a'.repeat(1000),
      });
      expect(logger.error).not.toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalledTimes(1);
      const [message, context]: [string, { status: number; sample?: string }] =
        logger.debug.mock.calls[0];
      expect(message).toBe('Request body rejected');
      expect(context.status).toBe(400);
      expect(context.sample).toHaveLength(200);
    } finally {
      await close();
    }
  });

  it('keeps CORS headers on rejection responses', async () => {
    const { url, close } = await startServer(liveContext());
    try {
      const response = await fetch(`${url}/collect`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          origin: 'https://shop.example',
        },
        body: 'test_data',
      });
      expect(response.status).toBe(400);
      expect(response.headers.get('access-control-allow-origin')).toBe('*');
    } finally {
      await close();
    }
  });

  it('answers 404 for unknown paths even with a malformed body', async () => {
    const logger = createMockLogger();
    const { url, close } = await startServer(liveContext(logger));
    try {
      const response = await fetch(`${url}/adminer.php`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: 'test_data',
      });
      expect(response.status).toBe(404);
      expect(logger.error).not.toHaveBeenCalled();
      expect(logger.debug).not.toHaveBeenCalled();
    } finally {
      await close();
    }
  });

  it('counts rejected requests on collector.status.sources', async () => {
    const { collector } = await startFlow({
      sources: {
        express: {
          code: sourceExpress,
          config: { settings: { port: 0, paths: ['/collect'] } },
        },
      },
    });
    const server = serverOf(Source.getSource<Types>(collector, 'express'));
    const close = () =>
      new Promise<void>((resolve) => {
        if (!server) return resolve();
        server.close(() => resolve());
      });
    try {
      const address = server?.address();
      if (!address || typeof address === 'string') {
        throw new Error('Server did not bind');
      }
      const url = `http://127.0.0.1:${address.port}/collect`;
      const reject = (body: string) =>
        fetch(url, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body,
        });
      await reject('test_data');
      await reject('(wget --no');
      expect(collector.status.sources.express?.rejected).toBe(2);
    } finally {
      await close();
    }
  });

  it('answers 400 for valid JSON that fails event validation (sync mode)', async () => {
    const { collector } = await startFlow({
      sources: {
        express: {
          code: sourceExpress,
          config: { async: false, settings: { port: 0, paths: ['/collect'] } },
        },
      },
    });
    const server = serverOf(Source.getSource<Types>(collector, 'express'));
    const close = () =>
      new Promise<void>((resolve) => {
        if (!server) return resolve();
        server.close(() => resolve());
      });
    try {
      const address = server?.address();
      if (!address || typeof address === 'string') {
        throw new Error('Server did not bind');
      }
      const response = await fetch(`http://127.0.0.1:${address.port}/collect`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{}',
      });
      expect(response.status).toBe(400);
      const body = (await response.json()) as {
        success: boolean;
        error?: string;
      };
      expect(body.success).toBe(false);
      expect(body.error).toBe('Event name is required');
      expect(collector.status.sources.express?.rejected).toBe(1);
      expect(collector.status.failed).toBe(0);
    } finally {
      await close();
    }
  });

  it('sets nosniff on a routed response and on the default 404', async () => {
    const { collector } = await startFlow({
      sources: {
        express: {
          code: sourceExpress,
          config: { settings: { port: 0, paths: ['/collect'] } },
        },
      },
    });
    const server = serverOf(Source.getSource<Types>(collector, 'express'));
    const close = () =>
      new Promise<void>((resolve) => {
        if (!server) return resolve();
        server.close(() => resolve());
      });
    try {
      const address = server?.address();
      if (!address || typeof address === 'string') {
        throw new Error('Server did not bind');
      }
      const base = `http://127.0.0.1:${address.port}`;
      const accepted = await fetch(`${base}/collect`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{"name":"page view"}',
      });
      expect(accepted.headers.get('x-content-type-options')).toBe('nosniff');
      expect(accepted.headers.get('x-powered-by')).toBeNull();

      const missing = await fetch(`${base}/adminer.php`);
      expect(missing.status).toBe(404);
      expect(missing.headers.get('x-content-type-options')).toBe('nosniff');
      expect(missing.headers.get('x-powered-by')).toBeNull();
    } finally {
      await close();
    }
  });
  describe('faults that are not body rejections', () => {
    const raisingContext = (
      err: unknown,
      logger: MockLogger,
      options?: { afterResponse?: boolean },
    ) => liveContext(logger, { express: expressRaising(err, options) });

    const postEvent = (url: string) =>
      fetch(`${url}/collect`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{"name":"page view"}',
      });

    it('stays loud for a 4xx error carrying no body-parser type marker', async () => {
      const logger = createMockLogger();
      const fault = Object.assign(new Error('nope'), {
        status: 401,
        type: 'auth.failed',
      });
      const context = raisingContext(fault, logger);
      const { url, close } = await startServer(context);
      try {
        const response = await postEvent(url);
        expect(response.status).toBe(500);
        const body: { success: boolean; error: string } = await response.json();
        expect(body).toEqual({
          success: false,
          error: 'Internal server error',
        });
        expect(logger.error).toHaveBeenCalledWith(fault);
        expect(logger.debug).not.toHaveBeenCalled();
        expect(
          context.collector.status.sources['test-express'],
        ).toBeUndefined();
      } finally {
        await close();
      }
    });

    it('answers 500 JSON at error level for a plain middleware fault', async () => {
      const logger = createMockLogger();
      const fault = new Error('boom');
      const { url, close } = await startServer(raisingContext(fault, logger));
      try {
        const response = await postEvent(url);
        expect(response.status).toBe(500);
        expect(response.headers.get('content-type')).toContain(
          'application/json',
        );
        const body: { success: boolean } = await response.json();
        expect(body.success).toBe(false);
        expect(logger.error).toHaveBeenCalledWith(fault);
        expect(logger.debug).not.toHaveBeenCalled();
      } finally {
        await close();
      }
    });

    it('logs a fault that arrives after the response instead of leaving it to the default handler', async () => {
      const logger = createMockLogger();
      const fault = new Error('late fault');
      const { url, close } = await startServer(
        raisingContext(fault, logger, { afterResponse: true }),
      );
      try {
        // Re-raising destroys the socket, so the already-sent response may or
        // may not complete; the log is what this pins.
        await postEvent(url).catch(() => undefined);
        expect(logger.error).toHaveBeenCalledWith(fault);
        expect(logger.debug).not.toHaveBeenCalled();
      } finally {
        await close();
      }
    });
  });
});
