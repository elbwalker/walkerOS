import type {
  CustomData,
  Env,
  PushFn,
  RequestBody,
  Settings,
  SnapchatEvent,
  UserData,
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
    pixelId,
    action_source = 'WEB',
    doNotHash,
    url = 'https://tr.snapchat.com/v3/',
    user_data,
    testMode,
  } = config.settings as Settings;

  const eventData = isObject(data) ? data : {};
  const configData = config.data
    ? await getMappingValue(event, config.data)
    : {};
  const userDataCustom = user_data
    ? await getMappingValue(event, { map: user_data })
    : {};

  // Build user_data from three merge sources (priority: later overrides earlier)
  const eventMappedUserData = isObject(eventData.user_data)
    ? (eventData.user_data as UserData)
    : {};

  const userData: UserData = {
    // Destination config data
    ...(isObject(configData) && isObject(configData.user_data)
      ? (configData.user_data as UserData)
      : {}),
    // Custom user_data from settings
    ...(isObject(userDataCustom) ? (userDataCustom as UserData) : {}),
    // Event mapping data
    ...eventMappedUserData,
  };

  // Hash identity fields
  const hashedUserData = await hashUserData(userData, doNotHash);

  // Build custom_data from mapped event data, excluding the user_data key
  // and any explicit custom_data nesting from the mapping
  const customData: CustomData = {};
  if (isObject(eventData.custom_data)) {
    Object.assign(customData, eventData.custom_data);
  }
  for (const [key, value] of Object.entries(eventData)) {
    if (key === 'user_data' || key === 'custom_data') continue;
    customData[key] = value;
  }

  // Build Snapchat event
  const snapchatEvent: SnapchatEvent = {
    event_name: event.name,
    event_time: Math.round((event.timestamp || Date.now()) / 1000),
    action_source,
    event_id: event.id,
    user_data: hashedUserData,
    custom_data: customData,
  };

  if (action_source === 'WEB' && event.source?.id) {
    snapchatEvent.event_source_url = event.source.id;
  }

  const body: RequestBody = { data: [snapchatEvent] };

  const path = testMode ? 'events/validate' : 'events';
  const endpoint = `${url}${pixelId}/${path}?access_token=${accessToken}`;

  logger.debug('Calling Snapchat Conversions API', {
    endpoint,
    method: 'POST',
    eventName: snapchatEvent.event_name,
    eventId: snapchatEvent.event_id,
  });

  const sendServerFn = (env as Env)?.sendServer || sendServer;
  const result = await sendServerFn(endpoint, JSON.stringify(body));

  logger.debug('Snapchat API response', {
    ok: isObject(result) ? result.ok : true,
  });

  if (isObject(result) && result.ok === false) {
    logger.throw(`Snapchat API error: ${JSON.stringify(result)}`);
  }
};
