import type { AdsSettings } from '../types';
import type { DestinationWeb } from '@walkeros/web-core';
import { addScript, initializeGtag } from '../shared/gtag';
import { getEnvironment } from '@walkeros/web-core';

export function initAds(
  settings: AdsSettings,
  loadScript?: boolean,
  env?: DestinationWeb.Environment,
): void {
  const { window, document } = getEnvironment(env);
  const { conversionId } = settings;

  if (!conversionId) return;

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
