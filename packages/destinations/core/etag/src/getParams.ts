import type { WalkerOS } from '@elbwalker/types';
import type {
  Config,
  Context,
  ParametersRequest,
  RequestData,
  State,
} from './types';
import { assign } from '@elbwalker/utils';
import {
  getBrowserParams,
  getClientId,
  getConsentMode,
  getDeviceParams,
  getDocumentParams,
  getEventParams,
  getSessionParams,
} from '.';

export function getParams(
  event: WalkerOS.Event,
  config: Config,
  context: Context,
): RequestData {
  const { user = {} } = event;

  // Event count
  config.count = (config.count || 0) + 1;

  const defaultState: State = {
    count: 0,
    lastEngagement: 1,
    isEngaged: false,
    sentPageView: false,
    sentSession: false,
  };

  const state = assign(defaultState, config);

  const requestParams: ParametersRequest = {
    v: '2',
    tid: config.measurementId,
    _p: Date.now(), // Cache buster
    _s: config.count, // Hit count
    _z: 'fetch', // Transport mode
    ...getConsentMode(), // Consent mode
    ...getClientId(user), // Client ID
    ...getDeviceParams(user), // User parameters
    ...getDocumentParams(event, context.pageTitle), // Document parameters
    ...getSessionParams(event, state, context.session), // Session parameters
    ...config.params, // Custom parameters override defaults
  };

  // Browser parameters
  assign(requestParams, getBrowserParams(context.userAgent, context.language), {
    shallow: false,
  });

  // User id
  // if (user.id) params.uid = user.id;

  // Time to first byte
  if (event.timing) requestParams.tfd = event.timing * 1000;

  // Debug mode
  if (config.debug) requestParams._dbg = 1;

  const eventParams = getEventParams(event, state, config.paramsEvent);

  let body; // Later used for event batching
  const path = { ...requestParams, ...eventParams };

  // Update the config state
  assign(config, state, { shallow: false });

  return { body, path };
}
