import type { WalkerOS, Destination } from '@elbwalker/types';
import type { EventMapping, PushFn } from './types';
import {
  Content,
  CustomData,
  EventRequest,
  ServerEvent,
  UserData,
} from 'facebook-nodejs-business-sdk';
import { isArray, isObject, isString } from '@elbwalker/utils';

export const push: PushFn = async function (event, config, mapping, options) {
  const {
    accessToken,
    pixelId,
    debug,
    partner = 'walkerOS',
    testCode,
  } = config.custom!;

  const events = [await mapEvent(event, mapping, options?.data)];

  const eventRequest = new EventRequest(
    accessToken,
    pixelId,
    events,
    partner,
    testCode,
    pixelId,
    String(new Date().getTime()),
  );

  if (debug) eventRequest.setDebugMode(true);

  await eventRequest.execute();
};

export const mapEvent = async (
  event: WalkerOS.Event,
  mapping: EventMapping = {},
  data: Destination.Data = {},
): Promise<ServerEvent> => {
  const { data: eventData, source } = event;
  const { contents, currency, user, value } = isObject(data) ? data : {};

  const fbclid = eventData.fbclid;

  let userData = new UserData();
  console.log('🚀 ~ user:', user);

  if (isObject(user)) {
    // IDs
    const ids = [user.id, user.device, user.session, user.hash]
      .filter(isString)
      .map(lower);

    if (ids.length) userData = userData.setExternalIds(ids);

    // Customer Information Parameters
    if (user.email) userData = userData.setEmail(lower(user.email));
    if (user.phone && String(user.phone).length > 6)
      userData = userData.setPhone(lower(user.phone));
    if (user.city) userData = userData.setCity(lower(user.city));
    if (user.country) userData = userData.setCountry(lower(user.country));
    if (user.zip) userData = userData.setZip(lower(user.zip));
    if (user.userAgent)
      userData = userData.setClientUserAgent(String(user.userAgent));
    if (user.ip) userData = userData.setClientIpAddress(String(user.ip));
  }

  if (fbclid) {
    let time;
    if (event.event == 'session start') time = event.timestamp;

    userData = userData.setFbc(formatClickId(fbclid, time));
    // @TODO userData.setFbp('fb.1.1558571054389.1098115397') // _fbp cookie
  }

  const customData = new CustomData();

  // Currency
  if (currency) customData.setCurrency(String(currency));

  // Value
  if (value) customData.setValue(parseFloat(String(value)));

  // Content
  if (isArray(contents)) {
    const items = contents
      .map((item) => {
        const { id, price, quantity } = isObject(item) ? item : {};
        const content = new Content();
        if (id) content.setId(String(id));
        if (price) content.setItemPrice(parseFloat(String(price)));
        if (quantity) content.setQuantity(parseFloat(String(quantity)));
        return content;
      })
      .filter((value) => value !== undefined);

    if (items.length) customData.setContents(items);
  }

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

function lower(str: WalkerOS.Property): string {
  return String(str).toLocaleLowerCase();
}
