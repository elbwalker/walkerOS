import type {
  PushFn,
  Settings,
  RuntimeState,
  HubSpotClientMock,
  HubSpotEventRequest,
} from './types';
import type { Logger } from '@walkeros/core';
import { getMappingValue, isObject, isString } from '@walkeros/core';

export const push: PushFn = async function (
  event,
  { config, rule, collector, env, logger },
) {
  const settings = config.settings as Settings;
  const envClient = (env as { client?: HubSpotClientMock } | undefined)?.client;
  const sdk = envClient || settings._client;

  if (!sdk) {
    logger.warn('HubSpot client not initialized');
    return;
  }

  const state: RuntimeState = settings._state || {};
  const mappingSettings = rule?.settings || {};

  // 1. Resolve identity from event
  const email = settings.email
    ? resolveString(await getMappingValue(event, settings.email, { collector }))
    : undefined;
  const objectId = settings.objectId
    ? resolveString(
        await getMappingValue(event, settings.objectId, { collector }),
      )
    : undefined;

  if (!email && !objectId) {
    logger.warn('HubSpot requires email or objectId; skipping event', {
      event: event.name,
    });
    return;
  }

  // 2. Contact upsert -- rule-level overrides destination-level
  const identifyMapping = mappingSettings.identify ?? settings.identify;
  if (identifyMapping !== undefined) {
    const resolved = await getMappingValue(event, identifyMapping, {
      collector,
    });
    if (isObject(resolved)) {
      await applyIdentify(
        sdk,
        resolved as Record<string, unknown>,
        state,
        logger,
      );
    }
  }

  // 3. Send event (unless silent: true)
  if (rule?.silent !== true) {
    const eventName = buildEventName(
      settings.eventNamePrefix,
      mappingSettings.eventName,
      isString(rule?.name) ? rule.name : event.name,
    );

    // Build properties: defaultProperties + mapped properties, all strings
    let properties: Record<string, string> = {
      ...(settings.defaultProperties || {}),
    };

    if (mappingSettings.properties !== undefined) {
      const resolved = await getMappingValue(
        event,
        mappingSettings.properties,
        { collector },
      );
      if (isObject(resolved)) {
        properties = {
          ...properties,
          ...toStringProperties(resolved as Record<string, unknown>),
        };
      }
    }

    const occurredAt = new Date(event.timestamp || Date.now());

    const eventRequest: HubSpotEventRequest = {
      eventName,
      occurredAt,
      properties,
    };

    // Attach identity
    if (email) eventRequest.email = email;
    if (objectId) eventRequest.objectId = objectId;

    if (settings.batch) {
      // Queue for batch flush
      if (!settings._eventQueue) settings._eventQueue = [];
      settings._eventQueue.push(eventRequest);

      if (settings._eventQueue.length >= (settings.batchSize || 50)) {
        await flushBatch(sdk, settings);
      }
    } else {
      await sdk.events.send.basicApi.send(eventRequest);
    }
  }

  settings._state = state;
};

function resolveString(value: unknown): string | undefined {
  if (isString(value) && value.length > 0) return value;
  return undefined;
}

function buildEventName(
  prefix: string,
  override: string | undefined,
  eventName: string,
): string {
  const name = override || eventName.toLowerCase().replace(/\s+/g, '_');
  return `${prefix}${name}`;
}

/**
 * Serialize all values to strings per HubSpot's API contract.
 */
export function toStringProperties(
  data: Record<string, unknown>,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined && value !== null) {
      result[key] = String(value);
    }
  }
  return result;
}

function hashProperties(
  properties: Record<string, string> | undefined,
): string {
  if (!properties) return '';
  try {
    return JSON.stringify(properties);
  } catch {
    return '';
  }
}

async function applyIdentify(
  sdk: HubSpotClientMock,
  resolved: Record<string, unknown>,
  state: RuntimeState,
  logger: Logger.Instance,
): Promise<void> {
  const identifyEmail = isString(resolved.email) ? resolved.email : undefined;
  if (!identifyEmail) {
    logger.warn('HubSpot identify requires email; skipping contact upsert');
    return;
  }

  const rawProperties = isObject(resolved.properties)
    ? toStringProperties(resolved.properties as Record<string, unknown>)
    : undefined;

  const propertiesHash = hashProperties(rawProperties);
  const last = state.lastIdentity || {};

  const emailChanged = identifyEmail !== last.email;
  const propertiesChanged = propertiesHash !== (last.propertiesHash ?? '');

  if (!emailChanged && !propertiesChanged) return;

  if (rawProperties) {
    await sdk.crm.contacts.basicApi.update(
      identifyEmail,
      { properties: rawProperties },
      'email',
    );
  }

  state.lastIdentity = {
    email: identifyEmail,
    propertiesHash,
  };
}

export async function flushBatch(
  sdk: HubSpotClientMock,
  settings: Settings,
): Promise<void> {
  const queue = settings._eventQueue;
  if (!queue || queue.length === 0) return;

  // Flush in chunks of batchSize (max 500)
  const batchSize = Math.min(settings.batchSize || 50, 500);
  while (queue.length > 0) {
    const batch = queue.splice(0, batchSize);
    await sdk.events.send.batchApi.send({ inputs: batch });
  }
}
