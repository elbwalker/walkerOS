import type {
  EventData,
  EventContext,
  PushFn,
  RequestBody,
  UserData,
  Env,
} from './types';
import { getMappingValue, isObject } from '@walkeros/core';
import { sendServer } from '@walkeros/server-core';
import { hashUserData } from './hash';

export const push: PushFn = async function (
  event,
  { config, rule, data, collector, env, logger },
) {
  const {
    accessToken,
    pixelCode,
    doNotHash,
    test_event_code,
    url = 'https://business-api.tiktok.com/open_api/v1.3/event/track/',
    user_data,
    partner_name,
  } = config.settings as import('./types').Settings;

  const eventData = isObject(data) ? data : {};
  const configData = config.data
    ? await getMappingValue(event, config.data)
    : {};
  const userDataCustom = user_data
    ? await getMappingValue(event, { map: user_data })
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

  // Add user data if non-empty
  if (Object.keys(hashedUserData).length > 0) {
    context.user = hashedUserData;
  }

  // Page context from event source
  context.page = {
    url: event.source.id,
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
  const result = await sendServerFn(url, JSON.stringify(body), {
    headers: {
      'Access-Token': accessToken,
      'Content-Type': 'application/json',
    },
  });

  logger.debug('TikTok API response', {
    ok: isObject(result) ? result.ok : true,
  });

  if (isObject(result) && result.ok === false) {
    logger.throw(`TikTok API error: ${JSON.stringify(result)}`);
  }
};
