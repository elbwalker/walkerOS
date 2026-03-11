import type { WalkerOS } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { clone } from '@walkeros/core';
import { examples } from '../dev';
import { resetConsentState } from '../index';

describe('Step Examples', () => {
  beforeEach(() => {
    resetConsentState();
  });

  it.each(Object.entries(examples.step))('%s', async (name, example) => {
    const mapping = example.mapping as Record<string, unknown> | undefined;
    const mappingSettings = (mapping?.settings || {}) as Record<
      string,
      unknown
    >;

    const mockGtag = jest.fn();
    const env = clone(examples.env.push);
    env.window.gtag = mockGtag;

    const dest = jest.requireActual('../').default;
    const { elb } = await startFlow({ tagging: 2 });

    // Derive destination-level settings from mapping settings
    const destSettings: Record<string, unknown> = {};
    if (
      !mapping?.settings ||
      mappingSettings.ga4 !== undefined ||
      (!mappingSettings.ads && !mappingSettings.gtm && !mapping._consent)
    ) {
      destSettings.ga4 = { measurementId: 'G-XXXXXX-1' };
    }
    if (mappingSettings.ads) {
      destSettings.ads = { conversionId: 'AW-123456789', currency: 'EUR' };
    }
    if (mappingSettings.gtm) {
      destSettings.gtm = { containerId: 'GTM-XXXXXXX' };
    }
    // Consent examples need at least one tool for init
    if (mapping?._consent && !destSettings.ga4) {
      destSettings.ga4 = { measurementId: 'G-XXXXXX-1' };
    }

    const mappingConfig = mapping
      ? (() => {
          // For consent examples, no event mapping is needed
          if (mapping._consent) return undefined;
          const event = example.in as WalkerOS.Event;
          return { [event.entity]: { [event.action]: mapping } };
        })()
      : undefined;

    elb(
      'walker destination',
      { ...dest, env },
      {
        settings: destSettings,
        mapping: mappingConfig,
      },
    );

    if (mapping?._consent) {
      // Consent examples: trigger consent handler instead of pushing an event
      await elb('walker consent', example.in as WalkerOS.Consent);

      const outArgs = example.out as unknown[];
      const consentCall = mockGtag.mock.calls.find(
        (call) => call[0] === 'consent' && call[1] === 'update',
      );
      expect(consentCall).toBeDefined();
      expect(consentCall![2]).toEqual(outArgs[2]);
    } else if (
      example.out &&
      typeof example.out === 'object' &&
      !Array.isArray(example.out) &&
      ('ga4' in (example.out as object) ||
        'ads' in (example.out as object) ||
        'gtm' in (example.out as object))
    ) {
      // Multi-tool examples: out is { ga4: [...], ads: [...], gtm: {...} }
      const event = example.in as WalkerOS.Event;
      await elb(event);

      const multiOut = example.out as Record<string, unknown>;

      if (multiOut.ga4) {
        const ga4Args = multiOut.ga4 as unknown[];
        const ga4Call = mockGtag.mock.calls.find(
          (call) => call[0] === 'event' && call[1] === ga4Args[1],
        );
        expect(ga4Call).toBeDefined();
        expect(ga4Call![2]).toEqual(
          expect.objectContaining(ga4Args[2] as object),
        );
      }

      if (multiOut.ads) {
        const adsArgs = multiOut.ads as unknown[];
        const adsCall = mockGtag.mock.calls.find(
          (call) => call[0] === 'event' && call[1] === 'conversion',
        );
        expect(adsCall).toBeDefined();
        expect(adsCall![2]).toEqual(
          expect.objectContaining(adsArgs[2] as object),
        );
      }

      if (multiOut.gtm) {
        const gtmExpected = multiOut.gtm as object;
        expect(env.window.dataLayer).toEqual(
          expect.arrayContaining([expect.objectContaining(gtmExpected)]),
        );
      }
    } else if (
      example.out &&
      typeof example.out === 'object' &&
      !Array.isArray(example.out)
    ) {
      // Plain object out: dataLayer push (GTM)
      const event = example.in as WalkerOS.Event;
      await elb(event);

      const gtmExpected = example.out as object;
      expect(env.window.dataLayer).toEqual(
        expect.arrayContaining([expect.objectContaining(gtmExpected)]),
      );
    } else {
      // Standard gtag call (existing behavior)
      const event = example.in as WalkerOS.Event;
      await elb(event);

      const outArgs = example.out as unknown[];
      const lastCall = mockGtag.mock.calls[mockGtag.mock.calls.length - 1];
      expect(lastCall[0]).toBe(outArgs[0]); // 'event' or 'consent'
      expect(lastCall[1]).toBe(outArgs[1]); // event name
      expect(lastCall[2]).toEqual(
        expect.objectContaining(outArgs[2] as object),
      );
    }
  });
});
