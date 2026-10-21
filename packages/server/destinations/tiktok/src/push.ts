import type {
  EventData,
  EventContext,
  PushFn,
  RequestBody,
  Settings,
  UserData,
  Env,
} from './types';
import type { Collector, Mapping as WalkerOSMapping } from '@walkeros/core';
import {
  createMappingRoot,
  getMappingValue,
  isObject,
  StepError,
} from '@walkeros/core';
import { sendServer } from '@walkeros/server-core';
import { hashUserData } from './hash';

// A silent rule has no TikTok call of its own: nothing to send.
export const push: PushFn = async function (event, context) {
  if (!context.rule?.silent) await send(event, context);
};

const send: PushFn = async function (
  event,
  { config, data, ingest, collector, env, logger },
) {
  const {
    accessToken,
    pixelCode,
    doNotHash,
    test_event_code,
    url = 'https://business-api.tiktok.com/open_api/v1.3/event/track/',
    user_data,
    partner_name,
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

  // Build user data from multiple sources
  const userData: UserData = {
    // Destination config data
    ...(isObject(configData) && isObject(configData.user_data)
      ? (configData.user_data as UserData)
      : {}),
    // Custom user_data from settings
    ...(isObject(userDataCustom) ? (userDataCustom as UserData) : {}),
    // Event mapping data
    ...(isObject(eventData.user_data) ? (eventData.user_data as UserData) : {}),
  };

  // Build properties from event data, excluding user_data
  const properties: Record<string, unknown> = {};
  if (isObject(eventData)) {
    for (const [key, value] of Object.entries(eventData)) {
      if (key !== 'user_data') {
        properties[key] = value;
      }
    }
  }

  // Hash identity fields
  const hashedUserData = await hashUserData(userData, doNotHash);

  // Build context
  const context: EventContext = {};

  // Client IP and user agent auto-fill
  const root = createMappingRoot(ingest, event);
  const clientIp = await resolveClient(ip, DEFAULT_IP, root, collector);
  const clientUserAgent = await resolveClient(
    userAgent,
    DEFAULT_USER_AGENT,
    root,
    collector,
  );
  if (clientIp !== undefined) context.ip = clientIp;
  if (clientUserAgent !== undefined) context.user_agent = clientUserAgent;

  // Add user data if non-empty
  if (Object.keys(hashedUserData).length > 0) {
    context.user = hashedUserData;
  }

  // Page context from event source
  context.page = {
    url: event.source?.url,
  };

  // Build event data
  const tiktokEvent: EventData = {
    event: event.name,
    event_id: event.id,
    timestamp: new Date(event.timestamp).toISOString(),
    context,
    properties,
  };

  // Build request body
  const body: RequestBody = {
    pixel_code: pixelCode,
    partner_name,
    data: [tiktokEvent],
  };

  // Test event code
  if (test_event_code) body.test_event_code = test_event_code;

  logger.debug('Calling TikTok Events API', {
    endpoint: url,
    method: 'POST',
    eventName: tiktokEvent.event,
    eventId: tiktokEvent.event_id,
  });

  const sendServerFn = (env as Env)?.sendServer || sendServer;
  const response = await sendServerFn(url, JSON.stringify(body), {
    headers: {
      'Access-Token': accessToken,
      'Content-Type': 'application/json',
    },
  });
  checkResponse(response.data);
};

/**
 * TikTok answers HTTP 200 with a non-zero `code` when it rejects the event
 * (`{ code: 0, message: 'OK' }` on success). A rejection fails the push; the
 * body stays on the error. Rate limiting (40100) and server errors (5xxxx)
 * can pass on a retry, a rejected event cannot.
 */
function checkResponse(data: unknown): void {
  if (!isObject(data) || typeof data.code !== 'number' || data.code === 0)
    return;
  throw new StepError(
    `TikTok Events API rejected the event (code ${data.code})`,
    {
      code: 'transport',
      retryable: data.code === 40100 || data.code >= 50000,
      body: data,
    },
  );
}

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
