import { destinationGtag, resetConsentState } from '../index';
import { createMockContext, createMockLogger, getEvent } from '@walkeros/core';
import type { Collector } from '@walkeros/core';

// Integration: no tool mocks. init runs with an empty env so getEnv falls back
// to the real jsdom window, where initializeGtag installs the real gtag stub.
// The push then carries an injected observe recorder, so getEnv wraps
// window.gtag at the resolution point and records the vendor call while the
// real dataLayer still receives it.
describe('gtag observe capture (integration)', () => {
  const collector = {} as Collector.Instance;

  beforeEach(() => {
    resetConsentState();
    Reflect.deleteProperty(window, 'gtag');
    Reflect.set(window, 'dataLayer', []);
  });

  afterEach(() => {
    Reflect.deleteProperty(window, 'gtag');
    Reflect.deleteProperty(window, 'dataLayer');
  });

  it('records window.gtag while the real dataLayer receives the event', async () => {
    const logger = createMockLogger();
    const config = { settings: { ga4: { measurementId: 'G-INT' } } };

    destinationGtag.init!(
      createMockContext({ config, collector, logger, id: 'gtag' }),
    );

    const records: Array<{ fn: string; args: unknown[] }> = [];
    const record = (fn: string, args: unknown[]) => {
      records.push({ fn, args });
    };

    await destinationGtag.push(
      getEvent('page view'),
      createMockContext({
        config,
        rule: { settings: { ga4: {} } },
        data: {},
        env: { observe: { paths: ['window.gtag'], record } },
        logger,
        id: 'gtag',
      }),
    );

    expect(records).toContainEqual({
      fn: 'window.gtag',
      args: [
        'event',
        'page_view',
        expect.objectContaining({ send_to: 'G-INT' }),
      ],
    });

    const dataLayer = Reflect.get(window, 'dataLayer');
    const entries = Array.isArray(dataLayer) ? dataLayer : [];
    const eventEntry = entries
      .map((entry) => Array.from(entry))
      .find((args) => args[0] === 'event');

    expect(eventEntry).toEqual([
      'event',
      'page_view',
      expect.objectContaining({ send_to: 'G-INT' }),
    ]);
  });
});
