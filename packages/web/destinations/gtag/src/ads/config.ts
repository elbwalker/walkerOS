import type { Logger } from '@walkeros/core';
import type { AdsSettings, Env } from '../types';
import { addScript, initializeGtag } from '../shared/gtag';
import { getEnv } from '@walkeros/web-core';

export function initAds(
  settings: AdsSettings,
  loadScript: boolean | undefined,
  env: Env | undefined,
  logger: Logger.Instance,
): void {
  const { window, document } = getEnv<Env>(env);
  const { conversionId } = settings;

  if (!conversionId) logger.throw('Config settings ads.conversionId missing');

  // Default currency value
  if (!settings.currency) settings.currency = 'EUR';

  if (loadScript) addScript(conversionId, undefined, document);

  // Initialize gtag infrastructure
  initializeGtag(window);

  const gtag = window.gtag!;
  gtag('js', new Date());

  // gtag init call
  if (settings.enhancedConversions) {
    gtag('config', conversionId, { allow_enhanced_conversions: true });
  } else {
    gtag('config', conversionId);
  }
}
