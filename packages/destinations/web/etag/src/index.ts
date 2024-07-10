import type { Destination, Parameters } from './types';
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

  push(event, config) {
    const { custom } = config;
    if (!custom || !custom.measurementId) return;

    const url = custom.url || 'https://www.google-analytics.com/g/collect?';

    const { user = {} } = event;

    const data: Parameters = {
      v: '2',
      tid: custom.measurementId,
      gcs: 'G111', // granted
      gcd: '11t1t1t1t5', // granted by default
      _p: getId(),
      cid: getClientId(user),
      sid: getSessionId(user),
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

function getClientId(user: WalkerOS.AnyObject = {}) {
  const userId = getUser(user);
  const clientId = userId ? valueToNumber(userId) : '1234567890';

  return (
    clientId + '.' + Math.floor(Date.now() / 86400000) * 86400 // Daily timestamp;
  );
}

function getSessionId(user: WalkerOS.AnyObject = {}) {
  return valueToNumber(getUser(user) + user.session); // Combine user and session
}

function getUser(user: WalkerOS.AnyObject = {}) {
  return String(user.device || user.session || user.hash);
}

function valueToNumber(value: unknown = 42): number {
  const str = String(value);
  const prime1 = 31;
  const prime2 = 486187739;
  const mod = 1000000007;

  let hash = 0;

  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash * prime1 + char) % mod;
    hash = (hash * prime2) % mod;
  }

  hash = ((hash ^ (hash >>> 16)) * 0x85ebca6b) % mod;
  hash = ((hash ^ (hash >>> 13)) * 0xc2b2ae35) % mod;
  hash = (hash ^ (hash >>> 16)) % mod;

  const min = mod; // almost like 1000000000
  const max = 9999999999;

  return (Math.abs(hash) % (max - min + 1)) + min;
}

export default destinationEtag;
