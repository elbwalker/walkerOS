import type { Logger } from '@walkeros/core';
import type { AdsSettings } from '../types';
import type { DestinationWeb } from '@walkeros/web-core';
import { addScript, initializeGtag } from '../shared/gtag';
import { getEnv } from '@walkeros/web-core';

export function initAds(
  settings: AdsSettings,
  loadScript: boolean | undefined,
  env: DestinationWeb.Env | undefined,
  logger: Logger.Instance,
): void {
  const { window, document } = getEnv(env);
  const { conversionId } = settings;

  if (!conversionId) logger.throw('Config settings ads.conversionId missing');

  // Default currency value
  if (!settings.currency) settings.currency = 'EUR';

  if (loadScript) addScript(conversionId, undefined, document as Document);

  // Initialize gtag infrastructure
  initializeGtag(window as Window);

  const gtag = window.gtag as Gtag.Gtag;
  gtag('js', new Date());

  // gtag init call
  gtag('config', conversionId);
}
