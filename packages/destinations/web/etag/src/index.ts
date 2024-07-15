import type {
  CustomConfig,
  Destination,
  Parameters,
  ParametersSession,
} from './types';
import type { WalkerOS } from '@elbwalker/types';
import { getId, requestToParameter, sendWebAsFetch } from '@elbwalker/utils';
import { WebClient } from '@elbwalker/walker.js';

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

    const url = custom.url || 'https://region1.google-analytics.com/g/collect?';

    const { user = {} } = event;

    // @TODOs
    // key event parameter flags
    // event parameter

    const params: Parameters = {
      v: '2',
      tid: custom.measurementId,
      en: event.event,
      _p: getId(), // Cache buster
      ...getConsentMode(), // Consent mode
      ...getClientId(user), // Client ID
      ...getEngagementTime(custom), // Time between now and the previous event
      ...getDocumentParams(event), // Document parameters
      ...getSessionParams(event, custom, instance), // Session parameters
      ...custom.params, // Custom parameters override defaults
    };

    // User id
    if (user.id) params.uid = user.id;

    // Debug mode
    if (custom.debug) params._dbg = 1;

    const headers: Record<string, string> = {};

    // User Agent
    const userAgent = user.userAgent || window?.navigator?.userAgent;
    if (userAgent) headers['User-Agent'] = userAgent;

    sendWebAsFetch(url + requestToParameter(params), undefined, {
      headers,
      method: 'POST',
    });

    config.custom = custom;
  },
};

function getClientId(
  user: WalkerOS.AnyObject = {},
  instance?: WebClient.Instance,
): { cid: string } {
  const userId = getUser(user);
  const clientId = userId ? valueToNumber(userId) : '1234567890';

  const timestamp = instance?.session
    ? instance.session.start
    : Math.floor(Date.now() / 86400000) * 86400; // Daily timestamp

  return { cid: clientId + '.' + timestamp };
}

function getConsentMode(): { gcs: string; gcd?: string } {
  return {
    gcs: 'G111', // Status
    // gcd: '11t1t1t1t5', // Default (granted)
  };
}

function getDocumentParams(event: Partial<WalkerOS.Event>): WalkerOS.AnyObject {
  const { source } = event;
  const params: WalkerOS.AnyObject = {};

  if (source) {
    params.dl = source.id; // location
    params.dr = source.previous_id; // referrer
  }

  if (document) params.dt = document.title; // title

  return params;
}

function getEngagementTime(custom: CustomConfig): { _et: number } {
  const lastEvent = custom.lastEngagement
    ? Math.floor(Date.now() - (custom.lastEngagement || 1))
    : 1;

  custom.lastEngagement = Date.now();

  return { _et: lastEvent };
}

function getSessionId(user: WalkerOS.AnyObject = {}): number {
  return valueToNumber(getUser(user) + user.session); // Combine user and session
}

function getSessionParams(
  event: WalkerOS.Event,
  custom: CustomConfig,
  instance?: WebClient.Instance,
): ParametersSession {
  const { session } = instance || {};
  const params: ParametersSession = {
    sid: getSessionId(event.user),
  };

  if (session) {
    const { isStart, isNew, count } = session;

    if (isNew) {
      params._nsi = 1; // new to site
      params._fv = 1; // first visit
    }

    if (isStart) params._ss = 1; // session start

    if (count) params.sct = count; // session count
  }

  return params;
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
