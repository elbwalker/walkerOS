import type { WalkerOS, Logger } from '@walkeros/core';
import type { AdsSettings, AdsMapping } from '../types';
import type { DestinationWeb } from '@walkeros/web-core';
import { isObject } from '@walkeros/core';
import { getEnv } from '@walkeros/web-core';

export function pushAdsEvent(
  event: WalkerOS.Event,
  settings: AdsSettings,
  mapping: AdsMapping = {},
  data: WalkerOS.AnyObject,
  mappingName: string | undefined,
  env: DestinationWeb.Env | undefined,
  logger: Logger.Instance,
): void {
  const { conversionId, currency } = settings;
  const eventData = isObject(data) ? data : {};

  // Use label from mapping settings, fallback to mappingName for backward compatibility
  const conversionLabel = mapping.label || mappingName;
  if (!conversionLabel) logger.throw('Config mapping ads.label missing');

  const params: Gtag.CustomParams = {
    send_to: `${conversionId}/${conversionLabel}`,
    currency: currency || 'EUR',
    ...eventData,
  };

  const { window } = getEnv(env);
  const gtag = window.gtag as Gtag.Gtag;
  gtag('event', 'conversion', params);
}
