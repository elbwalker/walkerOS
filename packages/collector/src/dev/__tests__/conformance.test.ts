import type { Flow, Store, Trigger, WalkerOS } from '@walkeros/core';
import { isObject } from '@walkeros/core';
import { startFlow } from '../../flow';
import { conformance } from '../conformance';
import { fixtures } from './fixtures';
import {
  batching,
  conditional,
  echoing,
  floating,
  good,
  rawHttps,
  swallowing,
} from './fixture-package/src';
import { dropping, hashing } from './fixture-package/src/transformer';
import type { Client } from './fixture-package/src/store';
import { missing, remote } from './fixture-package/src/store';
import { chatty, forwarding } from './fixture-package/src/source';
import type { Vendor } from './fixture-package/src/vendor';
import { vendorGlobal } from './fixture-package/src/vendor';

describe('conformance kit', () => {
  beforeEach(() => {
    jest.useRealTimers();
  });

  it('passes a destination that reports everything', async () => {
    await expect(
      conformance('destination', good, { profile: 'http', ...fixtures }),
    ).resolves.toBeUndefined();
  });

  it('fails a conditional send on item 10 only (it passes items 1 to 9)', async () => {
    await expect(
      conformance('destination', conditional, { profile: 'http', ...fixtures }),
    ).rejects.toMatchObject({
      items: [10],
    });
  });

  it('fails a floating send, listing every failed item in one error, item 3 among them', async () => {
    await expect(
      conformance('destination', floating, { profile: 'http', ...fixtures }),
    ).rejects.toThrow(/item 3\b/);
  });

  it('fails a destination that copies the vendor response into its message (item 7)', async () => {
    await expect(
      conformance('destination', echoing, { profile: 'http', ...fixtures }),
    ).rejects.toMatchObject({
      items: [7],
    });
  });

  it('fails a destination whose request escapes the fetch boundary (item 1)', async () => {
    await expect(
      conformance('destination', rawHttps, { profile: 'http', ...fixtures }),
    ).rejects.toMatchObject({
      items: expect.arrayContaining([1]),
    });
  });

  it('passes a batching destination that reports the failed entries (item 9)', async () => {
    await expect(
      conformance('destination', batching, { profile: 'http', ...fixtures }),
    ).resolves.toBeUndefined();
  });

  it('fails a batching destination that swallows a failed chunk (item 9)', async () => {
    await expect(
      conformance('destination', swallowing, { profile: 'http', ...fixtures }),
    ).rejects.toMatchObject({ items: [9] });
  });

  it('fails a destination without a silent example on item 11 only', async () => {
    const { silent, ...examples } = fixtures.examples;
    await expect(
      conformance('destination', good, {
        profile: 'http',
        ...fixtures,
        examples,
      }),
    ).rejects.toMatchObject({ items: [11] });
  });

  it('fails a destination whose silent example makes its default call (item 11)', async () => {
    await expect(
      conformance(
        'destination',
        {
          ...good,
          push: async (event, context) => {
            await good.push(event, { ...context, rule: undefined });
          },
        },
        { profile: 'http', ...fixtures },
      ),
    ).rejects.toMatchObject({ items: [11] });
  });

  it('fails a silent example that declares no out on item 11 only', async () => {
    const { out, ...silent } = fixtures.examples.silent;
    await expect(
      conformance('destination', good, {
        profile: 'http',
        ...fixtures,
        examples: { ...fixtures.examples, silent },
      }),
    ).rejects.toMatchObject({ items: [11] });
  });

  it('refuses fake timers with a clear message', async () => {
    jest.useFakeTimers();
    await expect(
      conformance('destination', good, { profile: 'http', ...fixtures }),
    ).rejects.toThrow(/real timers/);
    jest.useRealTimers();
  });
});

describe('conformance kit, other step kinds', () => {
  beforeEach(() => {
    jest.useRealTimers();
  });

  const root = fixtures.root;
  const schemaOf = (key: string) => ({
    type: 'object',
    properties: { [key]: { type: 'string' } },
    required: [key],
  });

  describe('transformer', () => {
    const options = {
      profile: 'transformer' as const,
      root,
      schema: schemaOf('salt'),
      settings: { salt: 's' },
      examples: {
        hashed: { in: { name: 'page view', user: { id: 'u1' } } },
        missingId: {
          public: false,
          description: 'An event without a user id cannot be hashed.',
          in: { name: 'page view' },
          out: [],
          outcome: { status: 'failed' as const, code: 'missing-input' },
        },
      },
    };

    it('passes a transformer that reports a missing input', async () => {
      await expect(
        conformance('transformer', hashing, options),
      ).resolves.toBeUndefined();
    });

    it('fails a transformer that drops a stripped event silently (item 10; item 2: its missing-input example does not hold)', async () => {
      await expect(
        conformance('transformer', dropping, options),
      ).rejects.toMatchObject({ items: [2, 10] });
    });
  });

  describe('store (socket profile)', () => {
    const values = new Map<string, Store.StoreValue>();
    const client: Client = {
      read: async (key) => values.get(key),
      write: async (key, value) => {
        values.set(key, value);
      },
      remove: async (key) => {
        values.delete(key);
      },
    };
    const options = {
      profile: 'socket' as const,
      root,
      schema: schemaOf('bucket'),
      settings: { bucket: 'b' },
      env: {
        push: { client },
        simulation: ['call:client.read', 'call:client.write'],
      },
      examples: {
        write: { in: { operation: 'set', key: 'a', value: 'v' } },
        read: { in: { operation: 'get', key: 'a' } },
      },
    };

    it('passes a store that reports a failed read', async () => {
      await expect(
        conformance('store', remote, options),
      ).resolves.toBeUndefined();
    });

    it('fails a store that turns a failed read into a miss (item 2)', async () => {
      await expect(
        conformance('store', missing, options),
      ).rejects.toMatchObject({ items: [2] });
    });
  });

  describe('source', () => {
    const isEvent = (value: unknown): value is WalkerOS.DeepPartialEvent =>
      isObject(value) && typeof value.name === 'string';
    const createTrigger: Trigger.CreateFn = async (config) => {
      let flow: Trigger.FlowHandle | undefined;
      return {
        get flow() {
          return flow;
        },
        trigger: () => async (content) => {
          if (!flow) {
            const started = await startFlow(config);
            flow = { collector: started.collector, elb: started.elb };
          }
          if (isEvent(content)) await flow.collector.sources.step.push(content);
        },
      };
    };
    const options = {
      profile: 'source' as const,
      root,
      schema: schemaOf('path'),
      settings: { path: '/collect' },
      createTrigger,
      examples: {
        event: { in: { name: 'page view', data: { title: 'Home' } } },
      },
    };

    it('passes a source that keeps its input out of the logs', async () => {
      await expect(
        conformance('source', forwarding, options),
      ).resolves.toBeUndefined();
    });

    it('fails a source that logs its input (item 7)', async () => {
      await expect(
        conformance('source', chatty, options),
      ).rejects.toMatchObject({ items: [7] });
    });
  });
});

describe('conformance kit, vendor-global profile', () => {
  beforeEach(() => {
    jest.useRealTimers();
  });

  const vendor: Vendor = {
    track: () => undefined,
    consent: () => undefined,
  };
  const event = { name: 'page view', data: { title: 'Home' } };
  const examples: Flow.StepExamples = {
    pageView: { in: event, out: [['vendor.track', 'page view', 'docs']] },
    silent: {
      public: false,
      description: 'A silent rule calls nothing.',
      in: event,
      mapping: { silent: true },
      out: [],
    },
    unreachable: {
      public: false,
      description: 'The vendor call fails.',
      in: event,
      respond: { error: 'network' },
      out: [['vendor.track', 'page view', 'docs']],
      outcome: { status: 'failed', code: 'transport' },
    },
    revoke: {
      command: 'consent',
      in: { marketing: false },
      out: [['vendor.consent', false]],
    },
  };
  const options = {
    profile: 'vendor-global' as const,
    root: fixtures.root,
    schema: { type: 'object', properties: { site: { type: 'string' } } },
    settings: { site: 'docs' },
    env: {
      push: { vendor },
      simulation: ['call:vendor.track', 'call:vendor.consent'],
    },
    examples,
  };

  it('passes a vendor destination that passes consent to the vendor', async () => {
    await expect(
      conformance('destination', vendorGlobal, options),
    ).resolves.toBeUndefined();
  });

  it('fails a consent revoke example that declares no out on item 8 only', async () => {
    const { out, ...revoke } = examples.revoke;
    await expect(
      conformance('destination', vendorGlobal, {
        ...options,
        examples: { ...examples, revoke },
      }),
    ).rejects.toMatchObject({ items: [8] });
  });
});
