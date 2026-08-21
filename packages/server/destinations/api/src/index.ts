import type { Logger, SendDataValue } from '@walkeros/core';
import type { Settings, Destination, Env } from './types';
import { isDefined } from '@walkeros/core';
import { sendServer } from '@walkeros/server-core';

// Types
export * as DestinationAPI from './types';

async function send(
  body: SendDataValue,
  settings: Settings,
  env: Env | undefined,
  logger?: Logger.Instance,
): Promise<void> {
  const { url, headers, method, timeout } = settings;
  const sendServerFn = env?.sendServer || sendServer;

  const response = await sendServerFn(url, body, { headers, method, timeout });

  logger?.debug('API destination response', { ok: response?.ok });
}

export const destinationAPI: Destination = {
  type: 'api',

  config: {},

  env: { sendServer },

  async push(event, { config, rule, data, env, logger }) {
    const { settings } = config;
    const { url, method, transform } = settings || {};

    if (!url) return;

    const eventData = isDefined(data) ? data : event;
    const body = transform
      ? transform(eventData, config, rule) // Transform event data
      : JSON.stringify(eventData);

    logger?.debug('API destination sending request', {
      url,
      method: method || 'POST',
      eventName: event.name,
    });

    await send(body, { ...settings, url }, env, logger);
  },

  async pushBatch(batch, { config, rule, env, logger }) {
    const { settings } = config;
    const { url, method, transform } = settings || {};

    if (!url) return;

    const items = batch.entries.map((entry) =>
      isDefined(entry.data) ? entry.data : entry.event,
    );

    // Transform applies per item; the request body is the array of results
    const payload = transform
      ? items.map((item) => transform(item, config, rule))
      : items;

    logger?.debug('API destination sending batch', {
      url,
      method: method || 'POST',
      events: items.length,
    });

    await send(JSON.stringify(payload), { ...settings, url }, env, logger);
  },
};

export default destinationAPI;
