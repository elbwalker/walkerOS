import type { Elb, Logger } from '@walkeros/core';
import type {
  CategoryData,
  ConsentDetails,
  Usercentrics,
} from 'usercentrics-browser-ui';
import type { Settings, UsercentricsEventDetail } from '../types';
import { parseConsent } from './parseConsent';

export interface V3AdapterContext {
  window: Window & typeof globalThis;
  elb: Elb.Fn;
  settings: Settings;
  logger: Logger.Instance;
}

const V3_DEFAULT_EVENT_NAME = 'UC_UI_CMP_EVENT';

/**
 * Map a V3 CategoryData.state value to a walkerOS boolean.
 * ALL_DENIED → false; SOME_ACCEPTED or ALL_ACCEPTED → true.
 */
function categoryStateToBoolean(state: CategoryData['state']): boolean {
  return state !== 'ALL_DENIED';
}

/**
 * Build a synthetic UsercentricsEventDetail from V3 ConsentDetails.
 * Translates V3's structured consent state into the shape parseConsent expects.
 */
function buildDetailFromV3(details: ConsentDetails): UsercentricsEventDetail {
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

  const publishConsent = async (cmp: Usercentrics): Promise<void> => {
    const details = await cmp.getConsentDetails();
    const detail = buildDetailFromV3(details);
    logger.debug('event received', detail);

    if (settings.explicitOnly && detail.type !== 'explicit') return;

    const state = parseConsent(detail, settings);
    if (Object.keys(state).length > 0) {
      elb('walker consent', state);
    }
  };

  const listener = (): void => {
    const cmp = win.__ucCmp;
    if (!cmp) return;
    publishConsent(cmp).catch(() => {
      // Swallow — a failed V3 fetch should not break the page.
    });
  };
  win.addEventListener(eventName, listener);

  // Static check: if __ucCmp is already initialized, fetch now.
  const cmp = win.__ucCmp;
  if (cmp) {
    const initialized = await cmp.isInitialized();
    if (initialized) {
      await publishConsent(cmp);
    }
  }

  return () => {
    win.removeEventListener(eventName, listener);
  };
}
