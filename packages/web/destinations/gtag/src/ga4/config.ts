import type { WalkerOS } from '@walkeros/core';
import type { GA4Settings } from '../types';
import { addScript, initializeGtag, getGtag } from '../shared/gtag';

export function initGA4(
  settings: GA4Settings,
  wrap: (name: string, fn: Function) => Function,
  loadScript?: boolean,
): void {
  const { measurementId, transport_url, server_container_url, pageview } =
    settings;

  if (!measurementId) return;

  // Load the gtag script
  if (loadScript) addScript(measurementId);

  // Initialize gtag infrastructure
  initializeGtag();

  const gtagSettings: WalkerOS.AnyObject = {};

  // custom transport_url
  if (transport_url) gtagSettings.transport_url = transport_url;

  // custom server_container_url
  if (server_container_url)
    gtagSettings.server_container_url = server_container_url;

  // disable pageviews
  if (pageview === false) gtagSettings.send_page_view = false;

  const gtag = getGtag(wrap);
  gtag('js', new Date());

  // gtag init call
  gtag('config', measurementId, gtagSettings);
}
