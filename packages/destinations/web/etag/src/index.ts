import type { CustomConfig, Destination, Parameters } from './types';
import type { WalkerOS } from '@elbwalker/types';
import { getId, requestToParameter, sendWeb } from '@elbwalker/utils';

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

    const data: Parameters = {
      v: '2',
      tid: custom.measurementId,
      gcs: 'G111', // granted
      gcd: '11t1t1t1t5', // granted by default
      _p: getId(),
      cid: getClientId(event, custom),
      en: event.event,
      // Optional parameters
      _et: event.timing * 1000, // @TODO check if timing is available
      // dl: event.source.id, // @TODO what if source is not available?
      // dr: event.source.previous_id,
      ...custom.params, // Custom parameters override defaults
    };

    const params = requestToParameter(data); // @TODO

    sendWeb(url + params, undefined, {
      headers: {},
      transport: 'fetch',
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
    '99999999.' + Math.floor(Date.now() / 86400000) * 86400 // Daily timestamp
  );
}

export default destinationEtag;
