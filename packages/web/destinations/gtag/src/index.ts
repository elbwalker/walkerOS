import type { WalkerOS } from '@walkeros/core';
import type { Settings, Destination } from './types';
import { initGA4, pushGA4Event } from './ga4';
import { initAds, pushAdsEvent } from './ads';
import { initGTM, pushGTMEvent } from './gtm';

// Types
export * as DestinationGtag from './types';

// Examples
export * as examples from './examples';

export const destinationGtag: Destination = {
  type: 'google-gtag',

  config: { settings: {} },

  init({ config, wrap }) {
    const { settings = {} as Partial<Settings>, loadScript } = config;
    const { ga4, ads, gtm } = settings;

    // Initialize GA4 if configured
    if (ga4?.measurementId) {
      initGA4(ga4, wrap, loadScript);
    }

    // Initialize Google Ads if configured
    if (ads?.conversionId) {
      initAds(ads, wrap, loadScript);
    }

    // Initialize GTM if configured
    if (gtm?.containerId) {
      initGTM(gtm, wrap, loadScript);
    }

    // Fail if no tools are configured
    if (!ga4?.measurementId && !ads?.conversionId && !gtm?.containerId) {
      return false;
    }

    return config;
  },

  push(event, { config, mapping = {}, data, wrap }) {
    const { settings = {} } = config;
    const { ga4, ads, gtm } = settings;
    const eventMapping = mapping.settings || {};

    // Push to GA4 if configured
    if (ga4?.measurementId) {
      pushGA4Event(
        event,
        ga4,
        eventMapping.ga4,
        data as WalkerOS.AnyObject,
        wrap,
      );
    }

    // Push to Google Ads if configured and has mapping name
    if (ads?.conversionId && mapping.name) {
      pushAdsEvent(
        event,
        ads,
        eventMapping.ads,
        data as WalkerOS.AnyObject,
        wrap,
        mapping.name,
      );
    }

    // Push to GTM if configured
    if (gtm?.containerId) {
      pushGTMEvent(
        event,
        gtm,
        eventMapping.gtm,
        data as WalkerOS.AnyObject,
        wrap,
      );
    }
  },
};

export default destinationGtag;
