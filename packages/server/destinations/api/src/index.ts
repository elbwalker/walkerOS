import type { SendDataValue } from '@walkeros/core';
import type { Settings, Destination, Env } from './types';
import { isDefined, StepError } from '@walkeros/core';
import { sendServer } from '@walkeros/server-core';

// Types
export * as DestinationAPI from './types';

async function send(
  body: SendDataValue,
  settings: Settings,
  env: Env | undefined,
): Promise<void> {
  const { url, headers, method, timeout } = settings;
  const sendServerFn = env?.sendServer || sendServer;

  await sendServerFn(url, body, { headers, method, timeout });
}

function missingUrl(): StepError {
  return new StepError('Config settings url missing', { code: 'config' });
}

export const destinationAPI: Destination = {
  type: 'api',

  config: {},

  env: { sendServer },

  async init({ config }) {
    if (!config.settings?.url) throw missingUrl();
    return config;
  },

  async push(event, { config, rule, data, env, logger }) {
    const { settings } = config;
    const { url, method, transform } = settings || {};

    if (!url) throw missingUrl();

    // A silent rule has no call of its own: nothing to send.
    if (!rule?.silent) {
      const eventData = isDefined(data) ? data : event;
      const body = transform
        ? transform(eventData, config, rule) // Transform event data
        : JSON.stringify(eventData);

      logger?.debug('API destination sending request', {
        url,
        method: method || 'POST',
        eventName: event.name,
      });

      await send(body, { ...settings, url }, env);
    }
  },

  async pushBatch(batch, { config, rule, env, logger }) {
    const { settings } = config;
    const { url, method, transform } = settings || {};

    if (!url) throw missingUrl();

    // Silent rules have no call of their own; with nothing left, send nothing.
    const entries = batch.entries.filter((entry) => !entry.rule?.silent);
    if (entries.length > 0) {
      const items = entries.map((entry) =>
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

      await send(JSON.stringify(payload), { ...settings, url }, env);
    }
  },
};

export default destinationAPI;
