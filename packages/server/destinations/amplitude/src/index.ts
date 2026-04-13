import type { WalkerOS } from '@walkeros/core';
import type { Destination, Env } from './types';
import { getConfig } from './config';
import { push, getAmplitude } from './push';

export * as DestinationAmplitude from './types';

export const destinationAmplitude: Destination = {
  type: 'amplitude',

  config: {},

  async init({ config: partialConfig, env, logger }) {
    const config = getConfig(partialConfig, logger);
    const amp = getAmplitude(env as Record<string, unknown> | undefined);

    // Destructure walkerOS-specific keys; the rest flow through to the SDK.
    const {
      apiKey,
      identify: _identify,
      eventOptions: _eventOptions,
      include: _include,
      ...nodeOptions
    } = config.settings;

    await amp.init(apiKey, nodeOptions).promise;
    return config;
  },

  async push(event, context) {
    return await push(event, context);
  },

  on(type, context) {
    if (type !== 'consent' || !context.data) return;
    const amp = getAmplitude(
      context.env as Record<string, unknown> | undefined,
    );

    const consent = context.data as WalkerOS.Consent;
    const required = context.config?.consent;
    if (!required || Object.keys(required).length === 0) return;

    const allGranted = Object.keys(required).every(
      (key) => consent[key] === true,
    );
    amp.setOptOut(!allGranted);
  },

  async destroy({ env }) {
    const amp = getAmplitude(env as Record<string, unknown> | undefined);
    await amp.flush().promise;
  },
};

export default destinationAmplitude;
