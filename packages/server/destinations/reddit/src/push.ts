import type {
  ConversionEvent,
  EventType,
  PushFn,
  RequestBody,
  TrackingType,
  UserData,
} from './types';
import { getMappingValue, isObject } from '@walkeros/core';
import { sendServer } from '@walkeros/server-core';
import { hashEvent } from './hash';

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

export const push: PushFn = async function (
  event,
  { config, data, env, logger, collector },
) {
  const {
    accessToken,
    pixelId,
    action_source: _action_source,
    doNotHash,
    test_mode,
    url = 'https://ads-api.reddit.com/api/v2.0/conversions/events/',
    user_data,
  } = config.settings!;

  const eventData = isObject(data) ? data : {};
  const configData = config.data
    ? await getMappingValue(event, config.data, { collector })
    : {};
  const userDataCustom = user_data
    ? await getMappingValue(event, { map: user_data }, { collector })
    : {};

  // Merge user data from config.data, settings.user_data, and event mapping
  const userData: UserData = {
    ...(isObject(configData) && isObject(configData.user)
      ? configData.user
      : {}),
    ...(isObject(userDataCustom) ? userDataCustom : {}),
    ...(isObject(eventData.user) ? eventData.user : {}),
  };

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
    ...restEventData,
    user: userData,
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

  const hashedServerEvent = await hashEvent(serverEvent, doNotHash);

  const body: RequestBody = {
    ...(test_mode ? { test_mode: true } : {}),
    data: { events: [hashedServerEvent] },
  };

  const endpoint = `${url}${pixelId}`;

  logger.debug('Calling Reddit API', {
    endpoint,
    method: 'POST',
    trackingType: serverEvent.event_type.tracking_type,
    eventId: serverEvent.event_metadata?.conversion_id,
  });

  const sendServerFn = env?.sendServer || sendServer;
  const result = await sendServerFn(endpoint, JSON.stringify(body), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  logger.debug('Reddit API response', {
    ok: isObject(result) ? result.ok : true,
  });

  if (isObject(result) && result.ok === false) {
    logger.throw(`Reddit API error: ${JSON.stringify(result)}`);
  }
};
