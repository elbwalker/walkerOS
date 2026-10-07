import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { startFlow } from '@walkeros/collector';
import destinationGtag from '@walkeros/web-destination-gtag';
import { examples as gtag } from '@walkeros/web-destination-gtag/dev';
import destinationMeta from '@walkeros/web-destination-meta';
import { examples as meta } from '@walkeros/web-destination-meta/dev';
import destinationTikTok from '@walkeros/web-destination-tiktok';
import { examples as tiktok } from '@walkeros/web-destination-tiktok/dev';
import destinationAmplitude from '@walkeros/web-destination-amplitude';
import { examples as amplitude } from '@walkeros/web-destination-amplitude/dev';

// The homepage's destination mapping demo prints what four destinations send.
// This runs every rule it shows through the real destination in a real
// collector, with only the vendor function mocked, and compares the recorded
// calls with the ones the demo prints. Run with tsx: the data is TypeScript.
const ROOT = join(new URL('..', import.meta.url).pathname, '..');
const { MAPPING_EVENTS, DESTINATION_SETTINGS, GENERATED_ID } = await import(
  `${ROOT}/apps/explorer/src/design/components/viz/data/destination-mapping.ts`
);

/** Each destination, with a recording vendor function in its own env shape. */
const DESTINATIONS = {
  ga4: (record) => ({
    code: destinationGtag,
    env: {
      ...gtag.env.push,
      window: { ...gtag.env.push.window, gtag: record('gtag'), dataLayer: [] },
    },
  }),
  meta: (record) => ({
    code: destinationMeta,
    env: {
      ...meta.env.push,
      window: { fbq: record('fbq'), _fbq: record('fbq') },
    },
  }),
  tiktok: (record) => ({
    code: destinationTikTok,
    env: {
      ...tiktok.env.push,
      window: {
        ttq: Object.assign(() => {}, tiktok.env.push.window.ttq, {
          track: record('ttq.track'),
        }),
      },
    },
  }),
  amplitude: (record) => ({
    code: destinationAmplitude,
    env: {
      amplitude: {
        ...amplitude.env.push.amplitude,
        track: record('amplitude.track'),
        revenue: (revenue) => record('amplitude.revenue')(revenue.toJSON()),
      },
    },
  }),
};

/** The vendor calls a destination makes for `event`, after its own init. */
async function sentBy(id, event, rule) {
  const calls = [];
  const record =
    (name) =>
    (...args) => {
      calls.push([name, ...args]);
    };
  const { code, env } = DESTINATIONS[id](record);
  const { elb } = await startFlow();
  await elb('walker destination', {
    code: { ...code, env },
    config: {
      settings: DESTINATION_SETTINGS[id],
      mapping: {
        [event.entity]: { [event.action]: rule },
        // The warm-up event runs the destination's init; this rule drops it.
        demo: { warmup: { ignore: true } },
      },
    },
  });
  await elb({ name: 'demo warmup' });
  const afterInit = calls.length;
  await elb({
    name: `${event.entity} ${event.action}`,
    data: event.data,
    nested: event.nested ?? [],
  });
  return calls.slice(afterInit);
}

const isObject = (value) =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** `actual`, with each non-empty string where `expected` has GENERATED_ID replaced by it. */
function matchGenerated(expected, actual) {
  if (expected === GENERATED_ID)
    return typeof actual === 'string' && actual.length > 0
      ? GENERATED_ID
      : actual;
  if (Array.isArray(expected) && Array.isArray(actual))
    return actual.map((item, index) => matchGenerated(expected[index], item));
  if (isObject(expected) && isObject(actual))
    return Object.fromEntries(
      Object.entries(actual).map(([key, item]) => [
        key,
        matchGenerated(expected[key], item),
      ]),
    );
  return actual;
}

for (const event of MAPPING_EVENTS) {
  for (const destination of event.destinations) {
    test(`${event.entity} ${event.action} through ${destination.label} sends what the demo shows`, async () => {
      // A demo showing no call could hide a destination that failed to init.
      assert.ok(destination.calls.length > 0);
      const actual = await sentBy(destination.id, event, destination.rule);
      assert.deepStrictEqual(
        matchGenerated(destination.calls, actual),
        destination.calls,
      );
    });
  }
}
