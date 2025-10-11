import type { WalkerOS, On, Collector } from '@walkeros/core';
import type { Settings, Destination, ConsentMapping } from './types';
import { initGA4, pushGA4Event } from './ga4';
import { initAds, pushAdsEvent } from './ads';
import { initGTM, pushGTMEvent } from './gtm';
import { getData } from './shared/mapping';
import { initializeGtag } from './shared/gtag';
import { getEnv } from '@walkeros/web-core';

// Types
export * as DestinationGtag from './types';

// Examples
export * as examples from './examples';

// Track whether default consent has been set
let defaultConsentSet = false;

// For testing: allow resetting consent state
export function resetConsentState(): void {
  defaultConsentSet = false;
}

// Default consent mapping: walkerOS consent groups → gtag consent parameters
const DEFAULT_CONSENT_MAPPING: ConsentMapping = {
  marketing: ['ad_storage', 'ad_user_data', 'ad_personalization'],
  functional: ['analytics_storage'],
};

export const destinationGtag: Destination = {
  type: 'google-gtag',

  config: { settings: {} },

  init({ config, env }) {
    const { settings = {} as Partial<Settings>, loadScript } = config;
    const { ga4, ads, gtm } = settings;

    // Initialize GA4 if configured
    if (ga4?.measurementId) {
      initGA4(ga4, loadScript, env);
    }

    // Initialize Google Ads if configured
    if (ads?.conversionId) {
      initAds(ads, loadScript, env);
    }

    // Initialize GTM if configured
    if (gtm?.containerId) {
      initGTM(gtm, loadScript, env);
    }

    // Fail if no tools are configured
    if (!ga4?.measurementId && !ads?.conversionId && !gtm?.containerId) {
      return false;
    }

    return config;
  },

  async push(event, { config, mapping = {}, data, env, collector }) {
    const { settings = {} } = config;
    const { ga4, ads, gtm } = settings;
    const eventMapping = mapping.settings || {};

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
      pushGA4Event(event, ga4, eventMapping.ga4, ga4Data, env);
    }

    // @TODO: Fix condition - should check for mapping.settings?.ads?.label || mapping.name
    // Currently requires mapping.name even when label is provided via settings.ads.label
    if (ads?.conversionId && mapping.name) {
      pushAdsEvent(event, ads, eventMapping.ads, adsData, mapping.name, env);
    }

    // Push to GTM if configured
    if (gtm?.containerId) {
      pushGTMEvent(event, gtm, eventMapping.gtm, gtmData, env);
    }
  },

  on(type, context) {
    // Only handle consent events
    if (type !== 'consent' || !context) return;

    const consent = context;

    // Access config directly from this destination instance
    const settings = this.config?.settings || {};
    const { como = true } = settings;

    // Skip if consent mode is disabled
    if (!como) return;

    // Ensure gtag is available
    const { window } = getEnv(this.env);
    const gtag = initializeGtag(window as Window);
    if (!gtag) return;

    // Determine consent mapping to use
    const consentMapping: ConsentMapping =
      como === true ? DEFAULT_CONSENT_MAPPING : como;

    // If this is the first consent call, set default to denied for all parameters
    if (!defaultConsentSet) {
      // Get all possible gtag parameters from the mapping
      const allGtagParams = new Set<string>();
      Object.values(consentMapping).forEach((params) => {
        const paramArray = Array.isArray(params) ? params : [params];
        paramArray.forEach((param) => allGtagParams.add(param));
      });

      // Only call default if we have parameters to set
      if (allGtagParams.size > 0) {
        const defaultConsent: Record<string, 'denied'> = {};
        allGtagParams.forEach((param) => {
          defaultConsent[param] = 'denied';
        });

        // Call default with all denied
        gtag('consent', 'default', defaultConsent);
      }

      defaultConsentSet = true;
    }

    // Build gtag consent object for update
    const gtagConsent: Record<string, 'granted' | 'denied'> = {};

    // Map walkerOS consent to gtag consent parameters for update
    Object.entries(consent as WalkerOS.Consent).forEach(
      ([walkerOSGroup, granted]) => {
        const gtagParams = consentMapping[walkerOSGroup];
        if (!gtagParams) return;

        const params = Array.isArray(gtagParams) ? gtagParams : [gtagParams];
        const consentValue = granted ? 'granted' : 'denied';

        params.forEach((param) => {
          gtagConsent[param] = consentValue;
        });
      },
    );

    // Only proceed if we have consent parameters to update
    if (Object.keys(gtagConsent).length === 0) return;

    // Always use update after the initial default
    gtag('consent', 'update', gtagConsent);
  },
};

export default destinationGtag;
