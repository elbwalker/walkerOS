import type { Elb, Logger } from '@walkeros/core';
import type {
  Settings,
  UsercentricsEventDetail,
  UsercentricsV3Api,
  UsercentricsV3CategoryState,
  UsercentricsV3CmpEventDetail,
  UsercentricsV3ConsentDetails,
} from '../types';
import { parseConsent } from './parseConsent';

export interface V3AdapterContext {
  window: Window & typeof globalThis;
  elb: Elb.Fn;
  settings: Settings;
  logger: Logger.Instance;
}

const V3_DEFAULT_EVENT_NAME = 'UC_UI_CMP_EVENT';

/**
 * V3 CMP event types that represent a user consent decision. Presentation
 * events like `CMP_SHOWN` or `UI_INITIALIZED` must NOT trigger a consent
 * publish — they carry no user decision.
 */
const V3_DECISION_TYPES: ReadonlySet<string> = new Set([
  'ACCEPT_ALL',
  'DENY_ALL',
  'SAVE',
]);

/**
 * Map a V3 CategoryData.state value to a walkerOS boolean using strict
 * semantics: only fully-accepted categories are `true`. Any partial or
 * denied state (including future/unknown states) resolves to `false`.
 *
 * This matches the consent rule of thumb: any deny signal denies.
 */
function categoryStateToBoolean(state: UsercentricsV3CategoryState): boolean {
  return state === 'ALL_ACCEPTED';
}

/**
 * Build a synthetic UsercentricsEventDetail from V3 ConsentDetails.
 * Translates V3's structured consent state into the shape parseConsent expects.
 */
function buildDetailFromV3(
  details: UsercentricsV3ConsentDetails,
): UsercentricsEventDetail {
  const ucCategory: Record<string, boolean> = {};
  Object.entries(details.categories).forEach(([slug, category]) => {
    ucCategory[slug] = categoryStateToBoolean(category.state);
  });

  return {
    event: 'consent_status',
    type: details.consent.type === 'EXPLICIT' ? 'explicit' : 'implicit',
    ucCategory,
  };
}

/**
 * Set up the V3 adapter: registers a listener on the V3 consent event AND
 * (if __ucCmp is already initialized) performs a static read.
 *
 * Both paths re-fetch getConsentDetails() because the event payload does
 * not include consent state.
 *
 * Returns a cleanup function that removes the event listener.
 */
export async function setupV3Adapter(
  ctx: V3AdapterContext,
): Promise<() => void> {
  const { window: win, elb, settings, logger } = ctx;
  const eventName = settings.v3EventName ?? V3_DEFAULT_EVENT_NAME;

  const publishConsent = async (cmp: UsercentricsV3Api): Promise<void> => {
    const details = await cmp.getConsentDetails();
    const detail = buildDetailFromV3(details);
    logger.debug('event received', detail);

    if (settings.explicitOnly && detail.type !== 'explicit') return;

    const state = parseConsent(detail, settings);
    if (Object.keys(state).length > 0) {
      elb('walker consent', state);
    }
  };

  const listener = (event: Event): void => {
    const cmp = win.__ucCmp;
    if (!cmp) return;
    const custom = event as CustomEvent<UsercentricsV3CmpEventDetail>;
    const detail = custom.detail;
    // Filter to decision events only: the CMP emits a broad set of events
    // (CMP_SHOWN, UI_INITIALIZED, VIEW_CHANGED, …) on this bus. Without
    // filtering, every view toggle would re-publish consent.
    if (!detail || detail.source !== 'CMP') return;
    if (!detail.type || !V3_DECISION_TYPES.has(detail.type)) return;
    publishConsent(cmp).catch(() => {
      // Swallow — a failed V3 fetch should not break the page.
    });
  };
  win.addEventListener(eventName, listener);

  // Static check: if __ucCmp is already initialized, fetch now.
  // Wrapped in try/catch so transient API failures during setup don't
  // reject setupV3Adapter() and tear down the whole flow — the listener
  // stays registered and will pick up the next real event.
  const cmp = win.__ucCmp;
  if (cmp) {
    try {
      const initialized = await cmp.isInitialized();
      if (initialized) {
        await publishConsent(cmp);
      }
    } catch (err) {
      logger.warn('v3 static consent read failed', err);
    }
  }

  return () => {
    win.removeEventListener(eventName, listener);
  };
}
