import type { WalkerOS } from '@walkeros/core';
import {
  getMappingValue,
  isNumber,
  isObject,
  isString,
  StepError,
} from '@walkeros/core';
import * as optimizelySDK from '@optimizely/optimizely-sdk';
import type {
  Destination,
  Env,
  OptimizelySDK as OptimizelySDKType,
  RuntimeState,
  Settings,
} from './types';

// Types export
export * as DestinationOptimizely from './types';

/**
 * Resolve the Optimizely SDK: use the caller-provided mock when available
 * (tests), otherwise fall back to the real @optimizely/optimizely-sdk.
 */
function getOptimizely(env: Env | undefined): OptimizelySDKType {
  if (env?.optimizely) return env.optimizely;
  return optimizelySDK as unknown as OptimizelySDKType;
}

/** Runs one Optimizely call; a throw or a rejection becomes a StepError of `code`. */
async function call<T>(
  fn: () => T | Promise<T>,
  code: string,
  message: string,
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    throw new StepError(message, { code, cause: error });
  }
}

export const destinationOptimizely: Destination = {
  type: 'optimizely',

  config: {},

  async init({ config, env }) {
    const settings = config.settings;
    if (!settings?.sdkKey)
      throw new StepError('Optimizely needs settings.sdkKey', {
        code: 'config',
      });

    const sdk = getOptimizely(env as Env | undefined);

    const { sdkKey } = settings;
    const configManager = await call(
      () =>
        sdk.createPollingProjectConfigManager({
          sdkKey,
          autoUpdate: settings.autoUpdate ?? true,
          updateInterval: settings.updateInterval ?? 60000,
        }),
      'vendor-not-ready',
      'Optimizely config manager failed to start',
    );

    const eventProcessor = await call(
      () =>
        sdk.createBatchEventProcessor({
          batchSize: settings.batchSize ?? 10,
          flushInterval: settings.flushInterval ?? 1000,
        }),
      'vendor-not-ready',
      'Optimizely event processor failed to start',
    );

    const instanceConfig: Record<string, unknown> = {
      projectConfigManager: configManager,
      eventProcessor: eventProcessor,
    };

    const client = await call(
      () => sdk.createInstance(instanceConfig),
      'vendor-not-ready',
      'Optimizely client failed to start',
    );
    const ready = await call(
      () => client.onReady(),
      'vendor-not-ready',
      'Optimizely client did not become ready',
    );
    if (isObject(ready) && ready.success === false)
      throw new StepError('Optimizely client did not become ready', {
        code: 'vendor-not-ready',
      });

    const _state: RuntimeState = { client };

    return { ...config, settings: { ...settings, _state } };
  },

  async push(event, { config, rule, env, collector }) {
    const settings = (config.settings || {}) as Settings;
    const state: RuntimeState = settings._state || {};
    const mappingSettings = rule?.settings || {};

    const { client } = state;
    if (!client)
      throw new StepError('Optimizely client is not running', {
        code: 'not-ready',
      });

    // 1. Resolve userId
    const userIdMapping = settings.userId;
    let userId: string | undefined;
    if (userIdMapping !== undefined) {
      const resolved = await getMappingValue(event, userIdMapping, {
        collector,
      });
      if (isString(resolved)) userId = resolved;
    }

    // Fallback: no userId means we cannot create a user context
    if (!userId)
      throw new StepError(
        'Optimizely needs a userId, settings.userId resolved to nothing',
        {
          code: 'missing-input',
        },
      );

    // 2. Resolve destination-level attributes
    let baseAttributes: Record<string, unknown> | undefined;
    if (settings.attributes !== undefined) {
      const resolved = await getMappingValue(event, settings.attributes, {
        collector,
      });
      if (isObject(resolved)) {
        baseAttributes = resolved as Record<string, unknown>;
      }
    }

    // 3. Create or reuse user context
    if (userId !== state.lastUserId || !state.userContext) {
      const userContext = await call(
        () => client.createUserContext(userId, baseAttributes),
        'transport',
        'Optimizely createUserContext failed',
      );
      if (!userContext)
        throw new StepError('Optimizely could not create a user context', {
          code: 'transport',
        });
      state.userContext = userContext;
      state.lastUserId = userId;
    }

    const userContext = state.userContext;
    if (!userContext)
      throw new StepError('Optimizely has no user context', {
        code: 'not-ready',
      });

    // 4. Per-event attributes via setAttribute
    if (mappingSettings.attributes !== undefined) {
      const resolved = await getMappingValue(
        event,
        mappingSettings.attributes,
        { collector },
      );
      if (isObject(resolved)) {
        for (const [key, value] of Object.entries(
          resolved as Record<string, unknown>,
        )) {
          await call(
            () => userContext.setAttribute(key, value),
            'transport',
            'Optimizely setAttribute failed',
          );
        }
      }
    }

    // 5. Track event (unless silent: true)
    if (rule?.silent !== true) {
      const eventKey = isString(rule?.name) ? rule.name : event.name;

      // Build eventTags
      const eventTags: Record<string, unknown> = {};

      // Resolve eventTags mapping first (so revenue/value can override)
      if (mappingSettings.eventTags !== undefined) {
        const resolved = await getMappingValue(
          event,
          mappingSettings.eventTags,
          { collector },
        );
        if (isObject(resolved)) {
          Object.assign(eventTags, resolved);
        }
      }

      // Revenue (integer, cents)
      if (mappingSettings.revenue !== undefined) {
        const resolved = await getMappingValue(event, mappingSettings.revenue, {
          collector,
        });
        if (isNumber(resolved)) {
          eventTags.revenue = resolved;
        }
      }

      // Value (float)
      if (mappingSettings.value !== undefined) {
        const resolved = await getMappingValue(event, mappingSettings.value, {
          collector,
        });
        if (isNumber(resolved)) {
          eventTags.value = resolved;
        }
      }

      await call(
        () => userContext.trackEvent(eventKey, eventTags),
        'transport',
        'Optimizely trackEvent failed',
      );
    }

    // Persist state mutations
    settings._state = state;
  },

  async on(type, context) {
    if (type !== 'consent' || !context.data) return;

    const required = context.config?.consent;
    if (!required || Object.keys(required).length === 0) return;

    const consent = context.data as WalkerOS.Consent;
    const allGranted = Object.keys(required).every(
      (key) => consent[key] === true,
    );

    const state = (context.config?.settings as Settings)?._state;
    if (!allGranted && state?.client) {
      const { client } = state;
      state.client = undefined;
      state.userContext = undefined;
      await call(
        () => client.close(),
        'consent-not-applied',
        'Optimizely did not stop on the consent revocation',
      );
    }
  },

  destroy({ config }) {
    const settings = (config?.settings || {}) as Settings;
    const state = settings._state;
    if (state?.client) {
      state.client.close();
      state.client = undefined;
      state.userContext = undefined;
    }
  },
};

export default destinationOptimizely;
