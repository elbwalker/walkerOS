import type { Collector, Elb } from '@walkeros/core';
import { createMockLogger } from '@walkeros/core';
import { sourceCookieFirst } from '../index';
import { examples } from '../dev';

describe('Step Examples', () => {
  beforeEach(() => {
    (window as unknown as Record<string, unknown>).CookieFirst = undefined;
  });

  afterEach(() => {
    (window as unknown as Record<string, unknown>).CookieFirst = undefined;
  });

  it.each(Object.entries(examples.step))('%s', async (_name, example) => {
    const content = example.in as Record<string, boolean>;
    const mapping = example.mapping as
      | { settings?: Record<string, unknown> }
      | undefined;

    const mockElb = jest.fn(async () => ({
      ok: true,
      successful: [],
      failed: [],
      queued: [],
    })) as unknown as jest.MockedFunction<Elb.Fn>;

    const collectorStub: Collector.Instance = {
      allowed: true,
    } as unknown as Collector.Instance;

    // Pre-init: set CookieFirst global so source reads it during init
    (window as unknown as Record<string, unknown>).CookieFirst = {
      consent: content,
    };

    await sourceCookieFirst({
      collector: collectorStub,
      config: {
        settings: {
          ...(mapping?.settings || {}),
        },
      },
      env: {
        push: mockElb as unknown as Collector.PushFn,
        command: mockElb as unknown as Collector.CommandFn,
        elb: mockElb,
        window,
        logger: createMockLogger(),
      },
      id: 'test-cookiefirst',
      logger: createMockLogger(),
      setIngest: async () => {},
      setRespond: jest.fn(),
    });

    // Source already processed existing consent during init via
    // window.CookieFirst.consent — no need to dispatch cf_init again.

    // Source pushes via detached elb chain — yield for it
    for (let i = 0; i < 10 && mockElb.mock.calls.length === 0; i++) {
      await Promise.resolve();
    }

    const captured = mockElb.mock.calls.map(
      (args) => ['elb', ...args] as unknown[],
    );
    expect(captured).toEqual(example.out);
  });
});
