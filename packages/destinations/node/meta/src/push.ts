import type { WalkerOS } from '@elbwalker/types';
import type { EventMapping, PushFn } from './types';
import {
  Content,
  CustomData,
  EventRequest,
  ServerEvent,
  UserData,
} from 'facebook-nodejs-business-sdk';
import { getMappingValue } from '@elbwalker/utils';

export const push: PushFn = async function (event, config, mapping) {
  const {
    accessToken,
    pixelId,
    debug,
    partner = 'walkerOS',
    testCode,
  } = config.custom!;

  const events = [mapEvent(event, mapping)];

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
  mapping: EventMapping = {},
): ServerEvent => {
  const { data, user, source } = event;
  const { currency, content, value } = mapping.custom || {};

  let userData = new UserData();
  if (user) {
    // IDs
    const ids = [user.id, user.device, user.session, user.hash]
      .filter((id) => typeof id === 'string')
      .map(lower);

    if (ids.length) userData = userData.setExternalIds(ids);

    // Customer Information Parameters
    if (user.email) userData = userData.setEmail(lower(user.email));
    if (user.phone && user.phone.length > 6)
      userData = userData.setPhone(lower(user.phone));
    if (user.city) userData = userData.setCity(lower(user.city));
    if (user.country) userData = userData.setCountry(lower(user.country));
    if (user.zip) userData = userData.setZip(lower(user.zip));
    if (user.userAgent) userData = userData.setClientUserAgent(user.userAgent);
    if (user.ip) userData = userData.setClientIpAddress(user.ip);
  }

  if (data.fbclid) {
    let time;
    if (event.event == 'session start') time = event.timestamp;

    userData = userData.setFbc(formatClickId(data.fbclid, time));
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

    // Check if at least one value is defined
    const definedValues = Object.values(item).filter(
      (value) => value !== undefined,
    ).length;

    if (definedValues) customData.setContents([item]);
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
