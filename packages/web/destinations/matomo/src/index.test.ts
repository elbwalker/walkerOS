import type { Logger, WalkerOS } from '@walkeros/core';
import type { DestinationMatomo } from '.';
import { startFlow } from '@walkeros/collector';
import { createMockLogger, getEvent, Level } from '@walkeros/core';
import { destinationMatomo } from '.';
import { MappingSchema, SettingsSchema } from './schemas';

interface LogEntry {
  level: Logger.Level;
  message: string;
}

interface Harness {
  elb: WalkerOS.Elb;
  paq: unknown[];
  logs: LogEntry[];
}

interface ScriptElement {
  type: string;
  src: string;
  async?: boolean;
  defer?: boolean;
}

const siteId = '1';
const url = 'https://analytics.example.com/';

function createEnv(paq?: unknown[]): DestinationMatomo.Env {
  return {
    window: paq ? { _paq: paq } : {},
    document: {
      createElement: () => ({ type: '', src: '', async: false, defer: false }),
      head: { appendChild: () => {} },
    },
  };
}

/**
 * Registers the destination on a fresh collector. Link tracking is off unless
 * a test turns it on, so the recorded queue holds only the event commands.
 */
async function setup(
  config: DestinationMatomo.Config = {},
  options: { queue?: boolean } = {},
): Promise<Harness> {
  const paq: unknown[] = [];
  const logs: LogEntry[] = [];
  const handler: Logger.Handler = (level, message) => {
    logs.push({ level, message });
  };

  const { elb } = await startFlow({ logger: { level: 'DEBUG', handler } });
  await elb('walker destination', {
    code: {
      ...destinationMatomo,
      env: createEnv(options.queue === false ? undefined : paq),
    },
    config: {
      ...config,
      settings: { siteId, url, enableLinkTracking: false, ...config.settings },
    },
  });

  return { elb, paq, logs };
}

/** Runs init directly on a fresh collector and returns what it pushed and loaded. */
async function runInit(config: DestinationMatomo.Config) {
  const { init } = destinationMatomo;
  if (!init) throw new Error('init missing');

  const paq: unknown[] = [];
  const scripts: ScriptElement[] = [];
  const env: DestinationMatomo.Env = {
    window: { _paq: paq },
    document: {
      createElement: () => {
        const script: ScriptElement = { type: '', src: '' };
        scripts.push(script);
        return script;
      },
      head: { appendChild: () => {} },
    },
  };
  const { collector } = await startFlow();

  await init({
    id: 'matomo',
    config,
    env,
    logger: createMockLogger(),
    collector,
  });

  return { paq, scripts };
}

function warnings(logs: LogEntry[], text: string): LogEntry[] {
  return logs.filter(
    (log) => log.level === Level.WARN && log.message.includes(text),
  );
}

describe('Destination Matomo', () => {
  const pageView = getEvent('page view');
  const title = 'walkerOS documentation';

  describe('push', () => {
    test('page view default pushes trackPageView with the title', async () => {
      const { elb, paq } = await setup();

      await elb(pageView);

      expect(paq).toEqual([['trackPageView', title]]);
    });

    test('page view rule with a goal keeps the page view', async () => {
      const { elb, paq } = await setup({
        mapping: { page: { view: { settings: { goalId: '1' } } } },
      });

      await elb(pageView);

      expect(paq).toEqual([
        ['trackPageView', title],
        ['trackGoal', '1', undefined],
      ]);
    });

    test('page view rule data replaces the title fallback', async () => {
      const { elb, paq } = await setup({
        mapping: { page: { view: { data: 'data.id' } } },
      });

      await elb(pageView);

      expect(paq).toEqual([['trackPageView', '/docs/']]);
    });

    test('unmapped event pushes nothing and warns once', async () => {
      const { elb, paq, logs } = await setup();

      await elb('foo bar');
      await elb('foo bar');

      const skipped = 'Event "foo bar" skipped';
      expect(paq).toEqual([]);
      expect(warnings(logs, skipped)).toHaveLength(1);
      expect(
        logs.filter(
          (log) => log.level === Level.DEBUG && log.message.includes(skipped),
        ),
      ).toHaveLength(1);
    });

    test('implicit rule without a goal is skipped', async () => {
      const { elb, paq, logs } = await setup({
        mapping: {
          product: {
            add: { settings: { customDimensions: { '2': 'data.id' } } },
          },
        },
      });

      await elb(getEvent('product add'));

      expect(paq).toEqual([]);
      expect(warnings(logs, 'Event "product add" skipped')).toHaveLength(1);
    });

    test('implicit rule with a goal sends only the goal', async () => {
      const { elb, paq, logs } = await setup({
        settings: { customDimensions: { '1': { value: 'docs' } } },
        mapping: {
          order: {
            complete: {
              settings: {
                goalId: '1',
                goalValue: 'data.total',
                customDimensions: { '2': 'data.id' },
              },
            },
          },
        },
      });

      await elb(getEvent('order complete'));

      expect(paq).toEqual([
        ['setCustomDimension', 1, 'docs'],
        ['setCustomDimension', 2, '0rd3r1d'],
        ['trackGoal', '1', 555],
        ['deleteCustomDimension', 2],
        ['setCustomDimension', 1, 'docs'],
      ]);
      expect(warnings(logs, 'skipped')).toEqual([]);
    });

    test.each([1, '1'])('goalId %j sends the goal', async (goalId) => {
      const { elb, paq } = await setup({
        mapping: { product: { add: { settings: { goalId } } } },
      });

      await elb(getEvent('product add'));

      expect(paq).toEqual([['trackGoal', goalId, undefined]]);
    });

    test('an invalid goalId sends the main hit, no goal and warns once', async () => {
      const { elb, paq, logs } = await setup({
        mapping: {
          promotion: {
            visible: {
              name: 'trackEvent',
              data: { set: [{ value: 'promotion' }, { value: 'visible' }] },
              settings: { goalId: 'goal_1' },
            },
          },
        },
      });

      await elb(getEvent('promotion visible'));
      await elb(getEvent('promotion visible'));

      expect(paq).toEqual([
        ['trackEvent', 'promotion', 'visible'],
        ['trackEvent', 'promotion', 'visible'],
      ]);
      expect(warnings(logs, 'goalId')).toHaveLength(1);
    });

    test('an implicit rule with only an invalid goal is skipped as unmapped', async () => {
      const { elb, paq, logs } = await setup({
        mapping: { product: { add: { settings: { goalId: 'goal_1' } } } },
      });

      await elb(getEvent('product add'));

      expect(paq).toEqual([]);
      expect(warnings(logs, 'Event "product add" skipped')).toHaveLength(1);
    });

    test('explicit rule name passes through', async () => {
      const { elb, paq } = await setup({
        mapping: { user: { login: { name: 'setUserId', data: 'user.id' } } },
      });

      await elb(getEvent('user login'));

      expect(paq).toEqual([['setUserId', 'us3r']]);
    });

    test('events pushed in the same tick do not interleave', async () => {
      const { elb, paq } = await setup({
        settings: { customDimensions: { '1': { value: 'docs' } } },
        mapping: {
          page: {
            view: {
              settings: {
                goalId: '1',
                goalValue: 'data.domain',
                customDimensions: { '2': 'data.id' },
              },
            },
          },
        },
      });
      const group = (id: string) => [
        ['setCustomDimension', 1, 'docs'],
        ['setCustomDimension', 2, id],
        ['trackPageView', title],
        ['trackGoal', '1', 'www.example.com'],
        ['deleteCustomDimension', 2],
        ['setCustomDimension', 1, 'docs'],
      ];

      await Promise.all([
        elb(getEvent('page view', { data: { ...pageView.data, id: '/a/' } })),
        elb(getEvent('page view', { data: { ...pageView.data, id: '/b/' } })),
      ]);

      expect(paq).toEqual([...group('/a/'), ...group('/b/')]);
    });

    test('missing _paq warns and pushes nothing', async () => {
      const { elb, paq, logs } = await setup({ init: true }, { queue: false });

      await elb(pageView);

      expect(paq).toEqual([]);
      expect(warnings(logs, '_paq')).toHaveLength(1);
    });
  });

  describe('custom dimensions', () => {
    test('destination dimensions are resolved per event', async () => {
      const { elb, paq } = await setup({
        settings: { customDimensions: { '1': 'data.id' } },
      });

      await elb(
        getEvent('page view', { data: { ...pageView.data, id: '/a/' } }),
      );
      await elb(
        getEvent('page view', { data: { ...pageView.data, id: '/b/' } }),
      );

      expect(paq).toEqual([
        ['setCustomDimension', 1, '/a/'],
        ['trackPageView', title],
        ['setCustomDimension', 1, '/b/'],
        ['trackPageView', title],
      ]);
    });

    test('rule dimensions are set around the hit, then the destination ones return', async () => {
      const { elb, paq } = await setup({
        settings: { customDimensions: { '1': { value: 'docs' } } },
        mapping: {
          page: {
            view: {
              settings: {
                customDimensions: { '1': 'data.id', '2': 'data.domain' },
              },
            },
          },
        },
      });

      await elb(pageView);

      expect(paq).toEqual([
        ['setCustomDimension', 1, '/docs/'],
        ['setCustomDimension', 2, 'www.example.com'],
        ['trackPageView', title],
        ['deleteCustomDimension', 2],
        ['setCustomDimension', 1, 'docs'],
      ]);
    });

    test('a rule dimension resolving to nothing deletes the destination value for the hit', async () => {
      const { elb, paq } = await setup({
        settings: { customDimensions: { '1': { value: 'docs' } } },
        mapping: {
          page: {
            view: { settings: { customDimensions: { '1': 'data.missing' } } },
          },
        },
      });

      await elb(pageView);

      expect(paq).toEqual([
        ['deleteCustomDimension', 1],
        ['trackPageView', title],
        ['setCustomDimension', 1, 'docs'],
      ]);
    });

    test('a flag hit gets the rule dimensions', async () => {
      const { elb, paq } = await setup({
        mapping: {
          search: {
            submit: {
              settings: {
                siteSearch: true,
                customDimensions: { '3': 'data.category' },
              },
              data: { set: ['data.query', 'data.category'] },
            },
          },
        },
      });

      await elb(
        getEvent('search submit', {
          data: { query: 'shoes', category: 'products' },
        }),
      );

      expect(paq).toEqual([
        ['setCustomDimension', 3, 'products'],
        ['trackSiteSearch', 'shoes', 'products'],
        ['deleteCustomDimension', 3],
      ]);
    });

    test('the goal is sent inside the dimension block', async () => {
      const { elb, paq } = await setup({
        mapping: {
          order: {
            complete: {
              name: 'trackEvent',
              data: { set: [{ value: 'order' }, { value: 'complete' }] },
              settings: {
                goalId: '1',
                goalValue: 'data.total',
                customDimensions: { '2': 'data.id' },
              },
            },
          },
        },
      });

      await elb(getEvent('order complete'));

      expect(paq).toEqual([
        ['setCustomDimension', 2, '0rd3r1d'],
        ['trackEvent', 'order', 'complete'],
        ['trackGoal', '1', 555],
        ['deleteCustomDimension', 2],
      ]);
    });
  });

  describe('init', () => {
    test('loadScript loads matomo.js and configures the tracker', async () => {
      const { paq, scripts } = await runInit({
        loadScript: true,
        settings: { siteId, url },
      });

      expect(scripts.map((script) => script.src)).toEqual([
        'https://analytics.example.com/matomo.js',
      ]);
      expect(paq).toEqual([
        ['setTrackerUrl', 'https://analytics.example.com/matomo.php'],
        ['setSiteId', siteId],
        ['enableLinkTracking'],
      ]);
    });

    test.each([
      ['siteId', { url }],
      ['url', { siteId }],
    ])('throws for missing %s with loadScript', async (_name, settings) => {
      await expect(runInit({ loadScript: true, settings })).rejects.toThrow(
        'missing',
      );
    });

    test.each([[{}], [{ siteId }], [{ url }]])(
      'does not require siteId or url without loadScript (%j)',
      async (settings) => {
        const { paq, scripts } = await runInit({ settings });

        expect(paq).toEqual([['enableLinkTracking']]);
        expect(scripts).toEqual([]);
      },
    );

    test.each([
      'https://analytics.example.com',
      'https://analytics.example.com//',
    ])('normalizes %s to one trailing slash', async (baseUrl) => {
      const { paq, scripts } = await runInit({
        loadScript: true,
        settings: { siteId, url: baseUrl, enableLinkTracking: false },
      });

      expect(scripts.map((script) => script.src)).toEqual([
        'https://analytics.example.com/matomo.js',
      ]);
      expect(paq).toEqual([
        ['setTrackerUrl', 'https://analytics.example.com/matomo.php'],
        ['setSiteId', siteId],
      ]);
    });

    test('pushes no custom dimensions', async () => {
      const { paq } = await runInit({
        settings: {
          enableLinkTracking: false,
          customDimensions: { '1': 'data.id' },
        },
      });

      expect(paq).toEqual([]);
    });

    test('disableCookies and enableHeartBeatTimer configure the tracker', async () => {
      const { paq } = await runInit({
        settings: { disableCookies: true, enableHeartBeatTimer: 30 },
      });

      expect(paq).toEqual([
        ['disableCookies'],
        ['enableLinkTracking'],
        ['enableHeartBeatTimer', 30],
      ]);
    });
  });

  describe('schemas', () => {
    test('settings require neither siteId nor url', () => {
      expect(SettingsSchema.safeParse({}).success).toBe(true);
    });

    test('goalValue and custom dimensions accept any Mapping Value', () => {
      expect(
        SettingsSchema.safeParse({
          customDimensions: { '1': { value: 'docs' } },
        }).success,
      ).toBe(true);
      expect(
        MappingSchema.safeParse({
          goalValue: { key: 'data.total' },
          customDimensions: { '2': { map: { size: 'data.size' } } },
        }).success,
      ).toBe(true);
    });

    test.each<[unknown, boolean]>([
      ['', false],
      ['goal_1', false],
      ['01', false],
      [0, false],
      [1.5, false],
      ['1', true],
      [1, true],
    ])('goalId %j is valid: %s', (goalId, valid) => {
      expect(MappingSchema.safeParse({ goalId }).success).toBe(valid);
    });

    test('custom dimension keys are bare numeric ids', () => {
      expect(
        MappingSchema.safeParse({ customDimensions: { dimension1: 'data.id' } })
          .success,
      ).toBe(false);
    });
  });
});
