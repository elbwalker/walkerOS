import type { ConversionEvent, PushFn, RequestBody, UserData } from './types';
import { getMappingValue, isObject } from '@walkeros/core';
import { sendServer } from '@walkeros/server-core';
import { hashEvent } from './hash';

export const push: PushFn = async function (
  event,
  { config, data, env, logger },
) {
  const {
    accessToken,
    adAccountId,
    action_source = 'web',
    doNotHash,
    test,
    url = 'https://api.pinterest.com/v5/',
    user_data,
    partner_name,
  } = config.settings!;

  const eventData = isObject(data) ? data : {};
  const configData = config.data
    ? await getMappingValue(event, config.data)
    : {};
  const userDataCustom = user_data
    ? await getMappingValue(event, { map: user_data })
    : {};

  // Merge user_data from config.data, settings.user_data, and event mapping
  const userData: UserData = {
    // Destination config
    ...(isObject(configData) && isObject(configData.user_data)
      ? configData.user_data
      : {}),
    // Custom user_data from settings
    ...(isObject(userDataCustom) ? userDataCustom : {}),
    // Event mapping
    ...(isObject(eventData.user_data) ? eventData.user_data : {}),
  };

  // Extract custom_data and user_data from eventData, leave the rest
  const {
    user_data: _ud,
    custom_data: eventCustomData,
    ...restEventData
  } = eventData;

  const serverEvent: ConversionEvent = {
    event_name: event.name,
    event_id: event.id,
    event_time: Math.round((event.timestamp || Date.now()) / 1000),
    action_source,
    ...restEventData,
    user_data: userData,
  };

  // Nest custom_data from mapping
  if (isObject(eventCustomData)) {
    serverEvent.custom_data = eventCustomData as ConversionEvent['custom_data'];
  }

  // Set event_source_url for web events
  if (action_source === 'web') {
    serverEvent.event_source_url = event.source.id;
  }

  // Add partner_name from settings
  if (partner_name) {
    serverEvent.partner_name = partner_name;
  }

  const hashedServerEvent = await hashEvent(serverEvent, doNotHash);

  const body: RequestBody = { data: [hashedServerEvent] };

  // Build endpoint URL
  const testParam = test ? '?test=true' : '';
  const endpoint = `${url}ad_accounts/${adAccountId}/events${testParam}`;

  logger.debug('Calling Pinterest API', {
    endpoint,
    method: 'POST',
    eventName: serverEvent.event_name,
    eventId: serverEvent.event_id,
  });

  const sendServerFn = env?.sendServer || sendServer;
  const result = await sendServerFn(endpoint, JSON.stringify(body), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  logger.debug('Pinterest API response', {
    ok: isObject(result) ? result.ok : true,
  });

  if (isObject(result) && result.ok === false) {
    logger.throw(`Pinterest API error: ${JSON.stringify(result)}`);
  }
};
