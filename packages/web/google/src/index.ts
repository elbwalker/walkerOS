// Google Ads
export { destinationAds } from './ads';
export * as DestinationAds from './ads/types';

// Google Analytics 4
export { destinationGA4 } from './ga4';
export * as DestinationGA4 from './ga4/types';

// Google Tag Manager
export { destinationGTM } from './gtm';
export * as DestinationGTM from './gtm/types';

// Google DataLayer Source
export { sourceDataLayer } from './datalayer';
export * as SourceDataLayer from './datalayer/types';

// Re-export everything for backward compatibility
export * from './ads';
export * from './ga4';
export * from './gtm';
export * from './datalayer';