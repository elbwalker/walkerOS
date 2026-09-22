import type { Logger, WalkerOS } from '@walkeros/core';
import type { DestinationPiwikPro } from '.';
import { startFlow } from '@walkeros/collector';
import { createMockLogger, getEvent, Level } from '@walkeros/core';
import { destinationPiwikPro } from '.';
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

const appId = 'XXX-XXX-XXX-XXX-XXX';
const url = 'https://your_account_name.piwik.pro/';

function createEnv(paq?: unknown[]): DestinationPiwikPro.Env {
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
  config: DestinationPiwikPro.Config = {},
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
      ...destinationPiwikPro,
      env: createEnv(options.queue === false ? undefined : paq),
    },
    config: {
      ...config,
      settings: { appId, url, linkTracking: false, ...config.settings },
    },
  });

  return { elb, paq, logs };
}

/** Runs init directly on a fresh collector and returns what it pushed and loaded. */
async function runInit(
  config: DestinationPiwikPro.Config,
  consent?: WalkerOS.Consent,
) {
  const { init } = destinationPiwikPro;
  if (!init) throw new Error('init missing');

  const paq: unknown[] = [];
  const scripts: ScriptElement[] = [];
  const env: DestinationPiwikPro.Env = {
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
  const { collector, elb } = await startFlow();
  if (consent) await elb('walker consent', consent);

  await init({
    id: 'piwikpro',
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

describe('Destination PiwikPro', () => {
  const pageView = getEvent('page view');
  const title = 'walkerOS documentation';

  describe('push', () => {
    test('page view default pushes trackPageView with the title', async () => {
      const { elb, paq } = await setup();

      await elb(pageView);

      expect(paq).toEqual([['trackPageView', title]]);
    });

    test('page view rule with a goal keeps the page view (W1)', async () => {
      const { elb, paq } = await setup({
        mapping: { page: { view: { settings: { goalId: 'g1' } } } },
      });

      await elb(pageView);

      expect(paq).toEqual([
        ['trackPageView', title],
        ['trackGoal', 'g1'],
      ]);
    });

    test('page view rule data replaces the title fallback (W7)', async () => {
      const { elb, paq } = await setup({
        mapping: { page: { view: { data: 'data.id' } } },
      });

      await elb(pageView);

      expect(paq).toEqual([['trackPageView', '/docs/']]);
    });

    test('unmapped event pushes nothing and warns once (W2)', async () => {
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

    test('explicit rule name passes through as a state setter', async () => {
      const { elb, paq } = await setup({
        mapping: { user: { login: { name: 'setUserId', data: 'user.id' } } },
      });

      await elb(getEvent('user login'));

      expect(paq).toEqual([['setUserId', 'us3r']]);
    });

    test('goal value is resolved, not a Promise (W3)', async () => {
      const { elb, paq } = await setup({
        mapping: {
          order: {
            complete: {
              name: 'trackEvent',
              data: { set: [{ value: 'order' }, { value: 'complete' }] },
              settings: { goalId: 'g1', goalValue: 'data.total' },
            },
          },
        },
      });

      await elb(getEvent('order complete'));

      expect(paq).toEqual([
        ['trackEvent', 'order', 'complete'],
        ['trackGoal', 'g1', 555],
      ]);
    });

    test('silent rule pushes only the goal', async () => {
      const { elb, paq } = await setup({
        mapping: {
          page: { view: { silent: true, settings: { goalId: 'g1' } } },
        },
      });

      await elb(pageView);

      expect(paq).toEqual([['trackGoal', 'g1']]);
    });

    test('events pushed in the same tick do not interleave', async () => {
      const { elb, paq } = await setup({
        settings: { customDimensions: { '1': { value: 'docs' } } },
        mapping: {
          page: {
            view: {
              settings: {
                goalId: 'g1',
                goalValue: 'data.domain',
                customDimensions: { '2': 'data.id' },
              },
            },
          },
        },
      });
      const group = (id: string) => [
        ['setCustomDimensionValue', 1, 'docs'],
        ['setCustomDimensionValue', 2, id],
        ['trackPageView', title],
        ['deleteCustomDimension', 2],
        ['setCustomDimensionValue', 1, 'docs'],
        [
          'trackGoal',
          'g1',
          'www.example.com',
          { dimension1: 'docs', dimension2: encodeURIComponent(id) },
        ],
      ];

      await Promise.all([
        elb(getEvent('page view', { data: { ...pageView.data, id: '/a/' } })),
        elb(getEvent('page view', { data: { ...pageView.data, id: '/b/' } })),
      ]);

      expect(paq).toEqual([...group('/a/'), ...group('/b/')]);
    });

    test('silent rule without a goal sends nothing and warns once', async () => {
      const { elb, paq, logs } = await setup({
        mapping: { page: { view: { silent: true } } },
      });

      await elb(pageView);
      await elb(pageView);

      expect(paq).toEqual([]);
      expect(warnings(logs, 'Event "page view" skipped')).toHaveLength(1);
    });

    test('missing _paq warns and pushes nothing (W13)', async () => {
      const { elb, paq, logs } = await setup({ init: true }, { queue: false });

      await elb(pageView);

      expect(paq).toEqual([]);
      expect(warnings(logs, '_paq')).toHaveLength(1);
    });
  });

  describe('custom dimensions (W5)', () => {
    const promotion = getEvent('promotion visible');

    test('trackEvent gets the encoded object as its fifth argument', async () => {
      const { elb, paq } = await setup({
        settings: { customDimensions: { '1': 'data.name' } },
        mapping: {
          promotion: {
            visible: {
              name: 'trackEvent',
              data: { set: [{ value: 'promotion' }, { value: 'visible' }] },
            },
          },
        },
      });

      await elb(promotion);

      expect(paq).toEqual([
        [
          'trackEvent',
          'promotion',
          'visible',
          undefined,
          undefined,
          { dimension1: 'Setting%20up%20tracking%20easily' },
        ],
      ]);
    });

    test('trackPageView is wrapped by set and restore commands', async () => {
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
        ['setCustomDimensionValue', 1, '/docs/'],
        ['setCustomDimensionValue', 2, 'www.example.com'],
        ['trackPageView', title],
        ['deleteCustomDimension', 2],
        ['setCustomDimensionValue', 1, 'docs'],
      ]);
    });

    test('the goal gets destination and rule dimensions as its argument', async () => {
      const { elb, paq } = await setup({
        settings: { customDimensions: { '1': { value: 'docs' } } },
        mapping: {
          page: {
            view: {
              silent: true,
              settings: {
                goalId: 'g1',
                customDimensions: { '2': 'data.domain' },
              },
            },
          },
        },
      });

      await elb(pageView);

      expect(paq).toEqual([
        [
          'trackGoal',
          'g1',
          undefined,
          { dimension1: 'docs', dimension2: 'www.example.com' },
        ],
      ]);
    });

    test.each([
      ['dropped when nothing is left', { foo: { value: 'bar' } }, []],
      [
        'filtered and stringified',
        { foo: { value: 'bar' }, dimension2: 'data.price' },
        [{ dimension2: '420' }],
      ],
    ])(
      'a mapping-provided argument without settings dimensions is %s',
      async (_name, map, dimensions) => {
        const { elb, paq } = await setup({
          mapping: {
            product: {
              add: {
                name: 'trackEvent',
                data: {
                  set: ['entity', 'action', 'data.name', 'data.price', { map }],
                },
              },
            },
          },
        });

        await elb(getEvent('product add'));

        expect(paq).toEqual([
          [
            'trackEvent',
            'product',
            'add',
            'Everyday Ruck Snack',
            420,
            ...dimensions,
          ],
        ]);
      },
    );

    test('a state setter gets no dimension commands', async () => {
      const { elb, paq } = await setup({
        settings: { customDimensions: { '1': { value: 'docs' } } },
        mapping: {
          user: {
            login: {
              name: 'setUserId',
              data: 'user.id',
              settings: { customDimensions: { '2': 'user.id' } },
            },
          },
        },
      });

      await elb(getEvent('user login'));

      expect(paq).toEqual([['setUserId', 'us3r']]);
    });
  });

  describe('identified', () => {
    test('false switches to anonymous at init only', async () => {
      const { elb, paq } = await setup({ settings: { identified: false } });

      await elb(pageView);
      await elb(pageView);

      expect(paq).toEqual([
        ['setUserIsAnonymous', true],
        ['trackPageView', title],
        ['trackPageView', title],
      ]);
    });

    test('a consent object follows the consent state', async () => {
      const { elb, paq } = await setup({
        settings: { identified: { marketing: true } },
      });

      await elb(pageView);
      await elb(pageView);
      await elb('walker consent', { marketing: true });
      await elb(pageView);

      expect(paq).toEqual([
        ['setUserIsAnonymous', true],
        ['trackPageView', title],
        ['trackPageView', title],
        ['deanonymizeUser'],
        ['trackPageView', title],
      ]);
    });

    test('the transition precedes the dimension commands', async () => {
      const { elb, paq } = await setup({
        settings: { identified: { marketing: true } },
        mapping: {
          page: {
            view: { settings: { customDimensions: { '1': 'data.id' } } },
          },
        },
      });

      await elb(pageView);

      expect(paq).toEqual([
        ['setUserIsAnonymous', true],
        ['setCustomDimensionValue', 1, '/docs/'],
        ['trackPageView', title],
        ['deleteCustomDimension', 1],
      ]);
    });
  });

  describe('init', () => {
    test.each([
      ['appId', { url }],
      ['url', { appId }],
    ])('throws for missing %s with loadScript', async (_name, settings) => {
      await expect(runInit({ loadScript: true, settings })).rejects.toThrow(
        'missing',
      );
    });

    test.each([[{}], [{ appId }], [{ url }]])(
      'does not require appId or url without loadScript (%j)',
      async (settings) => {
        const { paq, scripts } = await runInit({ settings });

        expect(paq).toEqual([]);
        expect(scripts).toEqual([]);
      },
    );

    test('normalizes the url to one trailing slash (W9)', async () => {
      const { paq, scripts } = await runInit({
        loadScript: true,
        settings: { appId, url: 'https://acc.piwik.pro' },
      });

      expect(scripts.map((script) => script.src)).toEqual([
        'https://acc.piwik.pro/ppms.js',
      ]);
      expect(paq).toEqual([
        ['setTrackerUrl', 'https://acc.piwik.pro/ppms.php'],
        ['setSiteId', appId],
      ]);
    });

    test.each<[string, WalkerOS.Consent | undefined, unknown[]]>([
      ['not granted', undefined, [['setUserIsAnonymous', true]]],
      ['granted', { marketing: true }, []],
    ])(
      'resolves a consent-object identified against the collector consent (%s)',
      async (_name, consent, expected) => {
        const { paq } = await runInit(
          { settings: { identified: { marketing: true } } },
          consent,
        );

        expect(paq).toEqual(expected);
      },
    );

    test('pushes no enableLinkTracking (W11)', async () => {
      const { paq } = await runInit({ settings: { appId, url } });

      expect(paq).not.toContainEqual(['enableLinkTracking']);
    });
  });

  describe('link tracking (W11)', () => {
    test('follows the first hit once', async () => {
      const { elb, paq } = await setup({ settings: { linkTracking: true } });

      await elb(pageView);
      await elb(pageView);

      expect(paq).toEqual([
        ['trackPageView', title],
        ['enableLinkTracking'],
        ['trackPageView', title],
      ]);
    });

    test('is on by default', async () => {
      const { elb, paq } = await setup({
        settings: { linkTracking: undefined },
      });

      await elb(pageView);

      expect(paq).toEqual([['trackPageView', title], ['enableLinkTracking']]);
    });

    test('a state setter is not a hit', async () => {
      const { elb, paq } = await setup({
        settings: { linkTracking: true },
        mapping: { user: { login: { name: 'setUserId', data: 'user.id' } } },
      });

      await elb(getEvent('user login'));
      await elb(pageView);

      expect(paq).toEqual([
        ['setUserId', 'us3r'],
        ['trackPageView', title],
        ['enableLinkTracking'],
      ]);
    });

    test('follows a goal when the method hit is silent', async () => {
      const { elb, paq } = await setup({
        settings: { linkTracking: true },
        mapping: {
          page: { view: { silent: true, settings: { goalId: 'g1' } } },
        },
      });

      await elb(pageView);

      expect(paq).toEqual([['trackGoal', 'g1'], ['enableLinkTracking']]);
    });

    test('linkTracking false never pushes it', async () => {
      const { elb, paq } = await setup();

      await elb(pageView);
      await elb(pageView);

      expect(paq).not.toContainEqual(['enableLinkTracking']);
    });
  });

  describe('schemas', () => {
    test('linkTracking defaults to true (W4)', () => {
      expect(SettingsSchema.parse({}).linkTracking).toBe(true);
    });

    test('mapping accepts any core Mapping Value', () => {
      expect(MappingSchema.safeParse({ goalValue: 10 }).success).toBe(true);
      expect(
        MappingSchema.safeParse({
          goalValue: { map: { total: 'data.total' } },
          customDimensions: { '1': { map: { size: 'data.size' } } },
        }).success,
      ).toBe(true);
    });

    test('mapping accepts a rule without goalId (W8)', () => {
      expect(MappingSchema.safeParse({}).success).toBe(true);
      expect(
        MappingSchema.safeParse({ goalId: 7, goalValue: 'data.total' }).success,
      ).toBe(true);
    });
  });
});
