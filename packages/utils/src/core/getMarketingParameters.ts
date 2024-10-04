import type { WalkerOS } from '@elbwalker/types';

export interface MarketingParameters {
  [key: string]: string | [key: string, platform: string];
}

export function getMarketingParameters(
  url: URL,
  custom: MarketingParameters = {},
): WalkerOS.Properties {
  const data: WalkerOS.Properties = {};
  const clickId = 'clickId';
  const parameters: MarketingParameters = Object.assign(
    {
      utm_campaign: 'campaign',
      utm_content: 'content',
      utm_medium: 'medium',
      utm_source: 'source',
      utm_term: 'term',
      dclid: [clickId, 'google'],
      fbclid: [clickId, 'meta'],
      gclid: [clickId, 'google'],
      msclkid: [clickId, 'microsoft'],
      ttclid: [clickId, 'tiktok'],
      twclid: [clickId, 'twitter'],
      igshid: [clickId, 'meta'],
      sclid: [clickId, 'snapchat'],
    },
    custom,
  );

  Object.entries(parameters).forEach(([key, mapping]) => {
    const param = url.searchParams.get(key); // Search for the parameter in the URL
    if (param) {
      const [name, platform] = Array.isArray(mapping) ? mapping : [mapping];
      data[name] = param;
      if (platform) data.platform = platform;
    }
  });

  return data;
}
