import type { WalkerOS } from '@elbwalker/types';

export interface MarketingParameters {
  [key: string]: string;
}

export function getMarketingParameters(
  url: URL,
  custom: MarketingParameters = {},
): WalkerOS.Properties {
  const data: WalkerOS.Properties = {};
  const parameters = Object.assign(
    {
      utm_campaign: 'campaign',
      utm_content: 'content',
      dclid: 'clickId',
      fbclid: 'clickId',
      gclid: 'clickId',
      utm_medium: 'medium',
      msclkid: 'clickId',
      utm_source: 'source',
      utm_term: 'term',
    },
    custom,
  );

  Object.entries(parameters).forEach(([param, name]) => {
    const value = url.searchParams.get(param);
    if (value) data[name] = value;
  });

  return data;
}
