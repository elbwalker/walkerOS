// Google Ads
export { destinationAds } from './src/ads';
export * as DestinationAds from './src/ads/types';

// Google Analytics 4
export { destinationGA4 } from './src/ga4';
export * as DestinationGA4 from './src/ga4/types';

// Re-export everything for backward compatibility
export * from './src/ads';
export * from './src/ga4';