import type { Elb, Logger } from '@walkeros/core';
import type {
  Settings,
  UsercentricsEventDetail,
  UsercentricsV2Service,
} from '../types';
import { parseConsent } from './parseConsent';

export interface V2AdapterContext {
  window: Window & typeof globalThis;
  elb: Elb.Fn;
  settings: Settings;
  logger: Logger.Instance;
}

/**
 * Aggregate V2 service array into a group-level ucCategory object using strict
 * AND logic. A category is `true` only if EVERY service in that category is
 * accepted. Any single denied service denies the whole category — this
 * matches the consent rule of thumb: any deny signal denies.
 */
function aggregateByCategory(
  services: UsercentricsV2Service[],
): Record<string, boolean> {
  const categories: Record<string, boolean> = {};
  services.forEach((service) => {
    const category = service.categorySlug;
    const status = service.consent?.status ?? false;
    categories[category] =
      categories[category] === undefined
        ? status
        : categories[category] && status;
  });
  return categories;
}

/**
 * Build a synthetic UsercentricsEventDetail from the V2 static API.
 * Marked as 'implicit' because UC_UI.isInitialized() === true does NOT prove
 * the read was user-initiated — it only proves the SDK has finished loading.
 * With settings.explicitOnly = true (the default), consumers correctly drop
 * this detail. Set explicitOnly = false to surface the static snapshot.
 */
function buildDetailFromStatic(
  services: UsercentricsV2Service[],
): UsercentricsEventDetail {
  return {
    event: 'consent_status',
    type: 'implicit',
    ucCategory: aggregateByCategory(services),
  };
}

/**
 * Set up the V2 adapter: listens on the configured event AND performs a
 * static read if UC_UI is already initialized.
 *
 * Returns a cleanup function that removes the event listener.
 */
export function setupV2Adapter(ctx: V2AdapterContext): () => void {
  const { window: win, elb, settings, logger } = ctx;
  const eventName = settings.eventName ?? 'ucEvent';

  const handleDetail = (detail: UsercentricsEventDetail) => {
    logger.debug('event received', detail);

    if (detail.event !== 'consent_status') return;
    if (settings.explicitOnly && detail.type?.toLowerCase() !== 'explicit')
      return;

    const state = parseConsent(detail, settings);
    if (Object.keys(state).length > 0) {
      elb('walker consent', state);
    }
  };

  const listener = (e: Event) => {
    const custom = e as CustomEvent<UsercentricsEventDetail>;
    if (custom.detail) handleDetail(custom.detail);
  };
  win.addEventListener(eventName, listener);

  // Static check: if UC_UI is already initialized, read current consent now.
  const api = win.UC_UI;
  if (api?.isInitialized?.() && api.getServicesBaseInfo) {
    const services = api.getServicesBaseInfo();
    if (services.length > 0) {
      handleDetail(buildDetailFromStatic(services));
    }
  }

  return () => {
    win.removeEventListener(eventName, listener);
  };
}
