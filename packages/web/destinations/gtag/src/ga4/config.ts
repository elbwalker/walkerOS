import type { WalkerOS } from '@walkeros/core';
import type { GA4Settings } from '../types';
import type { DestinationWeb } from '@walkeros/web-core';
import { addScript, initializeGtag } from '../shared/gtag';
import { getEnvironment } from '@walkeros/web-core';

export function initGA4(
  settings: GA4Settings,
  loadScript?: boolean,
  env?: DestinationWeb.Environment,
): void {
  const { window, document } = getEnvironment(env);
  const { measurementId, transport_url, server_container_url, pageview } =
    settings;

  if (!measurementId) return;

  // Load the gtag script
  if (loadScript) addScript(measurementId, undefined, document as Document);

  // Initialize gtag infrastructure
  initializeGtag(window as Window);

  const gtagSettings: WalkerOS.AnyObject = {};

  // custom transport_url
  if (transport_url) gtagSettings.transport_url = transport_url;

  // custom server_container_url
  if (server_container_url)
    gtagSettings.server_container_url = server_container_url;

  // disable pageviews
  if (pageview === false) gtagSettings.send_page_view = false;

  const gtag = window.gtag as Gtag.Gtag;
  gtag('js', new Date());

  // gtag init call
  gtag('config', measurementId, gtagSettings);
}
