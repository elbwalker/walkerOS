import type { WalkerOS } from '@elbwalker/types';
import type { Config, Mapping, PushEvents } from './types';
import {
  Content,
  CustomData,
  EventRequest,
  FacebookAdsApi,
  ServerEvent,
  UserData,
} from 'facebook-nodejs-business-sdk';

export const push = async function (events: PushEvents, config: Config) {
  const {
    access_token,
    pixel_id,
    debug,
    partner = 'walkerOS',
    test_code,
  } = config.custom;

  FacebookAdsApi.init(access_token);

  const serverEvents = events.map((event) =>
    mapEvent(event.event, event.mapping),
  );

  const eventRequest = new EventRequest(
    access_token,
    pixel_id,
    serverEvents,
    partner,
    test_code,
  );

  if (debug) eventRequest.setDebugMode(true);

  return eventRequest.execute().then(
    () => {
      return {};
    },
    (err: unknown) => {
      throw err;
    },
  );
};

export const mapEvent = (
  event: WalkerOS.Event,
  mapping: Mapping = {},
): ServerEvent => {
  mapping; // @TODO
  const { user, source } = event;

  let userData = new UserData();
  // @TODO
  // .setEmails(['joe@eg.com']);
  // .setPhones(['12345678901', '14251234567']);
  // .setFbp('fb.1.1558571054389.1098115397') // _fbp cookie
  // .setFbc('fb.1.1554763741205.AbCdEfGhIjKlMnOpQrStUvWxYz1234567890'); // Facebook Click ID
  if (user.city) userData = userData.setCity(user.city);

  if (user.userAgent) userData = userData.setClientUserAgent(user.userAgent);
  if (user.ip) userData = userData.setClientIpAddress(user.ip);

  const content = new Content().setId('product123').setQuantity(1); // @TODO

  const customData = new CustomData()
    .setContents([content])
    .setCurrency('usd') // @TODO
    .setValue(123.45); // @TODO

  const timestamp = Math.floor(
    (event.timestamp || new Date().getTime()) / 1000,
  );
  const actionSource = source.type === 'web' ? 'website' : 'server';

  const serverEvent = new ServerEvent()
    .setEventId(event.id)
    .setEventName(event.event)
    .setEventTime(timestamp)
    .setUserData(userData)
    .setCustomData(customData)
    .setEventSourceUrl(source.id)
    .setActionSource(actionSource);

  return serverEvent;
};
