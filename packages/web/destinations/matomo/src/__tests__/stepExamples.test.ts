import type { WalkerOS, Mapping as WalkerOSMapping } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { clone } from '@walkeros/core';
import { examples } from '../dev';

type CallRecord = [string, ...unknown[]];

/**
 * Init-time effects are the Matomo tracker bootstrap calls that run before
 * any event is pushed (setTrackerUrl, setSiteId, trackPageView-on-init if
 * auto-tracking is enabled, etc). They are not part of the mapped step's
 * `out` shape, so they are filtered before comparison.
 */
function isInitEffect(call: CallRecord): boolean {
  if (call[0] !== '_paq.push') return false;
  const inner = call[1];
  if (!Array.isArray(inner) || inner.length === 0) return false;
  const method = inner[0];
  return (
    method === 'setTrackerUrl' ||
    method === 'setSiteId' ||
    method === 'enableLinkTracking' ||
    method === 'enableHeartBeatTimer' ||
    method === 'requireConsent' ||
    method === 'setConsentGiven' ||
    method === 'requireCookieConsent' ||
    method === 'setCookieConsentGiven' ||
    method === 'setDocumentTitle' ||
    method === 'setCustomUrl' ||
    method === 'setReferrerUrl' ||
    method === 'setUserId' ||
    (method === 'trackPageView' && inner.length === 1)
  );
}

describe('matomo web destination -- step examples', () => {
  it.each(Object.entries(examples.step))('%s', async (_name, example) => {
    const mapping = example.mapping as WalkerOSMapping.Rule | undefined;
    const event = example.in as WalkerOS.Event;

    // Create a recording _paq mock that accepts a single array argument per push.
    const calls: CallRecord[] = [];
    const mockPaq = [] as unknown as Array<unknown> & { push: jest.Mock };
    mockPaq.push = jest.fn((...args: unknown[]) => {
      calls.push(['_paq.push', args[0]]);
      return calls.length;
    });

    const env = clone(examples.env.push);
    env.window._paq = mockPaq;

    const dest = jest.requireActual('../').default;
    const { elb } = await startFlow({ tagging: 2 });

    const mappingConfig = mapping
      ? { [event.entity]: { [event.action]: mapping } }
      : undefined;

    await elb(
      'walker destination',
      { ...dest, env },
      {
        settings: { siteId: '1', url: 'https://analytics.example.com/' },
        mapping: mappingConfig,
      },
    );

    await elb(event);

    const expected = (example.out ?? []) as ReadonlyArray<CallRecord>;
    const actual = calls.filter((call) => !isInitEffect(call));
    expect(actual).toEqual(expected);
  });
});
