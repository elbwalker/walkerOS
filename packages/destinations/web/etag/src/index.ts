import type {
  CustomConfig,
  Destination,
  Parameters,
  ParametersBrowser,
  ParametersConsent,
  ParametersDevice,
  ParametersEvent,
  ParametersSession,
} from './types';
import type { WalkerOS } from '@elbwalker/types';
import {
  assign,
  getId,
  parseUserAgent,
  requestToParameter,
  sendWebAsFetch,
} from '@elbwalker/utils';
import { WebClient } from '@elbwalker/walker.js';

// Types
export * as DestinationWebEtag from './types';

export const destinationEtag: Destination = {
  type: 'etag',

  config: {},

  init(config, instance) {
    if (!config.custom || !config.custom.measurementId || !instance.session)
      return false;
  },

  push(event, config, mapping, instance) {
    const { custom } = config;
    if (!custom || !custom.measurementId) return;
    const session = instance?.session;

    // @TODOs
    // key event parameter flags
    // uip parameter on node

    // page_view
    if (!custom.sentPageView) {
      const pageViewEvent = {
        ...event, // Create a virtual page_view event by copying the original event
        event: 'page_view',
        entity: 'page',
        action: 'view',
        trigger: 'code',
        id: String(event.id || getId(5)).slice(0, -1) + '0', // Change the event ID
        count: 0,
        data: {},
        context: {},
      };

      const { body, path } = getRequest(pageViewEvent, custom, session);
      sendRequest(custom, path, body);

      custom.sentPageView = true;
    }

    const { body, path } = getRequest(event, custom, session);

    sendRequest(custom, path, body);

    config.custom = custom;
  },
};

function sendRequest(custom: CustomConfig, path?: string, body?: string) {
  const url = custom.url || 'https://region1.google-analytics.com/g/collect?';

  sendWebAsFetch(url + path, body, {
    headers: custom.headers || {},
    method: 'POST',
    noCors: true,
    credentials: 'include', // @TODO be careful with this
  });
}

function getClientId(
  user: WalkerOS.User = {},
  instance?: WebClient.Instance,
): { cid: string } {
  const userId = getUser(user);
  const clientId = userId ? valueToNumber(userId) : '1234567890';

  const timestamp = instance?.session
    ? instance.session.start
    : Math.floor(Date.now() / 86400000) * 86400 + 1; // Daily timestamp

  return { cid: clientId + '.' + timestamp };
}

function getConsentMode(): ParametersConsent {
  return {
    gcs: 'G111', // Status
    // gcd: '11t1t1t1t5', // Default (granted)
    dma: 1, // Activate Digital Markets Act
    dma_cps: 'syphamo', // Share consent with Google tools by default (custom PII only)
    pscdl: 'noapi', // Privacy Sandbox
  };
}

function getBrowserParams(userAgent?: string): ParametersBrowser {
  const params: ParametersBrowser = {};

  const ua = parseUserAgent(userAgent);

  if (ua.os) params.uap = ua.os; // OS
  params.uamb = ua.deviceType == 'Mobile' ? 1 : 0; // Mobile
  params.ul = navigator.language.toLocaleLowerCase(); // User language
  // Skip if (ua.osVersion) params.uapv = ua.osVersion; // OS Version
  // Skip architecture (uaa) and bitness (uab), and full version list (uafvl) for now
  // navigator.userAgentData is not supported in all browsers

  return params;
}

function getDeviceParams(user: WalkerOS.User = {}): ParametersDevice {
  const params: ParametersDevice = {};

  if (user.screenSize) params.sr = user.screenSize; // Screen resolution

  return params;
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

function getEngagementTime(custom: CustomConfig): number {
  const lastEvent = custom.lastEngagement
    ? Math.floor(Date.now() - (custom.lastEngagement || 1))
    : 1;

  custom.lastEngagement = Date.now();

  return lastEvent || 1;
}

function getRequest(
  event: WalkerOS.Event,
  custom: CustomConfig,
  session?: WalkerOS.SessionData,
): { body?: string; path?: string } {
  const { user = {} } = event;

  // Event count
  custom.count = (custom.count || 0) + 1;

  const params: Parameters = {
    v: '2',
    tid: custom.measurementId,
    _p: Date.now(), // Cache buster
    _ee: 1, // Enhanced Measurement Flag
    _s: custom.count, // Hit count
    _z: 'fetch', // Transport mode
    ...getConsentMode(), // Consent mode
    ...getClientId(user), // Client ID
    ...getDeviceParams(user), // User parameters
    ...getDocumentParams(event), // Document parameters
    ...getSessionParams(event, custom, session), // Session parameters
    ...custom.params, // Custom parameters override defaults
  };

  if (typeof navigator !== 'undefined') {
    // Browser parameters
    assign(params, getBrowserParams(navigator.userAgent), { shallow: false });
  }

  // User id
  // if (user.id) params.uid = user.id;

  // Time to first byte
  if (event.timing) params.tfd = event.timing * 1000;

  // Debug mode
  if (custom.debug) params._dbg = 1;

  // Event Parameters
  const eventParams: ParametersEvent = {
    en: event.event, // Event name
    _et: getEngagementTime(custom), // Time between now and the previous event
    ...custom.paramsEvent,
  };

  const include: Array<keyof WalkerOS.Event> = [
    'context',
    'data',
    'event',
    'globals',
    'source',
    'user',
    'version',
  ];

  include.forEach((groupName) => {
    let group = event[groupName];

    if (!group) return;

    // Create a fake group for event properties
    if (groupName == 'event')
      group = {
        id: event.id,
        timing: event.timing,
        trigger: event.trigger,
        entity: event.entity,
        action: event.action,
        group: event.group,
        count: event.count,
      };

    Object.entries(group).forEach(([key, val]) => {
      // Different value access for context
      if (groupName == 'context') val = (val as WalkerOS.OrderedProperties)[0];

      const type = typeof val === 'number' ? 'epn' : 'ep';
      const paramKey = `${type}.${groupName}_${key}`;
      eventParams[paramKey] = val;
    });
  });

  let body; // Later used for event batching
  const path = requestToParameter({ ...params, ...eventParams });

  return { body, path };
}

function getSessionId(user: WalkerOS.User = {}): number {
  return valueToNumber(getUser(user) + user.session); // Combine user and session
}

function getSessionParams(
  event: WalkerOS.Event,
  custom: CustomConfig,
  session?: WalkerOS.SessionData,
): ParametersSession {
  const params: ParametersSession = {
    sid: getSessionId(event.user),
  };

  // Engagement
  let isEngaged = custom.isEngaged || false;

  if (!isEngaged && event.timing >= 10) isEngaged = true;
  if (!isEngaged && event.trigger == 'click') isEngaged = true;
  if (!isEngaged && session && (session.runs || 0) > 1) isEngaged = true;

  if (isEngaged) {
    custom.isEngaged = isEngaged;
    params.seg = 1;
  }

  // Session status
  if (!custom.sentSession && session) {
    const { isStart, isNew, count, storage } = session;

    if (isStart) {
      params._ss = 1; // session start

      if (isNew || !storage) {
        params._nsi = 1; // new to site
        params._fv = 1; // first visit
      }
    }

    params.sct = count || 1; // session count

    custom.sentSession = true;
  }

  return params;
}

function getUser(user: WalkerOS.User = {}) {
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
