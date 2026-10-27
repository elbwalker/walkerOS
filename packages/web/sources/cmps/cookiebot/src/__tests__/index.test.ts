import { DEFAULT_CATEGORY_MAP } from '../index';
import type { Elb } from '@walkeros/core';
import { createMockLogger } from '@walkeros/core';
import type { Types } from '../types';
import * as inputs from '../examples/inputs';
import * as outputs from '../examples/outputs';
import {
  createMockElb,
  createMockWindow,
  createCookiebotSource,
  ConsentCall,
} from './test-utils';

const ACCEPT = 'CookiebotOnAccept';
const DECLINE = 'CookiebotOnDecline';

/** A complete env for a destroy context; destroy itself never reads it. */
function destroyEnv(elb: Elb.Fn): Types['env'] {
  return { push: elb, command: elb, elb, logger: createMockLogger() };
}

describe('Cookiebot Source', () => {
  let consentCalls: ConsentCall[];
  let mockElb: ReturnType<typeof createMockElb>;

  beforeEach(() => {
    consentCalls = [];
    mockElb = createMockElb(consentCalls);
  });

  describe('initialization', () => {
    test('returns the cookiebot source type', async () => {
      const source = await createCookiebotSource(createMockWindow(), mockElb);

      expect(source.type).toBe('cookiebot');
    });

    test('uses default settings when none provided', async () => {
      const source = await createCookiebotSource(createMockWindow(), mockElb);

      expect(source.config.settings?.categoryMap).toEqual(DEFAULT_CATEGORY_MAP);
      expect(source.config.settings?.explicitOnly).toBe(true);
    });

    test('merges custom settings with defaults', async () => {
      const source = await createCookiebotSource(createMockWindow(), mockElb, {
        settings: {
          categoryMap: { statistics: 'statistics' },
          explicitOnly: false,
        },
      });

      expect(source.config.settings?.categoryMap?.statistics).toBe(
        'statistics',
      );
      expect(source.config.settings?.categoryMap?.marketing).toBe('marketing');
      expect(source.config.settings?.explicitOnly).toBe(false);
    });

    test('factory attaches no listener and emits nothing until init runs', async () => {
      const mockWindow = createMockWindow(inputs.fullConsent);
      const source = await createCookiebotSource(
        mockWindow,
        mockElb,
        {},
        { init: false },
      );

      expect(mockWindow.addEventListener).not.toHaveBeenCalled();
      expect(consentCalls).toHaveLength(0);

      await source.init?.();

      expect(mockWindow.__listenerCount(ACCEPT)).toBe(1);
      expect(mockWindow.__listenerCount(DECLINE)).toBe(1);
      expect(consentCalls).toHaveLength(1);
    });

    test('listens to neither the CookieConsent alias events nor consent ready', async () => {
      const mockWindow = createMockWindow();
      await createCookiebotSource(mockWindow, mockElb);

      const events = mockWindow.addEventListener.mock.calls.map(([e]) => e);
      expect(events.sort()).toEqual([ACCEPT, DECLINE]);
    });
  });

  describe('already loaded', () => {
    test('publishes the stored consent at init', async () => {
      await createCookiebotSource(
        createMockWindow(inputs.partialConsent),
        mockElb,
      );

      expect(consentCalls).toEqual([{ consent: outputs.partialConsentMapped }]);
    });

    test('skips a Cookiebot without a response', async () => {
      await createCookiebotSource(createMockWindow(inputs.noResponse), mockElb);

      expect(consentCalls).toHaveLength(0);
    });

    test('waits for an event when Cookiebot is not loaded yet', async () => {
      const mockWindow = createMockWindow();
      await createCookiebotSource(mockWindow, mockElb);
      expect(consentCalls).toHaveLength(0);

      mockWindow.Cookiebot = inputs.fullConsent;
      mockWindow.__fire(ACCEPT);

      expect(consentCalls).toEqual([{ consent: outputs.fullConsentMapped }]);
    });
  });

  describe('explicit consent filtering', () => {
    test('skips implied consent by default', async () => {
      const mockWindow = createMockWindow(inputs.impliedConsent);
      await createCookiebotSource(mockWindow, mockElb);
      mockWindow.__fire(ACCEPT);

      expect(consentCalls).toHaveLength(0);
    });

    test('publishes implied consent when explicitOnly is false', async () => {
      await createCookiebotSource(
        createMockWindow(inputs.impliedConsent),
        mockElb,
        { settings: { explicitOnly: false } },
      );

      expect(consentCalls).toEqual([{ consent: outputs.fullConsentMapped }]);
    });

    test('compares the consent method case-insensitively', async () => {
      await createCookiebotSource(
        createMockWindow(inputs.uppercaseMethod),
        mockElb,
      );

      expect(consentCalls).toEqual([{ consent: outputs.fullConsentMapped }]);
    });

    test('skips a consent without a method even when explicitOnly is false', async () => {
      const mockWindow = createMockWindow();
      await createCookiebotSource(mockWindow, mockElb, {
        settings: { explicitOnly: false },
      });

      mockWindow.Cookiebot = inputs.noResponse;
      mockWindow.__fire(DECLINE);

      expect(consentCalls).toHaveLength(0);
    });
  });

  describe('event handling', () => {
    test('handles an accept after the source started', async () => {
      const mockWindow = createMockWindow(inputs.noResponse);
      await createCookiebotSource(mockWindow, mockElb);

      mockWindow.Cookiebot = inputs.fullConsent;
      mockWindow.__fire(ACCEPT);

      expect(consentCalls).toEqual([{ consent: outputs.fullConsentMapped }]);
    });

    test('handles a decline after the source started', async () => {
      const mockWindow = createMockWindow(inputs.noResponse);
      await createCookiebotSource(mockWindow, mockElb);

      mockWindow.Cookiebot = inputs.necessaryOnly;
      mockWindow.__fire(DECLINE);

      expect(consentCalls).toEqual([{ consent: outputs.necessaryOnlyMapped }]);
    });

    test('ignores an event while Cookiebot is missing', async () => {
      const mockWindow = createMockWindow();
      await createCookiebotSource(mockWindow, mockElb);

      mockWindow.__fire(ACCEPT);

      expect(consentCalls).toHaveLength(0);
    });

    test('publishes a returning visitor once for the static read and the load event', async () => {
      const mockWindow = createMockWindow(inputs.fullConsent);
      await createCookiebotSource(mockWindow, mockElb);

      // uc.js fires CookiebotOnAccept on every page load with a stored choice
      mockWindow.__fire(ACCEPT);

      expect(consentCalls).toEqual([{ consent: outputs.fullConsentMapped }]);
    });

    test('publishes every change of the consent', async () => {
      const mockWindow = createMockWindow(inputs.partialConsent);
      await createCookiebotSource(mockWindow, mockElb);

      mockWindow.Cookiebot = inputs.fullConsent;
      mockWindow.__fire(ACCEPT);
      mockWindow.Cookiebot = inputs.partialConsent;
      mockWindow.__fire(ACCEPT);

      expect(consentCalls).toEqual([
        { consent: outputs.partialConsentMapped },
        { consent: outputs.fullConsentMapped },
        { consent: outputs.partialConsentMapped },
      ]);
    });
  });

  describe('category mapping', () => {
    test('denies functional when preferences are denied, although necessary is granted', async () => {
      await createCookiebotSource(
        createMockWindow(inputs.necessaryOnly),
        mockElb,
      );

      expect(consentCalls[0].consent.necessary).toBe(true);
      expect(consentCalls[0].consent.functional).toBe(false);
    });

    test('grants a group only when every category mapped to it is granted', async () => {
      await createCookiebotSource(
        createMockWindow(inputs.partialConsent),
        mockElb,
        { settings: { categoryMap: { statistics: 'ads', marketing: 'ads' } } },
      );

      // statistics is granted, marketing denied: any deny denies
      expect(consentCalls[0].consent.ads).toBe(false);
    });

    test('grants a group when all categories mapped to it are granted', async () => {
      await createCookiebotSource(
        createMockWindow(inputs.fullConsent),
        mockElb,
        { settings: { categoryMap: { statistics: 'ads', marketing: 'ads' } } },
      );

      expect(consentCalls[0].consent.ads).toBe(true);
    });

    test('applies a custom category map', async () => {
      await createCookiebotSource(
        createMockWindow(inputs.partialConsent),
        mockElb,
        { settings: { categoryMap: { statistics: 'statistics' } } },
      );

      expect(consentCalls[0].consent).toEqual(
        outputs.partialConsentCustomMapped,
      );
    });

    test('matches category map keys case-insensitively and keeps their casing in the config', async () => {
      const source = await createCookiebotSource(
        createMockWindow(inputs.partialConsent),
        mockElb,
        { settings: { categoryMap: { Statistics: 'statistics' } } },
      );

      expect(consentCalls[0].consent).toEqual(
        outputs.partialConsentCustomMapped,
      );
      expect(source.config.settings?.categoryMap).toHaveProperty('Statistics');
    });

    test('passes an unmapped category through under its own name', async () => {
      await createCookiebotSource(
        createMockWindow({
          ...inputs.fullConsent,
          consent: { ...inputs.fullConsent.consent, custom: false },
        }),
        mockElb,
      );

      expect(consentCalls[0].consent).toEqual({
        ...outputs.fullConsentMapped,
        custom: false,
      });
    });

    test('ignores the stamp and method fields', async () => {
      await createCookiebotSource(
        createMockWindow(inputs.fullConsent),
        mockElb,
      );

      expect(Object.keys(consentCalls[0].consent).sort()).toEqual([
        'analytics',
        'functional',
        'marketing',
        'necessary',
      ]);
    });
  });

  describe('consent revocation', () => {
    test('reports denied groups as explicit false after allow all', async () => {
      const mockWindow = createMockWindow(inputs.fullConsent);
      await createCookiebotSource(mockWindow, mockElb);

      mockWindow.Cookiebot = inputs.necessaryOnly;
      mockWindow.__fire(DECLINE);

      expect(consentCalls).toHaveLength(2);
      expect(consentCalls[1].consent).toEqual(outputs.necessaryOnlyMapped);
      expect(consentCalls[1].consent.marketing).toBe(false);
      expect(consentCalls[1].consent.analytics).toBe(false);
    });

    test('reports a revoked marketing consent', async () => {
      const mockWindow = createMockWindow(inputs.fullConsent);
      await createCookiebotSource(mockWindow, mockElb);

      mockWindow.Cookiebot = inputs.partialConsent;
      mockWindow.__fire(ACCEPT);

      expect(consentCalls[1].consent.marketing).toBe(false);
    });
  });

  describe('cleanup', () => {
    test('destroy removes both listeners', async () => {
      const mockWindow = createMockWindow();
      const source = await createCookiebotSource(mockWindow, mockElb);

      await source.destroy?.({
        id: 'test-cookiebot',
        config: source.config,
        env: destroyEnv(mockElb),
        logger: createMockLogger(),
      });

      expect(mockWindow.__listenerCount(ACCEPT)).toBe(0);
      expect(mockWindow.__listenerCount(DECLINE)).toBe(0);

      mockWindow.Cookiebot = inputs.fullConsent;
      mockWindow.__fire(ACCEPT);
      expect(consentCalls).toHaveLength(0);
    });

    test('destroy before init removes nothing', async () => {
      const mockWindow = createMockWindow();
      const source = await createCookiebotSource(
        mockWindow,
        mockElb,
        {},
        { init: false },
      );

      await source.destroy?.({
        id: 'test-cookiebot',
        config: source.config,
        env: destroyEnv(mockElb),
        logger: createMockLogger(),
      });

      expect(mockWindow.removeEventListener).not.toHaveBeenCalled();
    });
  });
});
