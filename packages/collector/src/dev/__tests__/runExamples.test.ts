import type {
  Collector,
  Destination,
  Elb,
  Flow,
  Source,
  Store,
  Transformer,
  Trigger,
  WalkerOS,
} from '@walkeros/core';
import { createEvent, getEvent, isObject, StepError } from '@walkeros/core';
import { startFlow } from '../../flow';
import { runExamples } from '../runExamples';
import { fixtures } from './fixtures';
import { good } from './fixture-package/src';

const URL = 'https://127.0.0.1:9/e';
const fetchOut = (name: string): Flow.StepOut => [
  ['fetch', URL, { method: 'POST', body: JSON.stringify({ name }) }],
];
const settings = fixtures.settings;

describe('runExamples', () => {
  beforeEach(() => {
    jest.useRealTimers();
  });

  describe('destination', () => {
    it("resolves the fixture's pageView example for a destination that sends it", async () => {
      await expect(
        runExamples('destination', good, fixtures.examples, { settings }),
      ).resolves.toBeUndefined();
    });

    it('rejects an example whose out differs, naming the example', async () => {
      await expect(
        runExamples(
          'destination',
          good,
          {
            pageView: { ...fixtures.examples.pageView, out: fetchOut('other') },
          },
          { settings },
        ),
      ).rejects.toThrow(/example pageView: out differs/);
    });

    it('compares out as a literal (R4): a key whose value is undefined counts as absent, an extra effect does not', async () => {
      const event = { name: 'page view', user: { id: 'user-1' } };
      await expect(
        runExamples(
          'destination',
          good,
          {
            undefinedKey: {
              in: event,
              out: [
                [
                  'fetch',
                  URL,
                  {
                    method: 'POST',
                    body: '{"name":"page view"}',
                    headers: undefined,
                  },
                ],
              ],
            },
          },
          { settings },
        ),
      ).resolves.toBeUndefined();
      await expect(
        runExamples(
          'destination',
          good,
          {
            twice: {
              in: event,
              out: [...fetchOut('page view'), ...fetchOut('page view')],
            },
          },
          { settings },
        ),
      ).rejects.toThrow(/example twice: out differs/);
    });

    it('runs mappings through the destination config: example.mapping ?? config.mapping (R2)', async () => {
      const event = getEvent('page view', { user: { id: 'user-1' } });
      const config: Partial<Destination.Config> = {
        mapping: { page: { view: { silent: true } } },
      };

      // The configured rule applies when the example brings none.
      await expect(
        runExamples(
          'destination',
          good,
          { configured: { in: event, out: [] } },
          { settings, config },
        ),
      ).resolves.toBeUndefined();

      // The example's own rule replaces it.
      await expect(
        runExamples(
          'destination',
          good,
          { own: { in: event, mapping: {}, out: fetchOut('page view') } },
          { settings, config },
        ),
      ).resolves.toBeUndefined();
    });

    it('looks claimed examples up by their standard event name (R1, R3)', async () => {
      const examples: Flow.StepExamples = {
        anyKey: {
          in: getEvent('page view', { user: { id: 'user-1' } }),
          out: fetchOut('page view'),
        },
      };
      await expect(
        runExamples('destination', good, examples, {
          settings,
          claims: ['page view'],
        }),
      ).resolves.toBeUndefined();

      await expect(
        runExamples('destination', good, examples, {
          settings,
          claims: ['page view', 'order complete'],
        }),
      ).rejects.toThrow(/claim order complete: no public example/);
    });

    it('rejects a public event example that is not claimed (R3)', async () => {
      const examples: Flow.StepExamples = {
        pageView: {
          in: getEvent('page view', { user: { id: 'user-1' } }),
          out: fetchOut('page view'),
        },
        productView: {
          in: getEvent('product view', { user: { id: 'user-1' } }),
          out: fetchOut('product view'),
        },
      };
      await expect(
        runExamples('destination', good, examples, {
          settings,
          claims: ['page view'],
        }),
      ).rejects.toThrow(
        /example productView: product view is public but not claimed/,
      );
    });

    it('requires a claimed example to start from the pinned getEvent (R6)', async () => {
      await expect(
        runExamples(
          'destination',
          good,
          {
            pageView: {
              in: createEvent({ name: 'page view', user: { id: 'user-1' } }),
              out: fetchOut('page view'),
            },
          },
          { settings, claims: ['page view'] },
        ),
      ).rejects.toThrow(/does not start from getEvent\('page view'\)/);
    });

    it('rejects an example whose in is neither an event nor a command (R5)', async () => {
      await expect(
        runExamples(
          'destination',
          good,
          { odd: { in: 'page view', out: [] } },
          { settings },
        ),
      ).rejects.toThrow(/example odd: its in is neither an event/);
    });

    it('answers respond at the boundary and compares the reported outcome', async () => {
      const failure: Flow.StepExample = {
        public: false,
        in: fixtures.examples.pageView.in,
        respond: { status: 503, body: { error: 'busy' } },
        out: fetchOut('page view'),
        outcome: { status: 'failed', code: 'transport', retryable: true },
      };
      await expect(
        runExamples('destination', good, { failure }, { settings }),
      ).resolves.toBeUndefined();

      await expect(
        runExamples(
          'destination',
          good,
          {
            failure: {
              ...failure,
              outcome: { status: 'failed', code: 'config' },
            },
          },
          { settings },
        ),
      ).rejects.toThrow(
        /example failure: expected failed config, got failed transport/,
      );

      const { outcome, ...undeclared } = failure;
      await expect(
        runExamples('destination', good, { undeclared }, { settings }),
      ).rejects.toThrow(
        /example undeclared: failed with transport but declares no outcome/,
      );
    });

    it("records the calls on an examples env's simulation paths", async () => {
      type Env = { send: (url: string, body: string) => Promise<void> };
      const viaEnv: Destination.Instance<
        Destination.Types<{ url?: string }, unknown, Env>
      > = {
        type: 'via-env',
        config: {},
        push: async (event, { config, env }) => {
          await env.send(config.settings?.url ?? '', event.name);
        },
      };
      const env = {
        push: { send: () => Promise.resolve() },
        simulation: ['call:send'],
      };
      await expect(
        runExamples(
          'destination',
          viaEnv,
          {
            pageView: {
              in: { name: 'page view' },
              out: [['send', URL, 'page view']],
            },
          },
          { settings, env },
        ),
      ).resolves.toBeUndefined();
    });
  });

  describe('transformer', () => {
    type Types = Transformer.Types<{ drop?: boolean }>;
    const dropping: Transformer.Init<Types> = ({ config }) => ({
      type: 'dropping',
      config,
      push: () => {
        if (config.settings?.drop) return false;
        throw new StepError('Event has no consent id', {
          code: 'missing-input',
        });
      },
    });

    it('records what reaches the next step and the reported outcome', async () => {
      await expect(
        runExamples(
          'transformer',
          dropping,
          { dropped: { in: { name: 'page view' }, out: [] } },
          { settings: { drop: true } },
        ),
      ).resolves.toBeUndefined();

      await expect(
        runExamples(
          'transformer',
          dropping,
          {
            missing: {
              public: false,
              in: { name: 'page view' },
              out: [],
              outcome: { status: 'failed', code: 'missing-input' },
            },
          },
          { settings: {} },
        ),
      ).resolves.toBeUndefined();
    });
  });

  describe('store', () => {
    const memory: Store.Init = ({ config }) => {
      const values = new Map<string, Store.StoreValue>();
      return {
        type: 'memory',
        config,
        get: (key) => values.get(key),
        set: (key, value) => {
          values.set(key, value);
        },
        delete: (key) => {
          values.delete(key);
        },
      };
    };

    it('records each operation with its result', async () => {
      await expect(
        runExamples('store', memory, {
          write: {
            in: { operation: 'set', key: 'a', value: 'b' },
            out: [['set', 'a', 'b']],
          },
          miss: {
            in: { operation: 'get', key: 'missing' },
            out: [['get', 'missing', undefined]],
          },
        }),
      ).resolves.toBeUndefined();
    });
  });

  describe('source', () => {
    type Push = (content: WalkerOS.DeepPartialEvent) => Promise<Elb.PushResult>;
    const forwarding: Source.Init<
      Source.Types<unknown, unknown, Push>
    > = async ({ config, env }) => ({
      type: 'forwarding',
      config,
      push: (content) => env.push(content),
    });

    const isEvent = (value: unknown): value is WalkerOS.DeepPartialEvent =>
      isObject(value) && typeof value.name === 'string';

    const createTrigger: Trigger.CreateFn = async (
      config: Collector.InitConfig,
    ) => {
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

    it('feeds the input through the package createTrigger and records what the source emits', async () => {
      await expect(
        runExamples(
          'source',
          forwarding,
          {
            event: {
              in: { name: 'page view' },
              out: [['elb', { name: 'page view' }]],
            },
          },
          { createTrigger },
        ),
      ).resolves.toBeUndefined();
    });
  });
});
