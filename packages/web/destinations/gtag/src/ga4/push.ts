import type { WalkerOS, Logger } from '@walkeros/core';
import type { GA4Settings, Parameters, Env } from '../types';
import { isObject } from '@walkeros/core';
import { normalizeEventName, normalizeParamName } from '../shared/mapping';
import { getEnv } from '@walkeros/web-core';

/**
 * Parameter names GA4 will not honour on an event, mapped to the reason.
 *
 * Deliberately NOT Google's published reserved list. That list governs which
 * names may be registered as custom dimensions, not which may be sent, and it
 * contains `currency`, which is required on every ecommerce event. Only names
 * that are actively harmful or provably inert belong here.
 *
 * These two are also the complete set `include` can produce: every other
 * section key carries a `<section>_` prefix that lifts it out of GA4's
 * vocabulary. A guard test holds that claim to the reserved list over time.
 */
export const GA4_RESERVED_PARAMS = {
  // From event.source.platform, set on every walkerOS event. GA4 reads it into
  // collected_traffic_source.manual_source_platform, which declares a manual
  // campaign carrying no source or medium. That reports as Unassigned.
  source_platform: 'breaks GA4 traffic attribution',
  // From event.user.id. GA4 takes identity through gtag('config'|'set'); as an
  // event parameter the name is reserved and ignored, costing a param slot.
  user_id: 'reserved by GA4; set identity via gtag config',
} as const;

// Lookup by arbitrary string without widening the literal key types above,
// which the drift guard needs to compare against the event model.
const reservedReason = new Map<string, string>(
  Object.entries(GA4_RESERVED_PARAMS),
);

export function pushGA4Event(
  event: WalkerOS.Event,
  settings: GA4Settings,
  data: WalkerOS.AnyObject,
  env: Env | undefined,
  logger: Logger.Instance,
): void {
  const { window } = getEnv<Env>(env);

  if (!settings.measurementId)
    logger.throw('Config settings ga4.measurementId missing');

  // Coerce every param name into GA4's charset before it goes out. Reserved
  // matching runs on the normalized name, so an illegal spelling cannot
  // smuggle a reserved name through.
  const eventParams: Parameters = {};
  if (isObject(data)) {
    for (const [rawName, value] of Object.entries(data)) {
      const name = normalizeParamName(rawName);

      if (!name) {
        logger.warn('GA4 param dropped: empty name');
        continue;
      }

      const reason = reservedReason.get(name);
      if (reason) {
        logger.debug(`GA4 param "${name}" dropped: ${reason}`);
        continue;
      }

      if (name in eventParams)
        logger.warn(
          `GA4 param "${name}" overwritten: "${rawName}" collides after normalization`,
        );

      eventParams[name] = value;
    }
  }

  // Event name (snake_case default)
  const eventName = normalizeEventName(
    event.name,
    settings.snakeCase !== false,
  );

  // Set the GA4 stream id
  eventParams.send_to = settings.measurementId;

  // Debug mode
  if (settings.debug) eventParams.debug_mode = true;

  const gtag = window.gtag!;
  gtag('event', eventName, eventParams);
}
