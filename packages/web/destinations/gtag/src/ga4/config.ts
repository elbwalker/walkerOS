import type { WalkerOS, Logger } from '@walkeros/core';
import type { GA4Settings, Env } from '../types';
import { addScript, initializeGtag } from '../shared/gtag';
import { getEnv } from '@walkeros/web-core';

export function initGA4(
  settings: GA4Settings,
  loadScript: boolean | undefined,
  env: Env | undefined,
  logger: Logger.Instance,
): void {
  const { window, document } = getEnv<Env>(env);
  const { measurementId, transport_url, server_container_url, pageview } =
    settings;

  if (!measurementId) logger.throw('Config settings ga4.measurementId missing');

  // Load the gtag script
  if (loadScript) addScript(measurementId, undefined, document);

  // Initialize gtag infrastructure
  initializeGtag(window);

  const gtagSettings: WalkerOS.AnyObject = {};

  // custom transport_url
  if (transport_url) gtagSettings.transport_url = transport_url;

  // custom server_container_url
  if (server_container_url)
    gtagSettings.server_container_url = server_container_url;

  // disable pageviews
  if (pageview === false) gtagSettings.send_page_view = false;

  const gtag = window.gtag!;
  gtag('js', new Date());

  // gtag init call
  gtag('config', measurementId, gtagSettings);
}
