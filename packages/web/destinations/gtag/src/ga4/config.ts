import type { WalkerOS, Logger } from '@walkeros/core';
import type { GA4Settings, Env } from '../types';
import { addScript, initializeGtag } from '../shared/gtag';
import { getEnv } from '@walkeros/web-core';

export function initGA4(
  settings: GA4Settings,
  loadScript: boolean | undefined,
  env: Env | undefined,
  logger: Logger.Instance,
  // True when gtag was already initialised by something else, e.g. a tag
  // manager. Observed once before walkerOS touches the window.
  gtagExternal = false,
): void {
  const { window, document } = getEnv<Env>(env);
  const {
    measurementId,
    transport_url,
    server_container_url,
    scriptSrc,
    pageview,
    init,
  } = settings;

  if (!measurementId) logger.throw('Config settings ga4.measurementId missing');

  // Ensure the gtag stub exists either way, so events can queue.
  initializeGtag(window);

  // `init: false` hands the gtag bootstrap to an external tag manager, which
  // configures this measurement ID itself. walkerOS then only sends events,
  // routed by `send_to`. Loading the script or issuing a second, later
  // `config` would override the identity the container already established.
  if (init === false) return;

  // Load the gtag script. `server_container_url` routes measurement data and
  // says nothing about script delivery, so first-party serving needs its own
  // `scriptSrc` pointing at the container's configured tag serving path.
  if (loadScript) addScript(measurementId, scriptSrc, document);

  const gtagSettings: WalkerOS.AnyObject = {};

  // custom transport_url
  if (transport_url) gtagSettings.transport_url = transport_url;

  // custom server_container_url
  if (server_container_url)
    gtagSettings.server_container_url = server_container_url;

  // disable pageviews
  if (pageview === false) gtagSettings.send_page_view = false;

  const gtag = window.gtag!;

  // `js` announces that gtag initialised here. If an external tag manager
  // already bootstrapped it, a second one carries a false, later timestamp.
  if (!gtagExternal) gtag('js', new Date());

  // gtag init call
  gtag('config', measurementId, gtagSettings);
}
