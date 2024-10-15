import type { WalkerOS } from '@elbwalker/types';
import type { Config, Mapping, PushEvents } from './types';
import {
  Content,
  CustomData,
  EventRequest,
  ServerEvent,
  UserData,
} from 'facebook-nodejs-business-sdk';
import { getMappingValue } from '@elbwalker/utils';

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
  const { data, user, source } = event;
  const { currency, content, value } = mapping.custom || {};

  const eventName = mapping.name || event.event;

  let userData = new UserData();
  if (user) {
    if (user.email) userData = userData.setEmail(lower(user.email));
    if (user.phone && user.phone.length > 6)
      userData = userData.setPhone(lower(user.phone));
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

  const customData = new CustomData();

  // Currency
  const currencyValue = currency && getMappingValue(event, currency);
  if (currencyValue) customData.setCurrency(String(currencyValue));

  // Value
  const valueValue = value && getMappingValue(event, value);
  if (valueValue) customData.setValue(parseFloat(String(valueValue)));

  // Content
  if (content) {
    const { id, price, quantity } = content;
    const item = new Content();
    const idValue = id && getMappingValue(event, id);
    const priceValue = price && getMappingValue(event, price);
    const quantityValue = quantity && getMappingValue(event, quantity);
    if (idValue) item.setId(String(idValue));
    if (priceValue) item.setItemPrice(parseFloat(String(priceValue)));
    if (quantityValue) item.setQuantity(parseFloat(String(quantityValue)));

    customData.setContents([item]);
  }

  const timestamp = Math.floor(
    (event.timestamp || new Date().getTime()) / 1000,
  );

  const actionSource = source.type === 'web' ? 'website' : 'server';

  const serverEvent = new ServerEvent()
    .setEventId(event.id)
    .setEventName(eventName)
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
