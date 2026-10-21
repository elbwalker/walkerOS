import type { Flow, Store, Trigger, WalkerOS } from '@walkeros/core';
import { isObject } from '@walkeros/core';
import { startFlow } from '../../flow';
import { assertProfileEnvironment, conformance } from '../conformance';
import { fixtures } from './fixtures';
import {
  batching,
  batchingByDefault,
  conditional,
  echoing,
  floating,
  good,
  grouping,
  loud,
  loudCoded,
  rawHttps,
  swallowing,
  swallowingByDefault,
} from './fixture-package/src';
import {
  dropping,
  hashing,
  ingestDecoding,
  ingestPassing,
} from './fixture-package/src/transformer';
import type { Client } from './fixture-package/src/store';
import { missing, remote } from './fixture-package/src/store';
import { chatty, forwarding } from './fixture-package/src/source';
import type { Vendor } from './fixture-package/src/vendor';
import {
  alwaysRevoking,
  consentAware,
  consentIgnoring,
  initCalling,
  pageScriptIgnoring,
  pageScriptVendor,
  scriptVendor,
  swallowingSdk,
  vendorGlobal,
} from './fixture-package/src/vendor';
import { eitherId, ga4Only } from './fixture-package/src/alternatives';

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

  it('runs the push path of a destination that batches by default, and item 9 on its batch', async () => {
    await expect(
      conformance('destination', batchingByDefault, {
        profile: 'http',
        ...fixtures,
      }),
    ).resolves.toBeUndefined();
  });

  it('still fails item 9 for a default batch that hides a failed entry', async () => {
    await expect(
      conformance('destination', swallowingByDefault, {
        profile: 'http',
        ...fixtures,
      }),
    ).rejects.toMatchObject({ items: [9] });
  });

  describe('item 10 accepts a declared skip for a silent group rule', () => {
    const groupRule = { silent: true };
    const groupWithoutData: Flow.StepExample = {
      public: false,
      description: 'A group rule without a group sends nothing.',
      in: { name: 'company update' },
      mapping: groupRule,
      out: [],
    };
    const groupExamples: Flow.StepExamples = {
      ...fixtures.examples,
      groupWithData: {
        in: { name: 'company update', data: { group: 'acme' } },
        mapping: groupRule,
        out: [
          [
            'fetch',
            'https://127.0.0.1:9/e',
            { method: 'POST', body: '{"group":"acme"}' },
          ],
        ],
      },
      groupWithoutData,
    };

    it('passes with the declared skip, confirmed by its own run', async () => {
      await expect(
        conformance('destination', grouping, {
          profile: 'http',
          ...fixtures,
          examples: groupExamples,
        }),
      ).resolves.toBeUndefined();
    });

    it('fails item 10 without the declared skip', async () => {
      const { groupWithoutData: _, ...undeclared } = groupExamples;
      await expect(
        conformance('destination', grouping, {
          profile: 'http',
          ...fixtures,
          examples: undeclared,
        }),
      ).rejects.toMatchObject({ items: [10] });
    });

    // The declared skip carries the silent rule, so item 11 runs it too.
    it('fails items 10 and 11 when the declared skip sends when it runs', async () => {
      await expect(
        conformance('destination', grouping, {
          profile: 'http',
          ...fixtures,
          examples: {
            ...groupExamples,
            groupWithoutData: {
              ...groupWithoutData,
              in: { name: 'company update', custom: { group: 'acme' } },
            },
          },
        }),
      ).rejects.toMatchObject({
        items: [10, 11],
        message: expect.stringContaining(
          'declared skip groupWithoutData: out differs',
        ),
      });
    });
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

  it("fails item 2 for a destination that logs its own line next to the collector's", async () => {
    await expect(
      conformance('destination', loud, { profile: 'http', ...fixtures }),
    ).rejects.toMatchObject({
      items: [2],
      message: expect.stringContaining(
        'HTTP 500 writes 2 ERROR lines for transport',
      ),
    });
  });

  it("fails item 2 for a destination that logs its own coded line next to the collector's", async () => {
    await expect(
      conformance('destination', loudCoded, { profile: 'http', ...fixtures }),
    ).rejects.toMatchObject({
      items: [2],
      message: expect.stringContaining(
        'HTTP 500 writes 2 ERROR lines for transport',
      ),
    });
  });

  it('refuses a browser profile without a document, and nothing else', () => {
    expect(() => assertProfileEnvironment('web-sdk', false)).toThrow(
      /profile web-sdk is for web steps and needs a document/,
    );
    expect(() => assertProfileEnvironment('vendor-global', false)).toThrow(
      /profile vendor-global is for web steps and needs a document/,
    );
    expect(() => assertProfileEnvironment('sdk-env', false)).not.toThrow();
    expect(() => assertProfileEnvironment('http', false)).not.toThrow();
    expect(() => assertProfileEnvironment('web-sdk', true)).not.toThrow();
    expect(() => assertProfileEnvironment('vendor-global')).not.toThrow();
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

  describe('transformer whose input is the ingest (item 10)', () => {
    const noRequest: Flow.StepExample = {
      public: false,
      description: 'An event without a request in its ingest is reported.',
      in: { name: 'page view' },
      out: [],
      outcome: { status: 'failed', code: 'missing-input' },
    };
    const ingestOptions = {
      profile: 'transformer' as const,
      root,
      schema: { type: 'object', properties: {} },
      settings: {},
      examples: {
        request: { in: { url: 'https://example.com/g/collect?en=page_view' } },
        noRequest,
      },
    };

    it('passes with a declared missing-input example the kit confirms', async () => {
      await expect(
        conformance('transformer', ingestDecoding, ingestOptions),
      ).resolves.toBeUndefined();
    });

    it('fails item 10 without that example', async () => {
      await expect(
        conformance('transformer', ingestDecoding, {
          ...ingestOptions,
          examples: { request: ingestOptions.examples.request },
        }),
      ).rejects.toMatchObject({
        items: [10],
        message: expect.stringContaining('no missing-input example'),
      });
    });

    it('fails a transformer that passes an event without the ingest on unchanged (items 2 and 10)', async () => {
      await expect(
        conformance('transformer', ingestPassing, ingestOptions),
      ).rejects.toMatchObject({
        items: [2, 10],
        message: expect.stringContaining(
          'item 10: example noRequest: out differs',
        ),
      });
    });
  });

  describe('store (socket profile)', () => {
    const values = new Map<string, Store.StoreValue>();
    // Counted, so a test cannot pass without the store reaching its client.
    const read = jest.fn(async (key: string) => values.get(key));
    const write = jest.fn(async (key: string, value: Store.StoreValue) => {
      values.set(key, value);
    });
    const client: Client = {
      read,
      write,
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

    it('passes a store that reports a failed read, through its env client', async () => {
      read.mockClear();
      write.mockClear();
      await expect(
        conformance('store', remote, options),
      ).resolves.toBeUndefined();
      expect(read).toHaveBeenCalled();
      expect(write).toHaveBeenCalled();
    });

    it('judges items 2 and 3 by the examples that reach the SDK (a refused key reaches none)', async () => {
      read.mockClear();
      await expect(
        conformance('store', remote, {
          ...options,
          examples: {
            ...options.examples,
            refused: { in: { operation: 'get', key: '../../etc/passwd' } },
          },
        }),
      ).resolves.toBeUndefined();
      expect(read).toHaveBeenCalled();
    });

    it('fails items 2 and 3 when no example of an operation reaches the SDK', async () => {
      await expect(
        conformance('store', remote, {
          ...options,
          examples: {
            write: options.examples.write,
            refused: { in: { operation: 'get', key: '../../etc/passwd' } },
          },
        }),
      ).rejects.toMatchObject({
        items: [2, 3],
        message: expect.stringContaining('no example of get reaches the SDK'),
      });
    });

    it('fails a store that turns its client rejection into a miss (item 2)', async () => {
      read.mockClear();
      await expect(
        conformance('store', missing, options),
      ).rejects.toMatchObject({
        items: [2],
        message: expect.stringContaining(
          'a rejected SDK call on get is not reported',
        ),
      });
      expect(read).toHaveBeenCalled();
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
    init: () => undefined,
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

  describe('a destination whose init calls its vendor', () => {
    const tracked = {
      ...options.env,
      simulation: [...options.env.simulation, 'call:vendor.init'],
    };
    const consented = { ...event, consent: { marketing: true } };
    const initExamples: Flow.StepExamples = {
      pageView: { ...examples.pageView, in: consented },
      silent: { ...examples.silent, in: consented },
      // The vendor does not start: init fails before any push call.
      unreachable: {
        ...examples.unreachable,
        in: consented,
        description: 'The vendor does not start: init reports it.',
        out: [],
        outcome: { status: 'failed', code: 'vendor-not-ready' },
      },
      // Grants marketing (the init runs inside it), revokes functional.
      revoke: {
        command: 'consent',
        in: { marketing: true, functional: false },
        out: [['vendor.consent', true]],
      },
    };
    const initOptions = { ...options, env: tracked, examples: initExamples };

    it('leaves the init calls of a destination initialized inside an input out of its effects (items 2, 8 and 11 pass)', async () => {
      await expect(
        conformance('destination', initCalling, initOptions),
      ).resolves.toBeUndefined();
    });

    it('passes web-sdk and fails item 5 only under sdk-env when init starts the SDK at page load', async () => {
      // Without a consent gate the collector initializes it inside startFlow.
      const atLoad = { ...initCalling, config: {} };
      const atLoadOptions = { ...options, env: tracked };
      await expect(
        conformance('destination', atLoad, {
          ...atLoadOptions,
          profile: 'web-sdk',
        }),
      ).resolves.toBeUndefined();
      await expect(
        conformance('destination', atLoad, {
          ...atLoadOptions,
          profile: 'sdk-env',
        }),
      ).rejects.toMatchObject({
        items: [5],
        message: expect.stringMatching(/item 5: init makes 1 /),
      });
    });

    it('counts item 2 over the session: an init that fails inside startFlow writes the one ERROR line', async () => {
      const atLoad = { ...initCalling, config: {} };
      await expect(
        conformance('destination', atLoad, {
          ...options,
          env: tracked,
          profile: 'web-sdk',
        }),
      ).resolves.toBeUndefined();
    });

    it('fails item 2 for a destination that swallows a failed start and a failed call', async () => {
      await expect(
        conformance('destination', swallowingSdk, {
          ...options,
          env: tracked,
          profile: 'web-sdk',
        }),
      ).rejects.toMatchObject({
        items: [2],
        message: expect.stringContaining('a rejected SDK call is not reported'),
      });
    });

    it('still counts the init calls for item 5', async () => {
      await expect(
        conformance('destination', initCalling, {
          ...initOptions,
          profile: 'sdk-env',
        }),
      ).rejects.toMatchObject({
        items: [5],
        message: expect.stringMatching(/item 5: init makes 1 /),
      });
    });
  });

  it('counts item 2 per cause: a vendor-timeout line before the script error does not count', async () => {
    await expect(
      conformance('destination', scriptVendor, {
        ...options,
        schema: { type: 'object', properties: {} },
        settings: {},
        examples: {
          pageView: { in: event },
          silent: examples.silent,
          revoke: examples.revoke,
        },
      }),
    ).resolves.toBeUndefined();
  });

  describe('a script injected once per page, loadScript on by default (item 2)', () => {
    // No declared failure example: item 2 must reach the script error itself.
    const { unreachable, ...scriptExamples } = examples;
    const scriptOptions = { ...options, examples: scriptExamples };

    it('reaches the script error although item 1 injected the src first', async () => {
      await expect(
        conformance('destination', pageScriptVendor, scriptOptions),
      ).resolves.toBeUndefined();
    });

    it('fails item 2 when the push ignores the script error', async () => {
      await expect(
        conformance('destination', pageScriptIgnoring, scriptOptions),
      ).rejects.toMatchObject({
        items: [2],
        message: expect.stringContaining('is not reported vendor-not-loaded'),
      });
    });
  });

  describe('item 8 runs a revoke gated on its keys, granted first (I1)', () => {
    it('passes a destination that passes the revocation to its vendor', async () => {
      await expect(
        conformance('destination', consentAware, options),
      ).resolves.toBeUndefined();
    });

    it('fails item 8 when the revoke example leaves the vendor call out', async () => {
      await expect(
        conformance('destination', consentAware, {
          ...options,
          examples: {
            ...examples,
            revoke: {
              ...examples.revoke,
              description: 'No consent call.',
              out: [],
            },
          },
        }),
      ).rejects.toMatchObject({ items: [8] });
    });

    it('fails item 8 for a destination that revokes on the grant too', async () => {
      await expect(
        conformance('destination', alwaysRevoking, options),
      ).rejects.toMatchObject({
        items: [8],
        message: expect.stringContaining("the grant makes the revoke's calls"),
      });
    });

    it('fails item 8 for a destination that ignores the revocation', async () => {
      await expect(
        conformance('destination', consentIgnoring, options),
      ).rejects.toMatchObject({
        items: [8],
        message: expect.stringContaining(
          'item 8: example revoke: out differs: expected [["vendor.consent",false]], got []',
        ),
      });
    });
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

describe('conformance kit, item 4 with alternatives (anyOf)', () => {
  beforeEach(() => {
    jest.useRealTimers();
  });

  const event = { name: 'page view', data: { title: 'Home' } };
  const examples: Flow.StepExamples = {
    pageView: {
      in: event,
      out: [
        [
          'fetch',
          'https://127.0.0.1:9/collect',
          { method: 'POST', body: '{"id":"G-1","name":"page view"}' },
        ],
      ],
    },
    silent: {
      public: false,
      description: 'A silent rule sends nothing.',
      in: event,
      mapping: { silent: true },
      out: [],
    },
  };
  const options = {
    profile: 'http' as const,
    root: fixtures.root,
    settings: { ga4: { measurementId: 'G-1' } },
    schema: {
      type: 'object',
      properties: {
        ga4: {
          type: 'object',
          properties: { measurementId: { type: 'string' } },
        },
        ads: {
          type: 'object',
          properties: { conversionId: { type: 'string' } },
        },
      },
      anyOf: [
        {
          required: ['ga4'],
          properties: { ga4: { required: ['measurementId'] } },
        },
        {
          required: ['ads'],
          properties: { ads: { required: ['conversionId'] } },
        },
      ],
    },
    examples,
  };

  it('passes an init error that names a key of every alternative', async () => {
    await expect(
      conformance('destination', eitherId, options),
    ).resolves.toBeUndefined();
  });

  it('fails item 4 only when the init error names no key of one alternative', async () => {
    await expect(
      conformance('destination', ga4Only, options),
    ).rejects.toMatchObject({
      items: [4],
      message: expect.stringContaining(
        'names no key of the alternative ads.conversionId',
      ),
    });
  });

  it('still counts a schema whose alternative requires nothing as requiring nothing', async () => {
    const anyOf = [...options.schema.anyOf, { properties: {} }];
    await expect(
      conformance('destination', eitherId, {
        ...options,
        schema: { ...options.schema, anyOf },
      }),
    ).rejects.toMatchObject({
      items: [4],
      message: expect.stringContaining('although the schema requires nothing'),
    });
  });
});
