import type { CustomConfig, Destination, Parameters } from './types';
import type { WalkerOS } from '@elbwalker/types';
import { getId, requestToParameter, sendWebAsFetch } from '@elbwalker/utils';

// Types
export * as DestinationWebEtag from './types';

export const destinationEtag: Destination = {
  type: 'etag',

  config: {},

  init(config) {
    if (!config.custom || !config.custom.measurementId) return false;
  },

  push(event, config, mapping, instance) {
    const { custom } = config;
    if (!custom || !custom.measurementId) return;

    const url = custom.url || 'https://www.google-analytics.com/g/collect?';

    const data: Parameters = {
      v: '2',
      tid: custom.measurementId,
      gcs: 'G111', // granted
      gcd: '11t1t1t1t5', // granted by default
      _p: getId(),
      cid: getClientId(event, custom),
      sid: getSessionID(custom, instance),
      en: event.event,
      // Optional parameters
      _et: event.timing * 1000, // @TODO number of milliseconds between now and the previous event
      // dl: event.source.id, // @TODO what if source is not available?
      // dr: event.source.previous_id,
      ...custom.params, // Custom parameters override defaults
    };

    const params = requestToParameter(data); // @TODO

    sendWebAsFetch(url + params, undefined, {
      headers: {},
      method: 'POST',
    });
  },
};

function getClientId(event: WalkerOS.Event, custom: CustomConfig) {
  const { user = {} } = event;

  return (
    custom.clientId ||
    user.device ||
    user.session ||
    user.hash ||
    '1234567890.' + Math.floor(Date.now() / 86400000) * 86400 // Daily timestamp
  );
}

function getSessionID(
  custom: CustomConfig,
  instance?: WalkerOS.Instance,
): number {
  let str: WalkerOS.PropertyType | undefined = custom.sid;

  if (!str && instance?.session?.id) str = instance.session.id;
  // @TODO add other session sources

  if (!str) str = '9876543210';

  // Transform session ID to a static 10-digit number
  str = String(str);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }

  const sid = Math.abs(hash % 10000000000);

  // Save sessionID
  custom.sid = sid;

  return sid;
}

export default destinationEtag;
