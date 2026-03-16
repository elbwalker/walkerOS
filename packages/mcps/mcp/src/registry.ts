export interface PackageRegistryEntry {
  name: string;
  type: 'source' | 'destination' | 'transformer' | 'store';
  platform: 'web' | 'server' | 'universal';
  description: string;
}

export const PACKAGE_REGISTRY: PackageRegistryEntry[] = [
  // Web Destinations
  {
    name: '@walkeros/web-destination-gtag',
    type: 'destination',
    platform: 'web',
    description: 'Google destination (GA4, Ads, GTM via gtag.js)',
  },
  {
    name: '@walkeros/web-destination-meta',
    type: 'destination',
    platform: 'web',
    description: 'Meta (Facebook) Pixel',
  },
  {
    name: '@walkeros/web-destination-plausible',
    type: 'destination',
    platform: 'web',
    description: 'Plausible Analytics',
  },
  {
    name: '@walkeros/web-destination-snowplow',
    type: 'destination',
    platform: 'web',
    description: 'Snowplow Analytics',
  },
  {
    name: '@walkeros/web-destination-piwikpro',
    type: 'destination',
    platform: 'web',
    description: 'Piwik PRO Analytics',
  },
  {
    name: '@walkeros/web-destination-api',
    type: 'destination',
    platform: 'web',
    description: 'Generic HTTP API destination',
  },
  {
    name: '@walkeros/destination-demo',
    type: 'destination',
    platform: 'universal',
    description: 'Demo destination that logs events to console',
  },

  // Server Destinations
  {
    name: '@walkeros/server-destination-gcp',
    type: 'destination',
    platform: 'server',
    description: 'Google Cloud Platform (BigQuery)',
  },
  {
    name: '@walkeros/server-destination-aws',
    type: 'destination',
    platform: 'server',
    description: 'AWS (Firehose)',
  },
  {
    name: '@walkeros/server-destination-meta',
    type: 'destination',
    platform: 'server',
    description: 'Meta Conversions API (server-side)',
  },
  {
    name: '@walkeros/server-destination-api',
    type: 'destination',
    platform: 'server',
    description: 'Generic HTTP API destination (server)',
  },
  {
    name: '@walkeros/server-destination-datamanager',
    type: 'destination',
    platform: 'server',
    description: 'Google Data Manager',
  },

  // Web Sources
  {
    name: '@walkeros/web-source-browser',
    type: 'source',
    platform: 'web',
    description: 'Browser DOM event capture (clicks, page views, forms)',
  },
  {
    name: '@walkeros/web-source-datalayer',
    type: 'source',
    platform: 'web',
    description: 'Google Tag Manager dataLayer bridge',
  },
  {
    name: '@walkeros/web-source-session',
    type: 'source',
    platform: 'web',
    description: 'Session tracking source',
  },

  // CMP Sources
  {
    name: '@walkeros/web-source-cmp-cookiefirst',
    type: 'source',
    platform: 'web',
    description: 'CookieFirst consent management',
  },
  {
    name: '@walkeros/web-source-cmp-cookiepro',
    type: 'source',
    platform: 'web',
    description: 'CookiePro/OneTrust consent management',
  },
  {
    name: '@walkeros/web-source-cmp-usercentrics',
    type: 'source',
    platform: 'web',
    description: 'Usercentrics consent management',
  },

  // Server Sources
  {
    name: '@walkeros/server-source-express',
    type: 'source',
    platform: 'server',
    description: 'Express.js HTTP event endpoint',
  },
  {
    name: '@walkeros/server-source-fetch',
    type: 'source',
    platform: 'server',
    description: 'Web Fetch API source (Cloudflare, Vercel Edge, Deno, Bun)',
  },
  {
    name: '@walkeros/server-source-aws',
    type: 'source',
    platform: 'server',
    description: 'AWS sources (Lambda, API Gateway, Function URLs)',
  },
  {
    name: '@walkeros/server-source-gcp',
    type: 'source',
    platform: 'server',
    description: 'GCP sources (Cloud Functions)',
  },

  // Transformers
  {
    name: '@walkeros/transformer-router',
    type: 'transformer',
    platform: 'universal',
    description: 'Route events to different destination subsets',
  },
  {
    name: '@walkeros/transformer-validator',
    type: 'transformer',
    platform: 'universal',
    description: 'Event validation using JSON Schema',
  },
  {
    name: '@walkeros/server-transformer-fingerprint',
    type: 'transformer',
    platform: 'server',
    description: 'Device fingerprinting for anonymous user identification',
  },
  {
    name: '@walkeros/server-transformer-cache',
    type: 'transformer',
    platform: 'server',
    description: 'HTTP response caching with LRU eviction',
  },
  {
    name: '@walkeros/server-transformer-file',
    type: 'transformer',
    platform: 'server',
    description: 'File serving transformer for static files',
  },

  // Stores
  {
    name: '@walkeros/store-memory',
    type: 'store',
    platform: 'universal',
    description: 'In-memory key-value store with LRU eviction and TTL',
  },
  {
    name: '@walkeros/server-store-fs',
    type: 'store',
    platform: 'server',
    description: 'File system key-value store',
  },
  {
    name: '@walkeros/server-store-s3',
    type: 'store',
    platform: 'server',
    description: 'AWS S3 key-value store',
  },
  {
    name: '@walkeros/server-store-gcs',
    type: 'store',
    platform: 'server',
    description: 'Google Cloud Storage key-value store',
  },
];

export function filterRegistry(filters?: {
  type?: string;
  platform?: string;
}): PackageRegistryEntry[] {
  let results = PACKAGE_REGISTRY;
  if (filters?.type) {
    results = results.filter((p) => p.type === filters.type);
  }
  if (filters?.platform) {
    results = results.filter(
      (p) => p.platform === filters.platform || p.platform === 'universal',
    );
  }
  return results;
}
