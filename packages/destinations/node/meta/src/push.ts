import type { WalkerOS } from '@elbwalker/types';
import type { Config, Mapping, PushEvents } from './types';
import {
  Content,
  CustomData,
  EventRequest,
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
  const { data, user, source } = event;

  let userData = new UserData();
  if (user) {
    // @TODO
    // .setEmails(['joe@eg.com']);
    // .setPhones(['12345678901', '14251234567']);
    if (user.city) userData = userData.setCity(lower(user.city));
    if (user.country) userData = userData.setCountry(lower(user.country));
    if (user.zip) userData = userData.setZip(lower(user.zip));
    if (user.userAgent) userData = userData.setClientUserAgent(user.userAgent);
    if (user.ip) userData = userData.setClientIpAddress(user.ip);
  }

  if (data.clickId) {
    let time;
    if (event.event == 'session start') time = event.timestamp;

    userData = userData.setFbc(formatClickId(data.clickId, time));
    // @TODO userData.setFbp('fb.1.1558571054389.1098115397') // _fbp cookie
  }

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

function lower(str: string) {
  return str.toLocaleLowerCase();
}
