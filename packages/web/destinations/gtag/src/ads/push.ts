import type { WalkerOS, Logger } from '@walkeros/core';
import type { AdsSettings, AdsMapping } from '../types';
import type { DestinationWeb } from '@walkeros/web-core';
import { isObject, StepError } from '@walkeros/core';
import { getEnv } from '@walkeros/web-core';

export function pushAdsEvent(
  event: WalkerOS.Event,
  settings: AdsSettings,
  mapping: AdsMapping = {},
  data: unknown,
  mappingName: string | undefined,
  env: DestinationWeb.Env | undefined,
  _logger: Logger.Instance,
  userData?: Record<string, unknown>,
): unknown[] {
  const { conversionId, currency } = settings;
  const eventData = isObject(data) ? data : {};

  // Use label from mapping settings, fallback to mappingName for backward compatibility
  const conversionLabel = mapping.label || mappingName;
  if (!conversionLabel)
    throw new StepError('Config mapping ads.label missing', { code: 'config' });

  const params: Gtag.CustomParams = {
    send_to: `${conversionId}/${conversionLabel}`,
    currency: currency || 'EUR',
    ...eventData,
  };

  const { window } = getEnv(env);
  const gtag = window.gtag as Gtag.Gtag;

  // Set user data for enhanced conversions (must be before conversion event)
  const calls: unknown[] = [];
  if (userData) calls.push(gtag('set', 'user_data', userData));

  calls.push(gtag('event', 'conversion', params));
  return calls;
}
