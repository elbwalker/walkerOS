import type { WalkerOS } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { clone } from '@walkeros/core';
import { examples } from '../dev';
import { resetConsentState } from '../index';

type Captured = [callable: string, ...args: unknown[]];

/**
 * Init-time effects are not part of the mapped-step behavior and are filtered
 * from the captured sequence before comparison with `example.out`.
 *
 * Destination init emits:
 *   - gtag('js', <Date>)
 *   - gtag('config', <measurementId>, ...)
 *   - gtag('consent', 'default', ...)
 *   - dataLayer.push({ event: 'gtm.js', 'gtm.start': <number> })
 */
function isInitEffect(effect: Captured): boolean {
  const [callable, a, b] = effect;
  if (callable === 'gtag') {
    if (a === 'js') return true;
    if (a === 'config') return true;
    if (a === 'consent' && b === 'default') return true;
  }
  if (callable === 'dataLayer.push') {
    if (
      a &&
      typeof a === 'object' &&
      (a as Record<string, unknown>).event === 'gtm.js'
    ) {
      return true;
    }
  }
  return false;
}

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
    // Ensure a fresh dataLayer per example run.
    env.window.dataLayer = [];

    const dest = jest.requireActual('../').default;
    const { elb } = await startFlow({ tagging: 2 });

    // Command examples: route `in` through elb('walker <command>', in) instead
    // of pushing it as an event. Wire a minimal destination first so the
    // command handler has at least one tool registered.
    if (example.command) {
      await elb(
        'walker destination',
        { ...dest, env },
        { settings: { ga4: { measurementId: 'G-XXXXXX-1' } } },
      );

      const cmd = `walker ${example.command}` as 'walker consent';
      await elb(cmd, example.in as WalkerOS.Consent);

      const captured: Captured[] = [
        ...mockGtag.mock.calls.map((args) => ['gtag', ...args] as Captured),
        ...(env.window.dataLayer as unknown[]).map(
          (entry) => ['dataLayer.push', entry] as Captured,
        ),
      ].filter((effect) => !isInitEffect(effect));

      expect(captured).toEqual(example.out);
      return;
    }

    // Derive destination-level settings from mapping settings
    const destSettings: Record<string, unknown> = {};
    if (
      !mapping?.settings ||
      mappingSettings.ga4 !== undefined ||
      (!mappingSettings.ads && !mappingSettings.gtm)
    ) {
      destSettings.ga4 = { measurementId: 'G-XXXXXX-1' };
    }
    if (mappingSettings.ads) {
      destSettings.ads = { conversionId: 'AW-123456789', currency: 'EUR' };
    }
    if (mappingSettings.gtm) {
      destSettings.gtm = { containerId: 'GTM-XXXXXXX' };
    }

    const mappingConfig = mapping
      ? (() => {
          const event = example.in as WalkerOS.Event;
          return { [event.entity]: { [event.action]: mapping } };
        })()
      : undefined;

    await elb(
      'walker destination',
      { ...dest, env },
      {
        settings: destSettings,
        mapping: mappingConfig,
      },
    );

    const event = example.in as WalkerOS.Event;
    await elb(event);

    const captured: Captured[] = [
      ...mockGtag.mock.calls.map((args) => ['gtag', ...args] as Captured),
      ...(env.window.dataLayer as unknown[]).map(
        (entry) => ['dataLayer.push', entry] as Captured,
      ),
    ].filter((effect) => !isInitEffect(effect));

    expect(captured).toEqual(example.out);
  });
});
