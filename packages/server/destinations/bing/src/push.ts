import type {
  CAPIEvent,
  CAPIRequestBody,
  CustomData,
  Env,
  EventType,
  PushFn,
  Settings,
  UserData,
} from './types';
import type { Collector, Mapping as WalkerOSMapping } from '@walkeros/core';
import { createMappingRoot, getMappingValue, isObject } from '@walkeros/core';
import { sendServer } from '@walkeros/server-core';
import { hashUserData } from './hash';

export const push: PushFn = async function (
  event,
  { config, rule, data, ingest, env, logger, collector },
) {
  const {
    accessToken,
    tagId,
    url = 'https://capi.uet.microsoft.com/v1/',
    doNotHash,
    user_data,
    dataProvider = 'walkerOS',
    continueOnValidationError,
    ip,
    userAgent,
  } = config.settings as Settings;

  const eventData = isObject(data) ? data : {};
  const configData = config.data
    ? await getMappingValue(event, config.data, { collector })
    : {};
  const userDataCustom = user_data
    ? await getMappingValue(event, { map: user_data }, { collector })
    : {};

  // Resolve mapping-level eventType override (rule.settings.eventType)
  const ruleSettings = rule?.settings as { eventType?: EventType } | undefined;
  const eventType: EventType =
    ruleSettings?.eventType === 'pageLoad' ? 'pageLoad' : 'custom';

  // Build user_data from merge sources (priority: later overrides earlier)
  const eventMappedUserData = isObject(eventData.userData)
    ? (eventData.userData as UserData)
    : {};

  // Client IP and user agent auto-fill, overridden by any mapped value
  const root = createMappingRoot(ingest, event);
  const clientIp = await resolveClient(ip, DEFAULT_IP, root, collector);
  const clientUserAgent = await resolveClient(
    userAgent,
    DEFAULT_USER_AGENT,
    root,
    collector,
  );

  const userData: UserData = {
    ...(clientIp !== undefined ? { clientIpAddress: clientIp } : {}),
    ...(clientUserAgent !== undefined
      ? { clientUserAgent: clientUserAgent }
      : {}),
    ...(isObject(configData) && isObject(configData.userData)
      ? (configData.userData as UserData)
      : {}),
    ...(isObject(userDataCustom) ? (userDataCustom as UserData) : {}),
    ...eventMappedUserData,
  };

  // Hash identity fields (em, ph only; with Microsoft email normalization)
  const hashedUserData = await hashUserData(userData, doNotHash);

  // Build customData from mapped event data
  const customData: CustomData = {};
  if (isObject(eventData.customData)) {
    Object.assign(customData, eventData.customData);
  }
  for (const [key, value] of Object.entries(eventData)) {
    if (key === 'userData' || key === 'customData') continue;
    customData[key] = value;
  }

  // Build Bing CAPI event
  const capiEvent: CAPIEvent = {
    eventType,
    eventId: event.id,
    eventTime: Math.round((event.timestamp || Date.now()) / 1000),
    adStorageConsent: 'G',
    userData: hashedUserData,
  };

  if (eventType === 'custom') {
    capiEvent.eventName = rule?.name || event.name;
  }

  if (event.source?.url) {
    capiEvent.eventSourceUrl = event.source.url;
  }

  if (Object.keys(customData).length > 0) {
    capiEvent.customData = customData;
  }

  const body: CAPIRequestBody = {
    data: [capiEvent],
    dataProvider,
  };

  if (continueOnValidationError !== undefined) {
    body.continueOnValidationError = continueOnValidationError;
  }

  const endpoint = `${url}${tagId}/events`;

  logger.debug('Calling Bing UET CAPI', {
    endpoint,
    method: 'POST',
    eventType: capiEvent.eventType,
    eventName: capiEvent.eventName,
    eventId: capiEvent.eventId,
  });

  const sendServerFn = (env as Env)?.sendServer || sendServer;
  const result = await sendServerFn(endpoint, JSON.stringify(body), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  logger.debug('Bing UET CAPI response', {
    ok: isObject(result) ? result.ok : true,
  });

  if (isObject(result) && result.ok === false) {
    logger.throw(`Bing UET CAPI error: ${JSON.stringify(result)}`);
  }
};

const DEFAULT_IP: WalkerOSMapping.Value = ['ingest.ip', 'event.user.ip'];
const DEFAULT_USER_AGENT: WalkerOSMapping.Value = [
  'ingest.userAgent',
  'event.user.userAgent',
];

/** A client IP or user agent setting resolved to a non-empty string. */
async function resolveClient(
  setting: WalkerOSMapping.Value | false | undefined,
  fallback: WalkerOSMapping.Value,
  root: WalkerOSMapping.Root,
  collector: Collector.Instance,
): Promise<string | undefined> {
  if (setting === false) return undefined;
  const value = await getMappingValue(root, setting ?? fallback, { collector });
  return typeof value === 'string' && value !== '' ? value : undefined;
}
