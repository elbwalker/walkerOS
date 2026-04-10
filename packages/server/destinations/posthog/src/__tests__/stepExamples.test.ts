// posthog-node is ESM-first and Jest can't parse it. Tests use env.PostHog
// mock, so stub the import to satisfy Jest's loader.
jest.mock('posthog-node', () => ({
  PostHog: class {},
}));

import type { WalkerOS, Mapping as WalkerOSMapping } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { clone } from '@walkeros/core';
import { examples } from '../dev';
import type { Env, Settings } from '../types';

type CallRecord = [string, ...unknown[]];
type ExpectedOut = CallRecord | CallRecord[];

function flatten(out: unknown): CallRecord[] {
  if (!Array.isArray(out) || out.length === 0) return [];
  if (typeof out[0] === 'string') return [out as CallRecord];
  return out as CallRecord[];
}

interface MockPostHogInstance {
  apiKey: string;
  options: Record<string, unknown>;
  capture: jest.Mock;
  identify: jest.Mock;
  groupIdentify: jest.Mock;
  flush: jest.Mock;
  shutdown: jest.Mock;
  enable: jest.Mock;
  disable: jest.Mock;
}

let lastInstance: MockPostHogInstance | undefined;

function spyEnv(): { env: Env; collected: () => CallRecord[] } {
  const calls: CallRecord[] = [];
  lastInstance = undefined;

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
      this.flush = jest.fn(() => {
        calls.push(['client.flush']);
        return Promise.resolve();
      });
      this.shutdown = jest.fn(async () => {
        calls.push(['client.shutdown']);
      });
      this.enable = jest.fn(async () => {
        calls.push(['client.enable']);
      });
      this.disable = jest.fn(async () => {
        calls.push(['client.disable']);
      });
      lastInstance = this;
    }
  };

  return {
    env: { PostHog: MockPostHog as unknown as Env['PostHog'] },
    collected: () => calls,
  };
}

describe('posthog server destination — step examples', () => {
  it.each(Object.entries(examples.step))('%s', async (name, rawExample) => {
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
    const { elb } = await startFlow({ tagging: 2 });

    const baseSettings: Partial<Settings> & { apiKey: string } = {
      apiKey: 'phc_test',
      ...(example.settings || {}),
    };

    if (example.command === 'consent') {
      elb(
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

      elb(
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

    const expected = flatten(example.out as ExpectedOut);
    const actual = collected();

    expect(actual).toEqual(expected);
  });
});
