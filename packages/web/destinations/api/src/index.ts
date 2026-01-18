import type { SendDataValue } from '@walkeros/core';
import type { Settings, Destination } from './types';
import { isDefined } from '@walkeros/core';
import { sendWeb } from '@walkeros/web-core';

// Types
export * as DestinationAPI from './types';

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

    const eventData = isDefined(data) ? data : event;
    // Transform returns body directly, otherwise stringify
    const body = transform
      ? transform(eventData, config, rule)
      : JSON.stringify(eventData);

    send(body, settings as Settings, env.sendWeb || sendWeb);
  },

  pushBatch(batch, { config, rule, env }) {
    const settings = config.settings as Settings;
    const { transform } = settings;
    const items = batch.data.length ? batch.data : batch.events;

    // Apply transform to each item if defined, then stringify array
    const payload = transform
      ? items.map((item) => transform(item, config, rule))
      : items;

    send(JSON.stringify(payload), settings, env.sendWeb || sendWeb);
  },
};

export default destinationAPI;
