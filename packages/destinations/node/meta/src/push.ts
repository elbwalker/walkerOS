import type { WalkerOS } from '@elbwalker/types';
import type {
  BodyParameters,
  CustomerInformationParameters,
  PushFn,
  ServerEventParameters,
} from './types';
import { assign, isObject } from '@elbwalker/utils';
import { sendNode } from '@elbwalker/utils/node';

export const push: PushFn = async function (event, config, mapping, options) {
  const {
    accessToken,
    pixelId,
    testCode,
    url = 'https://graph.facebook.com/v22.0/',
    // user_data,
  } = config.custom!;

  const data = isObject(options?.data) ? options?.data : {};
  // let userData: CustomerInformationParameters = {
  //   ...user_data,
  //   ...(isObject(data.user_data) ? data.user_data : {}),
  // };

  const serverEvent: ServerEventParameters = {
    event_name: event.event,
    event_time: event.timestamp || Date.now(),
    user_data: {},
    action_source: 'website',
    ...data,
  };
  const body: BodyParameters = { data: [serverEvent] };

  // Test event code
  if (testCode) body.test_event_code = testCode;

  const result = await sendNode(
    `${url}${pixelId}/events?access_token=${accessToken}`,
    JSON.stringify(body),
  );
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
