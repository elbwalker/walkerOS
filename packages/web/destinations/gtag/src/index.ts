import type { WalkerOS } from '@walkeros/core';
import type { Settings, Destination } from './types';
import { initGA4, pushGA4Event } from './ga4';
import { initAds, pushAdsEvent } from './ads';
import { initGTM, pushGTMEvent } from './gtm';
import { getData } from './shared/mapping';

// Types
export * as DestinationGtag from './types';

// Examples
export * as examples from './examples';

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
};

export default destinationGtag;
