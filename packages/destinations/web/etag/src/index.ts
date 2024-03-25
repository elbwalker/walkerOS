import { getId, tryCatch } from '@elbwalker/utils';
import type { CustomConfig, Destination, Parameters } from './types';
import { WalkerOS } from '@elbwalker/types';

// Types
export * as DestinationEtag from './types';

export const destinationEtag: Destination = {
  type: 'etag',

  config: {},

  init(config) {
    if (!config.custom || !config.custom.measurementId) return false;
  },

  push(event, config, mapping = {}) {
    const { custom } = config;
    if (!custom) return;

    const url = custom.url || 'https://www.google-analytics.com/g/collect';
    const eventName =
      mapping.name || `${event.entity}_${event.action}`.toLowerCase();

    const params: Parameters = {
      v: '2', // Protocol version, always 2 for GA4
      tid: custom.measurementId, // TrackingID/MeasurementID
      gcs: 'G111', // Consent mode, granted
      gcd: '11t1t1t1t5', // Consent mode v2, granted by default
      _p: getId(), // Cache buster
      cid: getClientId(event, custom), // Client ID
      en: eventName, // Event name
      // Optional parameters
      _et: event.timing * 1000, // Engagement time
      dl: event.source.id, // Document location
      dr: event.source.previous_id, // Document referrer
      ...custom.params, // Custom parameters override defaults
    };

    tryCatch(sendRequest, (e) => console.error(e))(url, params);
  },
};

function getClientId(event: WalkerOS.Event, custom: CustomConfig) {
  return custom.clientId || event.user.device || '';
}

function sendRequest(url: string, params: Parameters) {
  // Construct query string from params object
  const data = new URLSearchParams(paramsToString(params)).toString();

  // Serialize data
  const payload = new Blob([data], { type: 'text/plain' });

  // Fire and forget
  navigator.sendBeacon(url, payload);
}

function paramsToString(params: Parameters): Record<string, string> {
  // Convert all non-undefined values to strings
  return Object.entries(params).reduce((acc, [key, value]) => {
    if (value) acc[key] = String(value);
    return acc;
  }, {} as Record<string, string>);
}

export default destinationEtag;
