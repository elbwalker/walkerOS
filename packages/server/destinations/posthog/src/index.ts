import type { WalkerOS } from '@walkeros/core';
import type { Destination, Env, Settings } from './types';
import { getConfig } from './config';
import { push } from './push';

// Types
export * as DestinationPostHog from './types';

export const destinationPostHog: Destination = {
  type: 'posthog',

  config: {},

  async init({ config: partialConfig, env, logger }) {
    const config = getConfig(partialConfig, env as Env | undefined, logger);
    return config;
  },

  async push(event, context) {
    return await push(event, context);
  },

  async destroy({ config }) {
    const client = (config?.settings as Settings | undefined)?.client;
    if (client) {
      await client.shutdown();
    }
  },

  on(type, context) {
    if (type !== 'consent' || !context?.data) return;

    const settings = (context.config?.settings || {}) as Settings;
    const client = settings.client;
    if (!client) return;

    const consent = context.data as WalkerOS.Consent;
    const required = (context.config as { consent?: WalkerOS.Consent })
      ?.consent;
    if (!required || Object.keys(required).length === 0) return;

    const allGranted = Object.keys(required).every(
      (key) => consent[key] === true,
    );
    if (allGranted) {
      client.enable();
    } else {
      client.disable();
    }
  },
};

export default destinationPostHog;
