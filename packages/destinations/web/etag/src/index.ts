import type {
  CustomConfig,
  Destination,
  Parameters,
  ParametersDevice,
  ParametersEvent,
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

    const events = [event];

    // @TODOs
    // key event parameter flags

    const params: Parameters = {
      v: '2',
      tid: custom.measurementId,
      _p: getId(), // Cache buster
      ...getConsentMode(), // Consent mode
      ...getClientId(user), // Client ID
      ...getDeviceParams(user), // User parameters
      ...getDocumentParams(event), // Document parameters
      ...getSessionParams(event, custom, instance), // Session parameters
      ...custom.params, // Custom parameters override defaults
    };

    // User id
    if (user.id) params.uid = user.id;

    // Debug mode
    if (custom.debug) params._dbg = 1;

    const headers: Record<string, string> = {
      'Content-Type': 'text/plain;charset=UTF-8',
    };

    // User Agent
    const userAgent = user.userAgent || window?.navigator?.userAgent;
    if (userAgent) headers['User-Agent'] = userAgent;

    // page_view
    if (!custom.sentPageView) {
      events.push({
        ...event, // Create a virtual page_view event by copying the original event
        event: 'page_view',
        entity: 'page',
        action: 'view',
        trigger: 'code',
        id: String(event.id || getId(5)).slice(0, -1) + '0', // Change the event ID
        count: 0,
        data: {},
        context: {},
      });

      custom.sentPageView = true;
    }

    // Event count
    if (events.length > 1) params._s = events.length; // Hit count

    const body = getEventData(events, custom);

    sendWebAsFetch(url + requestToParameter(params), body, {
      headers,
      method: 'POST',
    });

    config.custom = custom;
  },
};

function getClientId(
  user: WalkerOS.User = {},
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

function getDeviceParams(user: WalkerOS.User = {}): ParametersDevice {
  const params: ParametersDevice = {};

  if (user.language) params.ul = String(user.language).toLocaleLowerCase(); // User language
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

// Function to generate event data for the body
function getEventData(events: WalkerOS.Events, custom: CustomConfig): string {
  const data: string[] = [];

  events.forEach((event, i) => {
    const eventParams: ParametersEvent = {
      en: event.event, // Event name
      _et: getEngagementTime(custom), // Time between now and the previous event
    };

    if (i > 0) eventParams._ee = 1; // Enhanced Measurement Flag

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
        if (groupName == 'context')
          val = (val as WalkerOS.OrderedProperties)[0];

        const type = typeof val === 'number' ? 'epn' : 'ep';
        const paramKey = `${type}.${groupName}_${key}`;
        eventParams[paramKey] = val;
      });
    });

    data.push(requestToParameter(eventParams));
  });

  return data.join('\r\n');
}

function getSessionId(user: WalkerOS.User = {}): number {
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

  // @TODO session.storage
  if (!custom.sentSession && session) {
    const { isStart, isNew, count } = session;

    if (isNew) {
      // params._nsi = 1; // new to site
      params._fv = 1; // first visit
    }

    if (isStart) params._ss = 1; // session start

    if (count) params.sct = count; // session count
  }

  custom.sentSession = true;
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
