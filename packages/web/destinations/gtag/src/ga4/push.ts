import type { WalkerOS, Logger } from '@walkeros/core';
import type { GA4Settings, Parameters } from '../types';
import type { DestinationWeb } from '@walkeros/web-core';
import { isObject } from '@walkeros/core';
import { normalizeEventName } from '../shared/mapping';
import { getEnv } from '@walkeros/web-core';

export function pushGA4Event(
  event: WalkerOS.Event,
  settings: GA4Settings,
  data: WalkerOS.AnyObject,
  env: DestinationWeb.Env | undefined,
  logger: Logger.Instance,
): void {
  const { window } = getEnv(env);

  if (!settings.measurementId)
    logger.throw('Config settings ga4.measurementId missing');

  const eventParams: Parameters = isObject(data)
    ? { ...(data as Record<string, unknown>) }
    : {};

  // Event name (snake_case default)
  let eventName = event.name; // Assume custom mapped name
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
