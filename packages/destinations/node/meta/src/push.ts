import type { WalkerOS } from '@elbwalker/types';
import type {
  BodyParameters,
  CustomerInformationParameters,
  PushFn,
  ServerEventParameters,
} from './types';
import { getMappingValue, isObject } from '@elbwalker/utils';
import { sendNode } from '@elbwalker/utils/node';
import { hashEvent } from './hash';

export const push: PushFn = async function (event, config, mapping, options) {
  const {
    accessToken,
    pixelId,
    action_source = 'website',
    doNotHash,
    fbclid,
    test_event_code,
    url = 'https://graph.facebook.com/v22.0/',
    user_data,
  } = config.custom!;

  const data = isObject(options?.data) ? options?.data : {};
  const configData = config.data
    ? await getMappingValue(event, config.data)
    : {};
  const userDataCustom = user_data
    ? await getMappingValue(event, { map: user_data })
    : {};

  let userData: CustomerInformationParameters = {
    // Destination config
    ...(isObject(configData) && isObject(configData.user_data)
      ? configData.user_data
      : {}),
    // Custom user_data
    ...(isObject(userDataCustom) ? userDataCustom : {}),
    // Event mapping
    ...(isObject(data.user_data) ? data.user_data : {}),
  };

  if (fbclid)
    userData.fbc = formatClickId(fbclid, options?.instance?.session?.start);

  const serverEvent: ServerEventParameters = {
    event_name: event.event,
    event_id: event.id,
    event_time: (event.timestamp || Date.now()) / 1000,
    action_source,
    ...data,
    user_data: userData,
  };

  if (action_source === 'website')
    serverEvent.event_source_url = event.source.id;

  const hashedServerEvent = await hashEvent(serverEvent, doNotHash);

  const body: BodyParameters = { data: [hashedServerEvent] };

  // Test event code
  if (test_event_code) body.test_event_code = test_event_code;

  const func = config.fn || sendNode;
  const result = await func(
    `${url}${pixelId}/events?access_token=${accessToken}`,
    JSON.stringify(body),
  );

  if (isObject(result) && result.ok === false)
    throw new Error(JSON.stringify(result));
};

function formatClickId(clickId: WalkerOS.Property, time?: number): string {
  // https://developers.facebook.com/docs/marketing-api/conversions-api/parameters/fbp-and-fbc#2--format-clickid

  // Version is always "fb"
  const version = 'fb';

  // Subdomain ('com' = 0, 'example.com' = 1, 'www.example.com' = 2)
  const subdomainIndex = '1';

  // Get the current timestamp in milliseconds (or when the fbclid was observed)
  const creationTime = time || Date.now();

  return `${version}.${subdomainIndex}.${creationTime}.${clickId}`;
}

function lower(str: WalkerOS.Property): string {
  return String(str).toLocaleLowerCase();
}
