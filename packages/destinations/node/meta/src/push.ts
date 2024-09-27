import type { WalkerOS } from '@elbwalker/types';
import type { Config, Mapping, PushEvents } from './types';
import bizSdk from 'facebook-nodejs-business-sdk';

export const push = async function (events: PushEvents, config: Config) {
  const { access_token, pixel_id } = config.custom;
  events;
  config;

  bizSdk.FacebookAdsApi.init(access_token);

  const serverEvents = events.map((event) =>
    mapEvent(event.event, event.mapping),
  );

  const EventRequest = bizSdk.EventRequest;
  const eventRequest = new EventRequest(access_token, pixel_id).setEvents(
    serverEvents,
  );

  eventRequest.execute().then(
    (response) => {
      console.log('Response: ', response);
    },
    (err) => {
      console.error('Error: ', err);
    },
  );

  return { queue: [] };
};

export const mapEvent = (
  event: WalkerOS.Event,
  mapping: Mapping = {},
): bizSdk.ServerEvent => {
  mapping; // @TODO

  const Content = bizSdk.Content;
  const CustomData = bizSdk.CustomData;
  const UserData = bizSdk.UserData;
  const ServerEvent = bizSdk.ServerEvent;

  let userData = new UserData();
  // @TODO
  // .setEmails(['joe@eg.com'])
  // .setPhones(['12345678901', '14251234567'])
  // .setFbp('fb.1.1558571054389.1098115397') // _fbp cookie
  // .setFbc('fb.1.1554763741205.AbCdEfGhIjKlMnOpQrStUvWxYz1234567890'); // Facebook Click ID

  const { user, source } = event;

  if (user.userAgent) userData = userData.setClientUserAgent(user.userAgent);
  if (user.ip) userData = userData.setClientIpAddress(user.ip);

  const content = new Content().setId('product123').setQuantity(1); // @TODO

  const customData = new CustomData()
    .setContents([content])
    .setCurrency('usd') // @TODO
    .setValue(123.45); // @TODO

  const serverEvent = new ServerEvent()
    .setEventName(event.event)
    .setEventTime(event.timestamp)
    .setUserData(userData)
    .setCustomData(customData)
    .setEventSourceUrl(source.id)
    .setActionSource(source.type);

  return serverEvent;
};
