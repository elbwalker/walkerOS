import type { Logger } from '@walkeros/core';
import type { AdsSettings, Env } from '../types';
import { StepError } from '@walkeros/core';
import { initializeGtag, loadGtag } from '../shared/gtag';
import { getEnv } from '@walkeros/web-core';

export function initAds(
  settings: AdsSettings,
  loadScript: boolean | undefined,
  env: Env | undefined,
  _logger: Logger.Instance,
  gtagExternal = false,
  // The destination's timeout, the deadline of the injected script.
  timeout?: number,
): unknown[] {
  const { window } = getEnv<Env>(env);
  const { conversionId } = settings;

  if (!conversionId)
    throw new StepError('Config settings ads.conversionId missing', {
      code: 'config',
    });

  // Default currency value
  if (!settings.currency) settings.currency = 'EUR';

  if (loadScript) loadGtag(conversionId, undefined, timeout, env);

  // Initialize gtag infrastructure
  initializeGtag(window);

  const gtag = window.gtag!;
  const calls: unknown[] = [];

  // See ga4/config.ts: only signal initialisation if walkerOS did it.
  if (!gtagExternal) calls.push(gtag('js', new Date()));

  // gtag init call
  if (settings.enhancedConversions) {
    calls.push(
      gtag('config', conversionId, { allow_enhanced_conversions: true }),
    );
  } else {
    calls.push(gtag('config', conversionId));
  }
  return calls;
}
