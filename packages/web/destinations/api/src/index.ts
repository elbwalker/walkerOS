import type { SendDataValue, SendHeaders, WalkerOS } from '@walkeros/core';
import type { Settings, Destination } from './types';
import { isDefined } from '@walkeros/core';
import { sendWeb } from '@walkeros/web-core';

// Types
export * as DestinationAPI from './types';

/**
 * Adds a W3C `traceparent` header built from the event's trace id and span id
 * so the receiving collector can stitch the span across the wire. Emission is
 * best-effort and unconditional on presence: values are passed through verbatim
 * (a malformed id yields a header the strict server-side parser rejects, which
 * is intended). A user-configured `traceparent` always wins; header names are
 * case-insensitive on the wire, so the check matches any casing.
 */
function withTraceparent(
  event: WalkerOS.Event,
  headers?: SendHeaders,
): SendHeaders | undefined {
  const trace = event.source?.trace;
  const { id } = event;
  const userSet =
    headers &&
    Object.keys(headers).some((key) => key.toLowerCase() === 'traceparent');
  if (!trace || !id || userSet) return headers;

  return { ...headers, traceparent: `00-${trace}-${id}-01` };
}

function send(
  body: SendDataValue,
  settings: Settings,
  sendWebFn: typeof sendWeb,
): void {
  const { url, headers, method, transport = 'fetch' } = settings;
  sendWebFn(url, body, { headers, method, transport });
}

export const destinationAPI: Destination = {
  type: 'api',

  config: {},

  init({ config, logger }) {
    const { url } = config.settings || {};
    if (!url) logger.throw('Config settings url missing');
  },

  push(event, { config, rule, data, env, logger }) {
    const { settings } = config;
    const { url, transform } = settings || {};

    if (!url) {
      logger.throw('Config settings url missing');
      return;
    }

    const eventData = isDefined(data) ? data : event;
    // Transform returns body directly, otherwise stringify
    const body = transform
      ? transform(eventData, config, rule)
      : JSON.stringify(eventData);

    const headers = withTraceparent(event, settings?.headers);

    send(body, { ...settings, url, headers }, env.sendWeb || sendWeb);
  },

  pushBatch(batch, { config, rule, env, logger }) {
    const { settings } = config;
    const { url, transform } = settings || {};

    if (!url) {
      logger.throw('Config settings url missing');
      return;
    }

    const items = batch.entries.map((e) =>
      isDefined(e.data) ? e.data : e.event,
    );

    // Apply transform to each item if defined, then stringify array
    const payload = transform
      ? items.map((item) => transform(item, config, rule))
      : items;

    // No traceparent here: a batch may aggregate events from distinct
    // upstream traces, so there is no single identity to stamp. Per-event
    // correlation is emitted on the non-batched push path only.
    send(JSON.stringify(payload), { ...settings, url }, env.sendWeb || sendWeb);
  },
};

export default destinationAPI;
