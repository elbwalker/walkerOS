// posthog-node is ESM-first and Jest can't parse it. Tests use env.PostHog
// mock, so stub the import to satisfy Jest's loader.
jest.mock('posthog-node', () => ({
  PostHog: class {},
}));

import type { WalkerOS, Mapping as WalkerOSMapping } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { examples } from '../dev';
import type { Env, Settings } from '../types';

type CallRecord = [string, ...unknown[]];

/**
 * PostHog destination is stateful — `env.PostHog` is a constructor, so the
 * `new PostHogClass(...)` call happens at init time. We record only the
 * method calls on the resulting client (capture / identify / groupIdentify /
 * enable / disable), which is what `out` describes. The constructor call
 * and `shutdown()` on destroy are intentionally filtered.
 */
function spyEnv(): { env: Env; collected: () => CallRecord[] } {
  const calls: CallRecord[] = [];

  const MockPostHog = class {
    apiKey: string;
    options: Record<string, unknown>;
    capture: jest.Mock;
    identify: jest.Mock;
    groupIdentify: jest.Mock;
    flush: jest.Mock;
    shutdown: jest.Mock;
    enable: jest.Mock;
    disable: jest.Mock;

    constructor(apiKey: string, options?: Record<string, unknown>) {
      this.apiKey = apiKey;
      this.options = options || {};
      this.capture = jest.fn((params: Record<string, unknown>) => {
        calls.push(['client.capture', params]);
      });
      this.identify = jest.fn((params: Record<string, unknown>) => {
        calls.push(['client.identify', params]);
      });
      this.groupIdentify = jest.fn((params: Record<string, unknown>) => {
        calls.push(['client.groupIdentify', params]);
      });
      // flush / shutdown are lifecycle — not captured (not in out)
      this.flush = jest.fn(() => Promise.resolve());
      this.shutdown = jest.fn(async () => {});
      this.enable = jest.fn(() => {
        calls.push(['client.enable']);
      });
      this.disable = jest.fn(() => {
        calls.push(['client.disable']);
      });
    }
  };

  return {
    env: { PostHog: MockPostHog as unknown as Env['PostHog'] },
    collected: () => calls,
  };
}

describe('posthog server destination — step examples', () => {
  it.each(Object.entries(examples.step))('%s', async (_name, rawExample) => {
    const example = rawExample as {
      in?: unknown;
      mapping?: unknown;
      out?: unknown;
      command?: 'consent' | 'user' | 'config' | 'run';
      settings?: Partial<Settings>;
      configInclude?: string[];
    };

    const { env, collected } = spyEnv();

    const dest = jest.requireActual('../').default;
    const { elb } = await startFlow();

    const baseSettings: Partial<Settings> & { apiKey: string } = {
      apiKey: 'phc_test',
      ...(example.settings || {}),
    };

    if (example.command === 'consent') {
      await elb(
        'walker destination',
        { ...dest, env },
        {
          consent: { analytics: true },
          include: example.configInclude,
          settings: baseSettings,
        },
      );
      await elb('walker consent', example.in as WalkerOS.Consent);
    } else {
      const event = example.in as WalkerOS.Event;
      const mapping = example.mapping as WalkerOSMapping.Rule | undefined;
      const mappingConfig = mapping
        ? { [event.entity]: { [event.action]: mapping } }
        : undefined;

      await elb(
        'walker destination',
        { ...dest, env },
        {
          include: example.configInclude,
          settings: baseSettings,
          mapping: mappingConfig,
        },
      );
      await elb(event);
    }

    expect(collected()).toEqual(example.out);
  });
});
