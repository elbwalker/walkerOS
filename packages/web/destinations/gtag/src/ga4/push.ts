import type { WalkerOS } from '@walkeros/core';
import type { GA4Settings, GA4Mapping, Parameters } from '../types';
import type { DestinationWeb } from '@walkeros/web-core';
import { isObject } from '@walkeros/core';
import { getParamsInclude } from '../shared/parameters';
import { normalizeEventName } from '../shared/mapping';
import { getEnvironment } from '@walkeros/web-core';

export function pushGA4Event(
  event: WalkerOS.Event,
  settings: GA4Settings,
  mapping: GA4Mapping = {},
  data: WalkerOS.AnyObject,
  env?: DestinationWeb.Environment,
): void {
  const { window } = getEnvironment(env);

  if (!settings.measurementId) return;

  const eventData = isObject(data) ? data : {};

  const paramsInclude = getParamsInclude(
    event,
    // Add data to include by default
    mapping.include || settings.include || ['data'],
  );

  const eventParams: Parameters = {
    ...paramsInclude,
    ...eventData,
  };

  // Event name (snake_case default)
  let eventName = event.event; // Assume custom mapped name
  if (settings.snakeCase !== false) {
    // Use snake case if not disabled
    eventName = normalizeEventName(eventName);
  }

  // Set the GA4 stream id
  eventParams.send_to = settings.measurementId;

  // Debug mode
  if (settings.debug) eventParams.debug_mode = true;

  const gtag = window.gtag as Gtag.Gtag;
  gtag('event', eventName, eventParams);
}
