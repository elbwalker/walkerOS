import type { WalkerOS } from '@walkerOS/core';
import type { AdsSettings, AdsMapping } from '../types';
import { isObject } from '@walkerOS/core';
import { getGtag } from '../shared/gtag';

export function pushAdsEvent(
  event: WalkerOS.Event,
  settings: AdsSettings,
  mapping: AdsMapping = {},
  data: WalkerOS.AnyObject,
  wrap: (name: string, fn: Function) => Function,
  mappingName?: string,
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

  const gtag = getGtag(wrap);
  gtag('event', 'conversion', params);
}
