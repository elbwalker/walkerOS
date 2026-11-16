import { DEFAULT_CATEGORY_MAP } from '../index';
import type { Elb, MockLogger } from '@walkeros/core';
import { createMockLogger } from '@walkeros/core';
import type { Types } from '../types';
import { createCookieConsentApi } from '../examples/env';
import * as inputs from '../examples/inputs';
import * as outputs from '../examples/outputs';
import {
  createMockElb,
  createMockWindow,
  createCookieConsentSource,
  ConsentCall,
} from './test-utils';

const CONSENT = 'cc:onConsent';
const CHANGE = 'cc:onChange';

/** A complete env for a destroy context; destroy itself never reads it. */
function destroyEnv(elb: Elb.Fn): Types['env'] {
  return { push: elb, command: elb, elb, logger: createMockLogger() };
}

describe('CookieConsent source', () => {
  let consentCalls: ConsentCall[];
  let mockElb: ReturnType<typeof createMockElb>;
  let logger: MockLogger;

  beforeEach(() => {
    consentCalls = [];
    mockElb = createMockElb(consentCalls);
    logger = createMockLogger();
  });

  describe('initialization', () => {
    test('returns the cookieconsent source type', async () => {
      const source = await createCookieConsentSource(
        createMockWindow(),
        mockElb,
      );

      expect(source.type).toBe('cookieconsent');
    });

    test('uses the default category map when none is given', async () => {
      const source = await createCookieConsentSource(
        createMockWindow(),
        mockElb,
      );

      expect(source.config.settings?.categoryMap).toEqual(DEFAULT_CATEGORY_MAP);
    });

    test('merges a custom map with the defaults and keeps its casing', async () => {
      const source = await createCookieConsentSource(
        createMockWindow(),
        mockElb,
        { categoryMap: { Ads: 'advertising' } },
      );

      expect(source.config.settings?.categoryMap).toEqual({
        ...DEFAULT_CATEGORY_MAP,
        Ads: 'advertising',
      });
    });

    test('factory adds no listener and publishes nothing until init runs', async () => {
      const mockWindow = createMockWindow(inputs.acceptAll);
      const source = await createCookieConsentSource(
        mockWindow,
        mockElb,
        undefined,
        logger,
        { init: false },
      );

      expect(mockWindow.addEventListener).not.toHaveBeenCalled();
      expect(mockElb).not.toHaveBeenCalled();

      await source.init?.();

      expect(consentCalls).toEqual([{ consent: outputs.acceptAllMapped }]);
    });

    test('init listens to cc:onConsent and cc:onChange only, once each', async () => {
      const mockWindow = createMockWindow();
      await createCookieConsentSource(mockWindow, mockElb);

      const names = mockWindow.addEventListener.mock.calls.map(
        ([name]) => name,
      );
      expect(names.sort()).toEqual([CHANGE, CONSENT]);
      expect(mockWindow.__listeners(CONSENT)).toBe(1);
      expect(mockWindow.__listeners(CHANGE)).toBe(1);
    });
  });

  describe('already loaded', () => {
    test('publishes a valid stored decision at init', async () => {
      await createCookieConsentSource(
        createMockWindow(inputs.analyticsOnly),
        mockElb,
      );

      expect(consentCalls).toEqual([{ consent: outputs.analyticsOnlyMapped }]);
    });

    test('publishes nothing at init while CookieConsent holds no choice', async () => {
      await createCookieConsentSource(
        createMockWindow(inputs.noChoice),
        mockElb,
      );

      expect(consentCalls).toHaveLength(0);
    });

    test('publishes and logs nothing at init while CookieConsent is not on the page', async () => {
      await createCookieConsentSource(
        createMockWindow(),
        mockElb,
        undefined,
        logger,
      );

      expect(consentCalls).toHaveLength(0);
      expect(logger.error).not.toHaveBeenCalled();
      expect(logger.warn).not.toHaveBeenCalled();
      expect(logger.info).not.toHaveBeenCalled();
    });
  });

  describe('explicit consent filtering', () => {
    test.each([
      { name: 'noChoice', input: inputs.noChoice, event: CONSENT },
      { name: 'noChoice', input: inputs.noChoice, event: CHANGE },
      { name: 'optOutDefaults', input: inputs.optOutDefaults, event: CONSENT },
      { name: 'optOutDefaults', input: inputs.optOutDefaults, event: CHANGE },
    ])(
      'publishes nothing for $name on $event without a valid consent',
      async ({ input, event }) => {
        const mockWindow = createMockWindow();
        await createCookieConsentSource(mockWindow, mockElb, undefined, logger);

        mockWindow.CookieConsent = createCookieConsentApi(input);
        mockWindow.__dispatch(event);

        expect(consentCalls).toHaveLength(0);
        // Unmet consent waits by intent, it is no error
        expect(logger.error).not.toHaveBeenCalled();
      },
    );
  });

  describe('non-decision events', () => {
    test.each([
      'cc:onFirstConsent',
      'cc:onModalShow',
      'cc:onModalReady',
      'cc:onModalHide',
    ])('%s publishes nothing', async (event) => {
      const mockWindow = createMockWindow(inputs.noChoice);
      await createCookieConsentSource(mockWindow, mockElb);

      mockWindow.CookieConsent = createCookieConsentApi(inputs.acceptAll);
      mockWindow.__dispatch(event);

      expect(consentCalls).toHaveLength(0);
    });
  });

  describe('category mapping', () => {
    test.each([
      {
        name: 'acceptAll',
        input: inputs.acceptAll,
        output: outputs.acceptAllMapped,
      },
      {
        name: 'rejectAll',
        input: inputs.rejectAll,
        output: outputs.rejectAllMapped,
      },
      {
        name: 'analyticsOnly',
        input: inputs.analyticsOnly,
        output: outputs.analyticsOnlyMapped,
      },
      {
        name: 'customCategory',
        input: inputs.customCategory,
        output: outputs.customCategoryMapped,
      },
      {
        // The site sets the category names, so their casing varies
        name: 'uppercaseCategory',
        input: inputs.uppercaseCategory,
        output: outputs.analyticsOnlyMapped,
      },
    ])('maps $name to its walkerOS groups', async ({ input, output }) => {
      await createCookieConsentSource(createMockWindow(input), mockElb);

      expect(consentCalls).toEqual([{ consent: output }]);
    });

    test('applies a custom category map', async () => {
      await createCookieConsentSource(
        createMockWindow(inputs.analyticsOnly),
        mockElb,
        { categoryMap: { analytics: 'statistics' } },
      );

      expect(consentCalls[0].consent).toEqual(
        outputs.analyticsOnlyCustomMapped,
      );
    });

    test.each([
      { name: 'analyticsOnly', input: inputs.analyticsOnly, granted: false },
      { name: 'acceptAll', input: inputs.acceptAll, granted: true },
    ])(
      'grants a shared group for $name only when every category mapped to it is accepted',
      async ({ input, granted }) => {
        await createCookieConsentSource(createMockWindow(input), mockElb, {
          categoryMap: { analytics: 'measure', ads: 'measure' },
        });

        expect(consentCalls[0].consent.measure).toBe(granted);
      },
    );

    test('a choice that grants only strictly necessary cookies leaves every group except necessary false', async () => {
      await createCookieConsentSource(
        createMockWindow(inputs.rejectAll),
        mockElb,
      );

      const { necessary, ...groups } = consentCalls[0].consent;
      expect(necessary).toBe(true);
      expect(Object.keys(groups).length).toBeGreaterThan(0);
      Object.values(groups).forEach((value) => expect(value).toBe(false));
    });

    test('matches category map keys case-insensitively', async () => {
      await createCookieConsentSource(
        createMockWindow(inputs.analyticsOnly),
        mockElb,
        { categoryMap: { ADS: 'advertising' } },
      );

      const { marketing, ...rest } = outputs.analyticsOnlyMapped;
      expect(consentCalls[0].consent).toEqual({
        ...rest,
        advertising: marketing,
      });
    });
  });

  describe('event handling', () => {
    test.each([CONSENT, CHANGE])(
      '%s publishes a decision made after the source started',
      async (event) => {
        const mockWindow = createMockWindow();
        await createCookieConsentSource(mockWindow, mockElb);

        mockWindow.CookieConsent = createCookieConsentApi(inputs.acceptAll);
        mockWindow.__dispatch(event);

        expect(consentCalls).toEqual([{ consent: outputs.acceptAllMapped }]);
      },
    );

    test('publishes a stored decision once for the static read and cc:onConsent at load', async () => {
      const mockWindow = createMockWindow(inputs.analyticsOnly);
      await createCookieConsentSource(mockWindow, mockElb);

      // CookieConsent fires cc:onConsent on every load with a valid decision
      mockWindow.__dispatch(CONSENT);

      expect(consentCalls).toEqual([{ consent: outputs.analyticsOnlyMapped }]);
    });

    test('publishes once for cc:onConsent then cc:onChange with the same state', async () => {
      const mockWindow = createMockWindow();
      await createCookieConsentSource(mockWindow, mockElb);

      // An opt-out first decision that differs from the defaults fires both
      mockWindow.CookieConsent = createCookieConsentApi(inputs.analyticsOnly);
      mockWindow.__dispatch(CONSENT);
      mockWindow.__dispatch(CHANGE);

      expect(consentCalls).toEqual([{ consent: outputs.analyticsOnlyMapped }]);
    });

    test('publishes two different decisions twice', async () => {
      const mockWindow = createMockWindow(inputs.analyticsOnly);
      await createCookieConsentSource(mockWindow, mockElb);

      mockWindow.CookieConsent = createCookieConsentApi(inputs.acceptAll);
      mockWindow.__dispatch(CHANGE);

      expect(consentCalls).toEqual([
        { consent: outputs.analyticsOnlyMapped },
        { consent: outputs.acceptAllMapped },
      ]);
    });
  });

  describe('consent revocation', () => {
    test('reports a withdrawn ads category as marketing false', async () => {
      const mockWindow = createMockWindow(inputs.acceptAll);
      await createCookieConsentSource(mockWindow, mockElb);

      mockWindow.CookieConsent = createCookieConsentApi(inputs.analyticsOnly);
      mockWindow.__dispatch(CHANGE);

      expect(consentCalls).toHaveLength(2);
      expect(consentCalls[1].consent.marketing).toBe(false);
    });

    test('reports every group as explicit false after accept all then reject all', async () => {
      const mockWindow = createMockWindow(inputs.acceptAll);
      await createCookieConsentSource(mockWindow, mockElb);

      mockWindow.CookieConsent = createCookieConsentApi(inputs.rejectAll);
      mockWindow.__dispatch(CHANGE);

      expect(consentCalls).toHaveLength(2);
      expect(consentCalls[1].consent).toEqual(outputs.rejectAllMapped);
      expect(consentCalls[1].consent.analytics).toBe(false);
      expect(consentCalls[1].consent.marketing).toBe(false);
    });
  });

  describe('failure visibility', () => {
    test.each([CONSENT, CHANGE])(
      'a decision event without window.CookieConsent writes one ERROR line and publishes nothing (%s)',
      async (event) => {
        const mockWindow = createMockWindow();
        await createCookieConsentSource(mockWindow, mockElb, undefined, logger);

        mockWindow.__dispatch(event);

        expect(consentCalls).toHaveLength(0);
        expect(logger.error).toHaveBeenCalledTimes(1);
        expect(String(logger.error.mock.calls[0][0])).toMatch(
          new RegExp(
            `^CookieConsent fired ${event}, but window.CookieConsent is missing`,
          ),
        );
      },
    );

    test('a getter that throws writes one ERROR line and publishes nothing', async () => {
      const mockWindow = createMockWindow();
      await createCookieConsentSource(mockWindow, mockElb, undefined, logger);
      const failure = new Error('broken cookie');

      mockWindow.CookieConsent = {
        validConsent: () => true,
        getUserPreferences: () => {
          throw failure;
        },
      };
      mockWindow.__dispatch(CONSENT);

      expect(consentCalls).toHaveLength(0);
      expect(logger.error).toHaveBeenCalledTimes(1);
      expect(logger.error).toHaveBeenCalledWith(
        'CookieConsent decision could not be read: getUserPreferences failed',
        failure,
      );
    });
  });

  describe('cleanup', () => {
    test('destroy removes both listeners', async () => {
      const mockWindow = createMockWindow();
      const source = await createCookieConsentSource(mockWindow, mockElb);

      await source.destroy?.({
        id: 'test-cookieconsent',
        config: source.config,
        env: destroyEnv(mockElb),
        logger: createMockLogger(),
      });

      expect(mockWindow.__listeners(CONSENT)).toBe(0);
      expect(mockWindow.__listeners(CHANGE)).toBe(0);

      mockWindow.CookieConsent = createCookieConsentApi(inputs.acceptAll);
      mockWindow.__dispatch(CONSENT);
      expect(consentCalls).toHaveLength(0);
    });

    test('destroy before init does not throw and removes nothing', async () => {
      const mockWindow = createMockWindow();
      const source = await createCookieConsentSource(
        mockWindow,
        mockElb,
        undefined,
        logger,
        { init: false },
      );

      await expect(
        source.destroy?.({
          id: 'test-cookieconsent',
          config: source.config,
          env: destroyEnv(mockElb),
          logger: createMockLogger(),
        }),
      ).resolves.toBeUndefined();
      expect(mockWindow.removeEventListener).not.toHaveBeenCalled();
    });
  });

  describe('no env.window', () => {
    // jsdom's window is not configurable and the shared web setup needs it,
    // so globalThis.window cannot be removed here: the source falls back to
    // the page's window, which has no CookieConsent.
    test('falls back to the page window: init resolves, publishes and logs nothing', async () => {
      const source = await createCookieConsentSource(
        undefined,
        mockElb,
        undefined,
        logger,
        { init: false },
      );

      await expect(source.init?.()).resolves.toBeUndefined();
      expect(consentCalls).toHaveLength(0);
      expect(logger.error).not.toHaveBeenCalled();
    });
  });
});
