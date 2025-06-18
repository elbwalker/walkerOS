import type { WalkerOS } from '@walkerOS/types';
import { assign } from './assign';

export interface MarketingParameters {
  [key: string]: string;
}

export function getMarketingParameters(
  url: URL,
  custom: MarketingParameters = {},
): WalkerOS.Properties {
  const clickId = 'clickId';
  const data: WalkerOS.Properties = {};
  const parameters: MarketingParameters = {
    utm_campaign: 'campaign',
    utm_content: 'content',
    utm_medium: 'medium',
    utm_source: 'source',
    utm_term: 'term',
    dclid: clickId,
    fbclid: clickId,
    gclid: clickId,
    msclkid: clickId,
    ttclid: clickId,
    twclid: clickId,
    igshid: clickId,
    sclid: clickId,
  };

  Object.entries(assign(parameters, custom)).forEach(([key, name]) => {
    const param = url.searchParams.get(key); // Search for the parameter in the URL
    if (param) {
      if (name === clickId) {
        name = key;
        data[clickId] = key; // Reference the clickId parameter
      }

      data[name] = param;
    }
  });

  return data;
}
