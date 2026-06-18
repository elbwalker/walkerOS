import type { Collector, Elb } from '@walkeros/core';
import { createMockLogger } from '@walkeros/core';
import { sourceSession } from '../index';
import { examples } from '../dev';

// Mock getId to produce deterministic IDs. Keep other core exports real.
jest.mock('@walkeros/core', () => {
  const actual = jest.requireActual('@walkeros/core');
  return {
    ...actual,
    getId: jest.fn(),
  };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const coreMocked = require('@walkeros/core') as {
  getId: jest.Mock<string, [number?]>;
};

describe('Step Examples', () => {
  let dateNowSpy: jest.SpyInstance;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();

    // Session source needs performance.getEntriesByType('navigation')
    Object.defineProperty(window, 'performance', {
      value: {
        getEntriesByType: jest.fn().mockReturnValue([{ type: 'navigate' }]),
      },
      writable: true,
    });
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    if (dateNowSpy) dateNowSpy.mockRestore();
    coreMocked.getId.mockReset();
  });

  it.each(Object.entries(examples.step))('%s', async (name, example) => {
    const triggerInfo = example.trigger as
      | { type?: string; options?: unknown }
      | undefined;
    const settings = example.in as Record<string, unknown>;
    const opts = (triggerInfo?.options || {}) as {
      url?: string;
      referrer?: string;
    };

    // Reset URL to clean state first (avoids leaking UTM params across cases)
    window.history.replaceState({}, '', '/');

    // Set up URL + referrer per trigger options
    if (opts.url) {
      const urlObj = new URL(opts.url);
      window.history.replaceState({}, '', urlObj.pathname + urlObj.search);
    }
    if (opts.referrer) {
      Object.defineProperty(document, 'referrer', {
        value: opts.referrer,
        configurable: true,
      });
    } else {
      Object.defineProperty(document, 'referrer', {
        value: '',
        configurable: true,
      });
    }

    // Determine deterministic now + ids based on the scenario
    const isReturning = name === 'returningVisitor';
    const fakeNow = isReturning ? 1700001000000 : 1700000000000;
    dateNowSpy = jest.spyOn(Date, 'now').mockReturnValue(fakeNow);
    coreMocked.getId.mockImplementation(() => {
      return isReturning ? 'n3w-s3ss10n' : 's3ss10n-id';
    });

    // Seed device ID so it reads from storage instead of being regenerated;
    // getId then only ever produces the session id.
    localStorage.setItem(
      'elbDeviceId',
      JSON.stringify({ e: fakeNow + 3600000, v: 'd3v1c3-id' }),
    );

    // Seed pre-existing session for returning visitor — old enough to expire.
    // storageRead wraps values as { e: expiry, v: JSON-string }.
    if (isReturning) {
      const sessionData = JSON.stringify({
        id: 'old-session',
        count: 2,
        runs: 5,
        start: 1600000000000,
        updated: 0, // ancient — guaranteed expired
        isNew: false,
      });
      localStorage.setItem(
        'elbSessionId',
        JSON.stringify({ e: fakeNow + 3600000, v: sessionData }),
      );
    }

    // The ungated path defers its emit to an on('run') subscription. Capture
    // those rules here and fire them below to simulate the collector's run
    // lifecycle, so the example output reflects the emitted user/session/
    // session-start calls rather than the internal registration.
    const runRules: Array<() => unknown> = [];
    const captured: unknown[][] = [];

    const mockElb = jest.fn(async (...args: unknown[]) => {
      const [action, data] = args as [
        unknown,
        { type?: string; rules?: Array<() => unknown> } | undefined,
      ];
      if (action === 'on' && data?.type === 'run') {
        runRules.push(...(data.rules || []));
      } else {
        captured.push(['elb', ...args]);
      }
      return { ok: true, successful: [], failed: [], queued: [] };
    }) as unknown as jest.MockedFunction<Elb.Fn>;

    const collectorStub: Collector.Instance = {
      allowed: true,
    } as unknown as Collector.Instance;

    const source = await sourceSession({
      collector: collectorStub,
      config: { settings },
      env: {
        push: mockElb as unknown as Collector.PushFn,
        command: mockElb as unknown as Collector.CommandFn,
        elb: mockElb,
        window,
        document,
        logger: createMockLogger(),
      },
      id: 'test-session',
      logger: createMockLogger(),
      withScope: async (_r, _resp, body) => body({} as never),
    });

    // Session detection runs in init(), not the factory.
    await source.init?.();

    // Fire the run lifecycle: the ungated path emits here, not at init().
    for (const rule of runRules) await rule();

    // Yield to pick up any deferred pushes
    for (let i = 0; i < 10 && captured.length === 0; i++) {
      await Promise.resolve();
    }

    expect(captured).toEqual(example.out);
  });
});
