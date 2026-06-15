import type { Elb, Logger } from '@walkeros/core';
import type {
  Settings,
  UsercentricsEventDetail,
  UsercentricsV2Service,
  UsercentricsV3CmpEventDetail,
} from '../types';
import { parseConsent } from './parseConsent';

export interface V2AdapterContext {
  window: Window & typeof globalThis;
  elb: Elb.Fn;
  settings: Settings;
  logger: Logger.Instance;
}

/**
 * V3 CMP event `type` values that signal a real user decision. Other event
 * types (e.g. CMP_SHOWN, VIEW_CHANGED) carry no consent decision and are
 * ignored so the adapter only re-reads after an actual choice.
 */
const V2_DECISION_TYPES: ReadonlySet<string> = new Set([
  'ACCEPT_ALL',
  'DENY_ALL',
  'SAVE',
]);

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
 * Whether any service carries an `explicit` entry in its consent history. An
 * explicit entry is Usercentrics' own proof that the user actively decided
 * (vs an implicit page-load default), so it correctly surfaces returning
 * visitors whose stored decision was explicit.
 */
export function hasExplicitDecision(
  services: UsercentricsV2Service[],
): boolean {
  return services.some((s) =>
    (s.consent.history ?? []).some((h) => h.type?.toLowerCase() === 'explicit'),
  );
}

/**
 * Build a synthetic UsercentricsEventDetail from the V2 services array. The
 * `type` is derived from Usercentrics' own consent history: `explicit` when any
 * service records an explicit decision, `implicit` otherwise. Per-service name
 * keys are surfaced so parseConsent can map service-level consent.
 */
export function buildDetailFromServices(
  services: UsercentricsV2Service[],
): UsercentricsEventDetail {
  const detail: UsercentricsEventDetail = {
    event: 'consent_status',
    type: hasExplicitDecision(services) ? 'explicit' : 'implicit',
    ucCategory: aggregateByCategory(services),
  };
  services.forEach((s) => {
    if (s.name) detail[s.name] = s.consent.status;
  });
  return detail;
}

/**
 * Set up the V2 adapter using Usercentrics' official events and getter.
 *
 * A single gated `read()` is reused by all triggers: the official
 * `UC_UI_INITIALIZED` lifecycle event, the official `UC_UI_CMP_EVENT` decision
 * events (filtered to real decisions), and a static read at setup time for the
 * common case where the CMP is already initialized when the source runs.
 *
 * Returns a cleanup function that removes both event listeners.
 */
export function setupV2Adapter(ctx: V2AdapterContext): () => void {
  const { window: win, elb, settings, logger } = ctx;

  const read = (): void => {
    const api = win.UC_UI;
    if (!api?.getServicesBaseInfo) return;
    // isInitialized is optional on the V2 API; only honor it when present.
    // Hard-gating on it would suppress all consent on deployments that expose
    // getServicesBaseInfo without isInitialized.
    if (api.isInitialized && !api.isInitialized()) return;
    const services = api.getServicesBaseInfo();
    if (!services.length) return;
    const detail = buildDetailFromServices(services);
    logger.debug('consent read', detail);
    if (settings.explicitOnly && detail.type !== 'explicit') return;
    const state = parseConsent(detail, settings);
    if (Object.keys(state).length > 0) elb('walker consent', state);
  };

  const onInitialized = (): void => read();
  const onCmpEvent = (e: Event): void => {
    const detail = (e as CustomEvent<UsercentricsV3CmpEventDetail>).detail;
    if (!detail?.type || !V2_DECISION_TYPES.has(detail.type)) return;
    read();
  };

  win.addEventListener('UC_UI_INITIALIZED', onInitialized);
  win.addEventListener('UC_UI_CMP_EVENT', onCmpEvent);

  read(); // static read: CMP already initialized when source runs

  return () => {
    win.removeEventListener('UC_UI_INITIALIZED', onInitialized);
    win.removeEventListener('UC_UI_CMP_EVENT', onCmpEvent);
  };
}
