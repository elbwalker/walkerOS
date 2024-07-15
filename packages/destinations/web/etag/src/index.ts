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

  push(event, config) {
    const { custom } = config;
    if (!custom || !custom.measurementId) return;

    const url = custom.url || 'https://region1.google-analytics.com/g/collect?';

    const { data = {}, user = {} } = event;

    // @TODOs
    // key event parameter flags

    const params: Parameters = {
      v: '2',
      tid: custom.measurementId,
      gcs: 'G111', // granted
      // gcd: '11t1t1t1t5', // granted by default
      _p: getId(),
      cid: getClientId(user),
      sid: getSessionId(user),
      en: event.event,
      // Optional parameters
      _et: getEventTime(custom), // Time between now and the previous event
      // dl: event.source.id, // @TODO what if source is not available?
      // dr: event.source.previous_id,
      dl: 'https://test.elbwalker.com/', // @TODO what if source is not available?
      dr: 'https://previous.elbwalker.com/', // @TODO what if source is not available?
      dt: 'Demo',
      ...custom.params, // Custom parameters override defaults
    };

    // session
    // @TODO eventually use the instance.session data
    if (event.event == 'session start') {
      params._ss = 1; // session start
      params._nsi = 1; // new to site
      if (data.isNew) params._fv = 1; // first visit
      if (data.count) params.sct = data.count as number; // session count
    }

    // user id
    if (user.id) params.uid = user.id;

    // Debug mode
    if (custom.debug) params._dbg = 1;

    sendWebAsFetch(url + requestToParameter(params), undefined, {
      headers: {
        // @TODO set headers
      },
      method: 'POST',
    });

    config.custom = custom;
  },
};

function getClientId(user: WalkerOS.AnyObject = {}) {
  const userId = getUser(user);
  const clientId = userId ? valueToNumber(userId) : '1234567890';

  return (
    clientId + '.' + Math.floor(Date.now() / 86400000) * 86400 // Daily timestamp; // @TODO use the instance.session data
  );
}

function getEventTime(custom: CustomConfig) {
  const lastEvent = custom.lastEngagement
    ? Math.floor(Date.now() - (custom.lastEngagement || 1))
    : 1;

  custom.lastEngagement = Date.now();

  return lastEvent;
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
