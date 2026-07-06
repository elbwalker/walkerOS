import type { WalkerOS, On, Collector, Logger } from '@walkeros/core';
import type { Settings, Destination, Env, Config } from './types';
import { initGA4, pushGA4Event } from './ga4';
import { initAds, pushAdsEvent, resolveUserData } from './ads';
import { initGTM, pushGTMEvent } from './gtm';
import { getData } from './shared/mapping';
import {
  buildDefaultConsent,
  hasConsentSignal,
  resolveConsentMapping,
} from './shared/consent';
import { initializeGtag } from './shared/gtag';
import { isObject } from '@walkeros/core';
import { getEnv } from '@walkeros/web-core';

// Types
export * as DestinationGtag from './types';

// Track whether default consent has been set
let defaultConsentSet = false;

// For testing: allow resetting consent state
export function resetConsentState(): void {
  defaultConsentSet = false;
}

// Establish the Consent Mode v2 denied baseline BEFORE any tool's config call,
// per Google's required ordering. Gated on the destination's OWN config: a
// consent signal (config.consent set, or como_advanced) and como !== false.
// Idempotent via defaultConsentSet (consent state is window-global).
function setupConsentDefault(config: Config, env: Env | undefined): void {
  const settings = config.settings || {};
  if (defaultConsentSet) return;
  if (!hasConsentSignal(config.consent, settings)) return;

  const defaultConsent = buildDefaultConsent(settings);
  if (!defaultConsent) return; // como:false or no params

  const { window } = getEnv<Env>(env);
  const gtag = initializeGtag(window); // ensure stub exists before any config
  if (!gtag) return;

  gtag('consent', 'default', defaultConsent);
  defaultConsentSet = true;
}

export const destinationGtag: Destination = {
  type: 'google-gtag',

  // Observable env callable for trace-level vendor-call capture. Mirrors the
  // dev-env simulation list (src/examples/env.ts).
  calls: ['call:window.gtag'],

  config: { settings: {} },

  init({ config, env, logger }) {
    const { settings = {}, loadScript } = config;
    const { ga4, ads, gtm } = settings;

    // Fail if no tools are configured
    if (!ga4?.measurementId && !ads?.conversionId && !gtm?.containerId) {
      logger.throw(
        'Config settings missing. Set ga4.measurementId, ads.conversionId, or gtm.containerId',
      );
    }

    // Emit the denied consent default before any tool's config call.
    setupConsentDefault(config, env);

    // Initialize GA4 if configured
    if (ga4?.measurementId) {
      initGA4(ga4, loadScript, env, logger);
    }

    // Initialize Google Ads if configured
    if (ads?.conversionId) {
      initAds(ads, loadScript, env, logger);
    }

    // Initialize GTM if configured
    if (gtm?.containerId) {
      initGTM(gtm, loadScript, env, logger);
    }

    return config;
  },

  async push(event, { config, rule = {}, data, env, collector, logger }) {
    const { settings = {} } = config;
    const { ga4, ads, gtm } = settings;
    const eventMapping = rule.settings || {};

    // Resolve data for each tool with proper priority
    const ga4Data = await getData(
      event,
      data as WalkerOS.AnyObject,
      config,
      ga4,
      collector,
    );
    const adsData = await getData(
      event,
      data as WalkerOS.AnyObject,
      config,
      ads,
      collector,
    );
    const gtmData = await getData(
      event,
      data as WalkerOS.AnyObject,
      config,
      gtm,
      collector,
    );

    // Push to GA4 if configured
    if (ga4?.measurementId) {
      pushGA4Event(event, ga4, ga4Data, env, logger);
    }

    // Resolve enhanced conversions user data if configured
    let adsUserData: Record<string, unknown> | undefined;
    if (ads?.conversionId && ads?.enhancedConversions) {
      adsUserData = await resolveUserData(event, ads, collector);
    }

    // @TODO: Fix condition - should check for rule.settings?.ads?.label || rule.name
    // Currently requires rule.name even when label is provided via settings.ads.label
    if (ads?.conversionId && rule.name) {
      pushAdsEvent(
        event,
        ads,
        eventMapping.ads,
        adsData,
        rule.name,
        env,
        logger,
        adsUserData,
      );
    }

    // Push to GTM if configured
    if (gtm?.containerId) {
      pushGTMEvent(event, gtm, eventMapping.gtm, gtmData, env, logger);
    }
  },

  on(type, context) {
    // Only handle consent events
    if (type !== 'consent' || !isObject(context.data)) return;

    const consent = context.data;
    // `on` runs with the runtime (non-generic) context, so config.settings and
    // env surface as the loose base types. Narrowing them to this destination's
    // own Settings/Env needs a core-types change to make `on` generic over
    // Types; tracked as a follow-up. The two `as` casts mark that boundary.
    const settings = (context.config?.settings || {}) as Partial<Settings>;

    // Skip if consent mode is disabled (como === false)
    const mapping = resolveConsentMapping(settings);
    if (!mapping) return;

    // gtag is available after init() - on() is only called after init completes
    const { window } = getEnv<Env>(context.env as Env);
    const gtag = window.gtag;
    if (!gtag) return;

    // Safety net for setups that fire consent without init having seen a signal:
    // establish the denied default once before the first update.
    if (!defaultConsentSet) {
      const defaultConsent = buildDefaultConsent(settings);
      if (defaultConsent) gtag('consent', 'default', defaultConsent);
      defaultConsentSet = true;
    }

    // Build gtag consent object for update
    const gtagConsent: Record<string, 'granted' | 'denied'> = {};

    // Map walkerOS consent to gtag consent parameters for update
    Object.entries(consent).forEach(([walkerOSGroup, granted]) => {
      const gtagParams = mapping[walkerOSGroup];
      if (!gtagParams) return;

      const params = Array.isArray(gtagParams) ? gtagParams : [gtagParams];
      const consentValue = granted ? 'granted' : 'denied';

      params.forEach((param) => {
        gtagConsent[param] = consentValue;
      });
    });

    // Only proceed if we have consent parameters to update
    if (Object.keys(gtagConsent).length === 0) return;

    // Always use update after the initial default
    gtag('consent', 'update', gtagConsent);
  },
};

export default destinationGtag;
