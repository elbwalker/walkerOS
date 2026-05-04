import type {
  Collector,
  WalkerOS,
  Mapping as WalkerOSMapping,
} from '@walkeros/core';
import { getMappingValue, isObject } from '@walkeros/core';
import { sendServer } from '@walkeros/server-core';
import type {
  CommerceEventData,
  ConsentState,
  CustomEventType,
  Mapping,
  MParticleEvent,
  PushFn,
  Settings,
} from './types';
import {
  buildAuthHeader,
  buildBatch,
  buildCommerceEvent,
  buildCustomEvent,
  buildEndpoint,
  buildScreenViewEvent,
} from './batch';

export const push: PushFn = async function (
  event,
  { config, rule, data, env, logger, collector },
) {
  const settings = config.settings as Settings;
  const {
    apiKey,
    apiSecret,
    pod = 'us1',
    environment = 'production',
    userIdentities: settingsIdentities,
    userAttributes: settingsUserAttributes,
    consent,
    ip: ipSetting,
    sourceRequestId: sourceRequestIdSetting,
  } = settings;

  const ruleSettings: Mapping = (rule?.settings || {}) as Mapping;

  const customAttributes = isObject(data)
    ? (data as Record<string, unknown>)
    : {};

  const userIdentities = await resolveIdentities(
    event,
    settingsIdentities,
    ruleSettings.userIdentities,
    collector,
  );

  const userAttributes = await resolveUserAttributes(
    event,
    settingsUserAttributes,
    ruleSettings.userAttributes,
    collector,
  );

  const ip = ipSetting
    ? toStringValue(await getMappingValue(event, ipSetting, { collector }))
    : undefined;

  const sourceRequestIdRaw = sourceRequestIdSetting
    ? await getMappingValue(event, sourceRequestIdSetting, { collector })
    : undefined;
  const sourceRequestId =
    toStringValue(sourceRequestIdRaw) ?? (event.id || undefined);

  const eventName = rule?.name || event.name;
  const timestamp = event.timestamp || Date.now();
  const sourceMessageId = event.id || undefined;
  const eventType = ruleSettings.eventType || 'custom_event';

  let mpEvent: MParticleEvent;
  if (eventType === 'screen_view') {
    mpEvent = buildScreenViewEvent(
      eventName,
      customAttributes,
      timestamp,
      sourceMessageId,
    );
  } else if (eventType === 'commerce_event') {
    const commerceResolved = ruleSettings.commerce
      ? await getMappingValue(event, ruleSettings.commerce, { collector })
      : undefined;
    const commerceData = isObject(commerceResolved)
      ? (commerceResolved as Partial<CommerceEventData>)
      : undefined;
    mpEvent = buildCommerceEvent(
      commerceData,
      customAttributes,
      timestamp,
      sourceMessageId,
    );
  } else {
    const customEventType: CustomEventType =
      ruleSettings.customEventType || 'other';
    mpEvent = buildCustomEvent(
      eventName,
      customEventType,
      customAttributes,
      timestamp,
      sourceMessageId,
    );
  }

  const batch = buildBatch(
    [mpEvent],
    userIdentities,
    userAttributes,
    environment,
    {
      ip,
      sourceRequestId,
      consent: consent as ConsentState | undefined,
    },
  );

  const endpoint = buildEndpoint(pod);
  const authHeader = buildAuthHeader(apiKey, apiSecret);

  logger.debug('Calling mParticle Events API', {
    endpoint,
    method: 'POST',
    eventType: mpEvent.event_type,
    eventName,
    eventId: event.id,
  });

  const sendServerFn = env?.sendServer || sendServer;
  const result = await sendServerFn(endpoint, JSON.stringify(batch), {
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/json',
    },
  });

  logger.debug('mParticle API response', {
    ok: isObject(result) ? result.ok : true,
  });

  if (isObject(result) && result.ok === false) {
    logger.throw(`mParticle API error: ${JSON.stringify(result)}`);
  }
};

async function resolveIdentities(
  event: WalkerOS.Event,
  settingsIdentities: WalkerOSMapping.Map | undefined,
  ruleIdentities: WalkerOSMapping.Map | undefined,
  collector: Collector.Instance,
): Promise<Record<string, string | number> | undefined> {
  const merged: WalkerOSMapping.Map = {
    ...(isObject(settingsIdentities) ? settingsIdentities : {}),
    ...(isObject(ruleIdentities) ? ruleIdentities : {}),
  };
  const keys = Object.keys(merged);
  if (keys.length === 0) return undefined;

  const out: Record<string, string | number> = {};
  for (const key of keys) {
    const raw = await getMappingValue(event, merged[key], { collector });
    const coerced = toIdentityValue(raw);
    if (coerced !== undefined) out[key] = coerced;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

async function resolveUserAttributes(
  event: WalkerOS.Event,
  settingsAttributes: WalkerOSMapping.Value | undefined,
  ruleAttributes: WalkerOSMapping.Value | undefined,
  collector: Collector.Instance,
): Promise<Record<string, unknown> | undefined> {
  const settingsResolved = settingsAttributes
    ? await getMappingValue(event, settingsAttributes, { collector })
    : undefined;
  const ruleResolved = ruleAttributes
    ? await getMappingValue(event, ruleAttributes, { collector })
    : undefined;

  const merged: Record<string, unknown> = {
    ...(isObject(settingsResolved)
      ? (settingsResolved as Record<string, unknown>)
      : {}),
    ...(isObject(ruleResolved)
      ? (ruleResolved as Record<string, unknown>)
      : {}),
  };
  return Object.keys(merged).length > 0 ? merged : undefined;
}

function toStringValue(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'string') return value || undefined;
  if (typeof value === 'number' || typeof value === 'boolean')
    return String(value);
  return undefined;
}

function toIdentityValue(value: unknown): string | number | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'string') return value || undefined;
  if (typeof value === 'number') return value;
  if (typeof value === 'boolean') return String(value);
  return undefined;
}
