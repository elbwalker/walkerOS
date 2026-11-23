import type {
  ConversionEvent,
  EventType,
  PushFn,
  RequestBody,
  TrackingType,
  UserData,
} from './types';
import type { Collector, Mapping as WalkerOSMapping } from '@walkeros/core';
import {
  createMappingRoot,
  getMappingValue,
  isObject,
  isString,
  reportCause,
  StepError,
  stepId,
} from '@walkeros/core';
import { hashUserData, sendServer } from '@walkeros/server-core';
import { normalizers, oneValue } from './hash';

const STANDARD_TRACKING_TYPES: ReadonlySet<TrackingType> =
  new Set<TrackingType>([
    'PageVisit',
    'ViewContent',
    'Search',
    'AddToCart',
    'AddToWishlist',
    'Purchase',
    'Lead',
    'SignUp',
    'Custom',
  ]);

function isStandardTrackingType(name: string): name is TrackingType {
  return STANDARD_TRACKING_TYPES.has(name as TrackingType);
}

function buildEventType(name: string): EventType {
  if (isStandardTrackingType(name) && name !== 'Custom') {
    return { tracking_type: name };
  }
  return { tracking_type: 'Custom', custom_event_name: name };
}

// A silent rule has no reddit call of its own: nothing to send.
export const push: PushFn = async function (event, context) {
  if (!context.rule?.silent) await send(event, context);
};

const send: PushFn = async function (
  event,
  { config, data, ingest, env, logger, collector, id },
) {
  const {
    accessToken,
    pixelId,
    action_source,
    doNotHash,
    test_mode,
    url = 'https://ads-api.reddit.com/api/v2.0/conversions/events/',
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

  // Merge user data from config.data, settings.user_data, and event mapping
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
    ...(clientIp !== undefined ? { ip_address: clientIp } : {}),
    ...(clientUserAgent !== undefined ? { user_agent: clientUserAgent } : {}),
    ...(isObject(configData) && isObject(configData.user)
      ? configData.user
      : {}),
    ...(isObject(userDataCustom) ? userDataCustom : {}),
    ...(isObject(eventData.user) ? eventData.user : {}),
  };

  const { userData: user, dropped } = await hashUserData(
    userData,
    normalizers,
    doNotHash,
    oneValue,
  );
  if (dropped.length)
    reportCause(
      collector,
      logger,
      { step: stepId('destination', id), code: 'mapping' },
      `Reddit user ${dropped.join(', ')} left out: Reddit takes one value, not a list`,
      { event: event.name },
    );

  const {
    user: _u,
    event_metadata: eventMetadata,
    click_id: eventClickId,
    ...restEventData
  } = eventData;

  const timestampMs = event.timestamp || Date.now();

  const serverEvent: ConversionEvent = {
    event_at: new Date(timestampMs).toISOString(),
    event_at_ms: timestampMs,
    event_type: buildEventType(event.name),
    ...(action_source ? { action_source } : {}),
    ...restEventData,
    user,
  };

  // Merge event_metadata with auto-populated conversion_id (event.id for dedup)
  const metadataFromMapping = isObject(eventMetadata) ? eventMetadata : {};
  serverEvent.event_metadata = {
    conversion_id: event.id,
    ...metadataFromMapping,
  };

  if (typeof eventClickId === 'string') {
    serverEvent.click_id = eventClickId;
  }

  const body: RequestBody = {
    ...(test_mode ? { test_mode: true } : {}),
    events: [serverEvent],
  };

  const endpoint = `${url}${pixelId}`;

  logger.debug('Calling Reddit API', {
    endpoint,
    method: 'POST',
    trackingType: serverEvent.event_type.tracking_type,
    eventId: serverEvent.event_metadata?.conversion_id,
  });

  const sendServerFn = env?.sendServer || sendServer;
  const response = await sendServerFn(endpoint, JSON.stringify(body), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  checkResponse(response.data, body.events.length);
};

/** The count in Reddit's 200 answer, in test mode the events validated. */
const CONFIRMED =
  /^(?:Successfully processed|In test mode\.) (\d+) conversion events\b/;

/**
 * Reddit answers HTTP 200 with a message that counts the events it processed
 * ("Successfully processed 1 conversion events."), in test mode the events it
 * validated. A message that does not count every event sent fails the push,
 * not retryable; the body stays on the error.
 */
function checkResponse(data: unknown, sent: number): void {
  if (!isObject(data) || !isString(data.message)) return;
  const confirmed = CONFIRMED.exec(data.message);
  if (confirmed && Number(confirmed[1]) >= sent) return;
  throw new StepError('Reddit Conversions API did not process the event', {
    code: 'transport',
    retryable: false,
    body: data,
  });
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
