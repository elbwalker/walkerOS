import type { WalkerOS } from '@walkeros/core';
import type { Destination, Env } from './types';
import { retryBudget } from '@walkeros/server-core';
import { getConfig } from './config';
import { push, pushBatch, getAmplitude } from './push';
import { AmplitudeTransport } from './transport';

export * as DestinationAmplitude from './types';

/**
 * The SDK's longest total wait before `retries` retries: the first waits
 * `flushIntervalMillis` (here the budget's wait), each later one a second
 * longer than the one before (1 s, 2 s, ...).
 */
function amplitudeWaits(retries: number, wait: number): number {
  return retries && wait + 500 * retries * (retries - 1);
}

export const destinationAmplitude: Destination = {
  type: 'amplitude',

  // Batched by default, at the SDK's own former defaults (200 events, 10 s).
  config: { batch: { size: 200, wait: 10_000 } },

  async init({ config: partialConfig, env }) {
    const config = getConfig(partialConfig);
    const amp = getAmplitude(env);

    // Destructure walkerOS-specific keys; the rest flow through to the SDK.
    const {
      apiKey,
      identify: _identify,
      eventOptions: _eventOptions,
      include: _include,
      ...nodeOptions
    } = config.settings;

    // Each push and each batch flushes the SDK and waits until Amplitude
    // answered its calls. The SDK's own retry ends within config.timeout: a
    // transport whose requests end after a quarter of it, and as many
    // retries as fit with the SDK's waits. A value set in the settings wins.
    const budget = retryBudget(partialConfig.timeout, amplitudeWaits);
    await amp.init(apiKey, {
      transportProvider: new AmplitudeTransport(budget.attempt),
      flushMaxRetries: budget.retries + 1,
      flushIntervalMillis: budget.wait,
      ...nodeOptions,
    }).promise;
    return config;
  },

  push,

  pushBatch,

  on(type, context) {
    if (type !== 'consent' || !context.data) return;
    const amp = getAmplitude(context.env);

    const consent = context.data as WalkerOS.Consent;
    const required = context.config?.consent;
    if (!required || Object.keys(required).length === 0) return;

    const allGranted = Object.keys(required).every(
      (key) => consent[key] === true,
    );
    amp.setOptOut(!allGranted);
  },

  async destroy({ env }) {
    const amp = getAmplitude(env);
    await amp.flush().promise;
  },
};

export default destinationAmplitude;
