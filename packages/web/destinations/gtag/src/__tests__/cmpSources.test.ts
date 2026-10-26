import type { Collector, Trigger } from '@walkeros/core';
import { clone } from '@walkeros/core';
import { sourceCookiebot } from '@walkeros/web-source-cmp-cookiebot';
import { examples as cookiebot } from '@walkeros/web-source-cmp-cookiebot/dev';
import { sourceCookieFirst } from '@walkeros/web-source-cmp-cookiefirst';
import { examples as cookiefirst } from '@walkeros/web-source-cmp-cookiefirst/dev';
import { sourceCookiePro } from '@walkeros/web-source-cmp-cookiepro';
import { examples as cookiepro } from '@walkeros/web-source-cmp-cookiepro/dev';
import {
  sourceUsercentrics,
  type SourceUsercentrics,
} from '@walkeros/web-source-cmp-usercentrics';
import { examples as usercentrics } from '@walkeros/web-source-cmp-usercentrics/dev';
import { examples } from '../dev';
import { destinationGtag, resetConsentState } from '../index';
import type { Env } from '../types';

/**
 * Every CMP source on its default map, through a real collector, into the
 * gtag destination on its default Consent Mode mapping: analytics_storage
 * follows the visitor's measurement choice, never the functional one.
 */

type Choice = { measurement: boolean };

interface Scenario {
  name: string;
  start: (
    config: Collector.InitConfig,
    choice: Choice,
  ) => Promise<Trigger.FlowHandle | undefined>;
}

const scenarios: Scenario[] = [
  {
    name: 'Cookiebot',
    start: async (config, { measurement }) => {
      const instance = await cookiebot.createTrigger({
        ...config,
        sources: { consent: { code: sourceCookiebot } },
      });
      await instance.trigger('consent')({
        consented: true,
        declined: false,
        hasResponse: true,
        consent: {
          stamp: 'example',
          necessary: true,
          preferences: !measurement,
          statistics: measurement,
          marketing: !measurement,
          method: 'explicit',
        },
      });
      return instance.flow;
    },
  },
  {
    name: 'CookieFirst',
    start: async (config, { measurement }) => {
      const instance = await cookiefirst.createTrigger({
        ...config,
        sources: { consent: { code: sourceCookieFirst } },
      });
      await instance.trigger('consent')({
        necessary: true,
        functional: !measurement,
        performance: measurement,
        advertising: !measurement,
      });
      return instance.flow;
    },
  },
  {
    name: 'CookiePro',
    start: async (config, { measurement }) => {
      const instance = await cookiepro.createTrigger({
        ...config,
        sources: { consent: { code: sourceCookiePro } },
      });
      await instance.trigger('consent')(
        measurement ? ',C0001,C0002,' : ',C0001,C0003,C0004,',
      );
      return instance.flow;
    },
  },
  {
    // Usercentrics passes its category slugs through: a site whose
    // measurement category is slugged `analytics` needs no categoryMap
    name: 'Usercentrics',
    start: async (config, { measurement }) => {
      const instance = await usercentrics.createTrigger({
        ...config,
        sources: { consent: { code: sourceUsercentrics } },
      });
      const service = (
        categorySlug: string,
        status: boolean,
      ): SourceUsercentrics.UsercentricsV2Service => ({
        categorySlug,
        consent: { status, history: [{ type: 'explicit', status }] },
      });
      await instance.trigger('consent')([
        service('essential', true),
        service('functional', !measurement),
        service('analytics', measurement),
        service('marketing', !measurement),
      ]);
      return instance.flow;
    },
  },
];

describe('CMP sources into gtag Consent Mode', () => {
  let flow: Trigger.FlowHandle | undefined;

  beforeEach(() => {
    // startFlow runs the real collector; the shared setup fakes timers.
    jest.useRealTimers();
    resetConsentState();
    Reflect.deleteProperty(window, 'Cookiebot');
    Reflect.deleteProperty(window, 'CookieFirst');
    Reflect.deleteProperty(window, 'OptanonActiveGroups');
    Reflect.deleteProperty(window, 'OneTrust');
    Reflect.deleteProperty(window, 'UC_UI');
  });

  afterEach(async () => {
    if (flow) await flow.collector.command('shutdown');
    flow = undefined;
  });

  const rows: Array<[string, string, Scenario, boolean]> = scenarios.flatMap(
    (scenario): Array<[string, string, Scenario, boolean]> => [
      [scenario.name, 'allowed', scenario, true],
      [scenario.name, 'denied', scenario, false],
    ],
  );

  test.each(rows)(
    '%s: analytics_storage follows measurement %s',
    async (_name, _label, scenario, measurement) => {
      const calls: unknown[][] = [];
      const env: Env = clone(examples.env.push);
      env.window.gtag = jest.fn((...args: unknown[]) => {
        calls.push(args);
      });
      env.window.dataLayer = [];

      flow = await scenario.start(
        {
          destinations: {
            gtag: {
              code: { ...destinationGtag, env },
              config: {
                consent: { analytics: true, marketing: true },
                loadScript: false,
                settings: { ga4: { measurementId: 'G-X' } },
              },
            },
          },
        },
        { measurement },
      );
      await flow?.elb('page view', {});

      // The CMP source emits its consent without awaiting it; wait until
      // gtag received the update, bounded
      const updatesOf = () =>
        calls.filter(
          ([command, target]) => command === 'consent' && target === 'update',
        );
      for (let i = 0; i < 100 && updatesOf().length === 0; i++)
        await new Promise((settle) => setTimeout(settle, 5));

      const updates = updatesOf();
      expect(updates.length).toBeGreaterThan(0);
      expect(updates[updates.length - 1][2]).toMatchObject({
        analytics_storage: measurement ? 'granted' : 'denied',
      });
    },
  );
});
