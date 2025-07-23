import type { AdsSettings } from '../types';
import { addScript, initializeGtag, getGtag } from '../shared/gtag';

export function initAds(
  settings: AdsSettings,
  wrap: (name: string, fn: Function) => Function,
  loadScript?: boolean,
): void {
  const { conversionId } = settings;

  if (!conversionId) return;

  // Default currency value
  if (!settings.currency) settings.currency = 'EUR';

  if (loadScript) addScript(conversionId);

  // Initialize gtag infrastructure
  initializeGtag();

  const gtag = getGtag(wrap);
  gtag('js', new Date());

  // gtag init call
  gtag('config', conversionId);
}
