import type { WalkerOS } from '@walkeros/core';
import type { AdsSettings, AdsMapping } from '../types';
import type { DestinationWeb } from '@walkeros/web-core';
import { isObject } from '@walkeros/core';
import { getEnvironment } from '@walkeros/web-core';

export function pushAdsEvent(
  event: WalkerOS.Event,
  settings: AdsSettings,
  mapping: AdsMapping = {},
  data: WalkerOS.AnyObject,
  mappingName?: string,
  env?: DestinationWeb.Environment,
): void {
  const { conversionId, currency } = settings;
  const eventData = isObject(data) ? data : {};

  // Use label from mapping settings, fallback to mappingName for backward compatibility
  const conversionLabel = mapping.label || mappingName;
  if (!conversionLabel) return;

  const params: Gtag.CustomParams = {
    send_to: `${conversionId}/${conversionLabel}`,
    currency: currency || 'EUR',
    ...eventData,
  };

  const { window } = getEnvironment(env);
  const gtag = window.gtag as Gtag.Gtag;
  gtag('event', 'conversion', params);
}
