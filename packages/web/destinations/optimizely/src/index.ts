import type { WalkerOS } from '@walkeros/core';
import { getMappingValue, isNumber, isObject, isString } from '@walkeros/core';
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

export const destinationOptimizely: Destination = {
  type: 'optimizely',

  config: {},

  async init({ config, env }) {
    const settings = config.settings;
    if (!settings?.sdkKey) return false;

    const sdk = getOptimizely(env as Env | undefined);

    const configManager = sdk.createPollingProjectConfigManager({
      sdkKey: settings.sdkKey,
      autoUpdate: settings.autoUpdate ?? true,
      updateInterval: settings.updateInterval ?? 60000,
    });

    const eventProcessor = sdk.createBatchEventProcessor({
      batchSize: settings.batchSize ?? 10,
      flushInterval: settings.flushInterval ?? 1000,
    });

    const instanceConfig: Record<string, unknown> = {
      projectConfigManager: configManager,
      eventProcessor: eventProcessor,
    };

    const client = sdk.createInstance(instanceConfig);
    await client.onReady();

    const _state: RuntimeState = { client };

    return { ...config, settings: { ...settings, _state } };
  },

  async push(event, { config, rule, env, collector }) {
    const settings = (config.settings || {}) as Settings;
    const state: RuntimeState = settings._state || {};
    const mappingSettings = rule?.settings || {};

    if (!state.client) return;

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
    if (!userId) return;

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
      const userContext = state.client.createUserContext(
        userId,
        baseAttributes,
      );
      if (!userContext) return;
      state.userContext = userContext;
      state.lastUserId = userId;
    }

    const userContext = state.userContext;
    if (!userContext) return;

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
          userContext.setAttribute(key, value);
        }
      }
    }

    // 5. Track event (unless skip: true)
    if (rule?.skip !== true) {
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

      userContext.trackEvent(eventKey, eventTags);
    }

    // Persist state mutations
    settings._state = state;
  },

  on(type, context) {
    if (type !== 'consent' || !context.data) return;

    const required = context.config?.consent;
    if (!required || Object.keys(required).length === 0) return;

    const consent = context.data as WalkerOS.Consent;
    const allGranted = Object.keys(required).every(
      (key) => consent[key] === true,
    );

    const state = (context.config?.settings as Settings)?._state;
    if (!allGranted && state?.client) {
      state.client.close();
      state.client = undefined;
      state.userContext = undefined;
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
