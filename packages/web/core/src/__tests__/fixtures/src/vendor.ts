import { isObject, StepError } from '@walkeros/core';
import type { Collector, Destination, On } from '@walkeros/core';
import { VENDOR_SCRIPT_MARKER } from '../../../loadVendor';

/**
 * Vendor destinations that load a script into the page, for the kit's
 * vendor-global checks on `page` (item 6 scans this folder).
 */

export interface Vendor {
  track(name: string, site?: string): void | Promise<void>;
  consent(granted: boolean): void;
}

type Types = Destination.Types<
  { site?: string },
  unknown,
  { vendor?: Vendor; document?: Document }
>;

function isVendor(value: unknown): value is Vendor {
  return (
    isObject(value) &&
    typeof value.track === 'function' &&
    typeof value.consent === 'function'
  );
}

/** Passes a consent change to its vendor (item 8). */
const passConsent: On.OnFn = (type, { env, data }) => {
  const vendor = env.vendor;
  if (type !== 'consent' || !isVendor(vendor) || !isObject(data)) return;
  vendor.consent(data.marketing === true);
};

/** Calls the vendor global and reports its failure (`transport`). */
async function track(
  name: string,
  { config, env }: Destination.PushContext<Types>,
): Promise<void> {
  if (!env.vendor)
    throw new StepError('Vendor not ready', { code: 'vendor-not-ready' });
  try {
    await env.vendor.track(name, config.settings?.site);
  } catch (error) {
    throw new StepError('Vendor call failed', {
      code: 'transport',
      cause: error,
    });
  }
}

/** Whether a page's vendor script fired `error`, per collector (one page). */
const scriptFailed = new WeakMap<Collector.Instance, boolean>();

/**
 * Loads its vendor script as loadVendor does (marked, awaited): a push
 * waits for the script and fails `vendor-timeout` at a short deadline (jsdom
 * never loads it), and once the script fired `error` every push fails
 * `vendor-not-loaded`: two causes, one line each.
 */
export const scriptVendor: Destination.Instance<Types> = {
  type: 'script-vendor',
  config: {},
  init: ({ collector }) => {
    const script = document.createElement('script');
    script.src = 'https://vendor.example/sdk.js';
    script.setAttribute(VENDOR_SCRIPT_MARKER, '');
    script.addEventListener('error', () => scriptFailed.set(collector, true));
    document.head.appendChild(script);
  },
  push: async (_, { collector, rule }) => {
    if (rule?.silent) return;
    if (scriptFailed.get(collector))
      throw new StepError('Vendor script failed to load', {
        code: 'vendor-not-loaded',
      });
    await new Promise<never>((__, reject) =>
      setTimeout(
        () =>
          reject(
            new StepError('Vendor script did not load within 50ms', {
              code: 'vendor-timeout',
            }),
          ),
        50,
      ),
    );
  },
  on: passConsent,
};

/** A script's error, kept with its element (the page is the registry). */
const failedScripts = new WeakSet<Element>();

/**
 * Injects its marked script once per page, as loadVendor does (a marked
 * script with its src already on the page is the injected one), into the
 * env's document where it has one, with `loadScript` on by default. A push
 * calls the vendor and, with `reports`, fails `vendor-not-loaded` once the
 * script fired `error`.
 */
function pageScript(reports: boolean): Destination.Instance<Types> {
  const src = 'https://vendor.example/page.js';
  const scriptOnPage = (doc: Document) =>
    Array.from(doc.querySelectorAll(`script[${VENDOR_SCRIPT_MARKER}]`)).find(
      (script) => script.getAttribute('src') === src,
    );
  return {
    type: reports ? 'page-script' : 'page-script-ignoring',
    config: { loadScript: true },
    init: ({ config, env }) => {
      const doc = env.document ?? document;
      if (!config.loadScript || scriptOnPage(doc)) return;
      const script = doc.createElement('script');
      script.src = src;
      script.setAttribute(VENDOR_SCRIPT_MARKER, '');
      script.addEventListener('error', () => failedScripts.add(script));
      doc.head.appendChild(script);
    },
    push: async (event, context) => {
      const script = scriptOnPage(context.env.document ?? document);
      if (reports && script && failedScripts.has(script))
        throw new StepError('Vendor script failed to load', {
          code: 'vendor-not-loaded',
        });
      if (context.rule?.silent) return;
      await track(event.name, context);
    },
    on: passConsent,
  };
}

export const pageScriptVendor = pageScript(true);
export const pageScriptIgnoring = pageScript(false);

/** Loads its marked script plus a helper script without the marker (item 1). */
export const unmarkedScriptVendor: Destination.Instance<Types> = {
  ...pageScriptVendor,
  type: 'unmarked-script',
  init: (context) => {
    pageScriptVendor.init?.(context);
    const helper = document.createElement('script');
    helper.src = 'https://vendor.example/helper.js';
    document.head.appendChild(helper);
  },
};
