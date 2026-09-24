import type {
  BodyParameters,
  CustomerInformationParameters,
  PushFn,
  ServerEventParameters,
  Env,
} from './types';
import type { Collector, Mapping as WalkerOSMapping } from '@walkeros/core';
import { createMappingRoot, getMappingValue, isObject } from '@walkeros/core';
import { sendServer } from '@walkeros/server-core';
import { hashEvent } from './hash';
import { getUnknownUserDataKeys } from './userData';

export const push: PushFn = async function (
  event,
  { config, rule, data, ingest, collector, env, logger },
) {
  const {
    accessToken,
    pixelId,
    action_source = 'website',
    doNotHash,
    test_event_code,
    url = 'https://graph.facebook.com/v22.0/',
    user_data,
    ip,
    userAgent,
  } = config.settings!;

  const eventData = isObject(data) ? data : {};
  const configData = config.data
    ? await getMappingValue(event, config.data, { collector })
    : {};
  const userDataCustom = user_data
    ? await getMappingValue(event, { map: user_data }, { collector })
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

  const mappedUserData = {
    ...(clientIp !== undefined ? { client_ip_address: clientIp } : {}),
    ...(clientUserAgent !== undefined
      ? { client_user_agent: clientUserAgent }
      : {}),
    // Destination config
    ...(isObject(configData) && isObject(configData.user_data)
      ? configData.user_data
      : {}),
    // Custom user_data
    ...(isObject(userDataCustom) ? userDataCustom : {}),
    // Event mapping
    ...(isObject(eventData.user_data) ? eventData.user_data : {}),
  };

  // Unknown keys are never hashed, so drop them instead of sending cleartext
  const unknownKeys = getUnknownUserDataKeys(mappedUserData);
  if (unknownKeys.length)
    logger.warn(
      'Unknown Meta user_data keys dropped, use parameter names such as em and ph',
      { keys: unknownKeys },
    );

  const userData: CustomerInformationParameters = Object.fromEntries(
    Object.entries(mappedUserData).filter(
      ([key]) => !unknownKeys.includes(key),
    ),
  );

  if (userData.fbclid) {
    userData.fbc = formatClickId(
      userData.fbclid,
      collector?.session?.start || event.timestamp,
    );
    delete userData.fbclid;
  }
  const serverEvent: ServerEventParameters = {
    event_name: event.name,
    event_id: event.id,
    event_time: Math.round((event.timestamp || Date.now()) / 1000),
    action_source,
    ...eventData,
    user_data: userData,
  };

  if (action_source === 'website' && event.source?.url)
    serverEvent.event_source_url = event.source.url;

  const hashedServerEvent = await hashEvent(serverEvent, doNotHash, logger);

  const body: BodyParameters = { data: [hashedServerEvent] };

  // Test event code
  if (test_event_code) body.test_event_code = test_event_code;

  const endpoint = `${url.replace(/\/+$/, '')}/${pixelId}/events`;
  logger.debug('Calling Meta API', {
    endpoint,
    method: 'POST',
    eventName: serverEvent.event_name,
    eventId: serverEvent.event_id,
  });

  const sendServerFn = env?.sendServer || sendServer;
  const result = await sendServerFn(endpoint, JSON.stringify(body), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  logger.debug('Meta API response', {
    ok: isObject(result) ? result.ok : true,
  });

  if (isObject(result) && result.ok === false) {
    logger.throw(`Meta API error: ${JSON.stringify(result)}`);
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

function formatClickId(clickId: unknown, time?: number): string | undefined {
  // https://developers.facebook.com/docs/marketing-api/conversions-api/parameters/fbp-and-fbc#2--format-clickid

  if (!clickId) return;

  // Version is always "fb"
  const version = 'fb';

  // Subdomain ('com' = 0, 'example.com' = 1, 'www.example.com' = 2)
  const subdomainIndex = '1';

  // Get the current timestamp in milliseconds (or when the fbclid was observed)
  const creationTime = time || Date.now();

  return `${version}.${subdomainIndex}.${creationTime}.${clickId}`;
}
