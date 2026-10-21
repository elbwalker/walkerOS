import { isObject, StepError } from '@walkeros/core';
import type { Collector } from '@walkeros/core';
import type { Destination } from '@walkeros/core';

export interface Vendor {
  init(site: string): void | Promise<void>;
  track(name: string, site?: string): void | Promise<void>;
  consent(granted: boolean): void;
}

type Types = Destination.Types<{ site?: string }, unknown, { vendor?: Vendor }>;

function isVendor(value: unknown): value is Vendor {
  return (
    isObject(value) &&
    typeof value.track === 'function' &&
    typeof value.consent === 'function'
  );
}

function vendorOf(env: { vendor?: Vendor }): Vendor {
  if (!env.vendor)
    throw new StepError('Vendor not ready', { code: 'vendor-not-ready' });
  return env.vendor;
}

/** Calls a vendor global; passes consent to it and honours `silent`. */
export const vendorGlobal: Destination.Instance<Types> = {
  type: 'vendor',
  config: {},
  push: async (event, { config, env, rule }) => {
    if (rule?.silent) return;
    try {
      await vendorOf(env).track(event.name, config.settings?.site);
    } catch (error) {
      if (error instanceof StepError) throw error;
      throw new StepError('Vendor call failed', {
        code: 'transport',
        cause: error,
      });
    }
  },
  on: (type, { env, data }) => {
    const vendor = env.vendor;
    if (type !== 'consent' || !isVendor(vendor) || !isObject(data)) return;
    vendor.consent(data.marketing === true);
  },
};

/**
 * Starts its vendor SDK in `init` and awaits it, as fullstory's `fs.init`;
 * a failed start throws `vendor-not-ready`. It requires marketing consent,
 * so the collector initializes it inside the first input that grants it.
 */
export const initCalling: Destination.Instance<Types> = {
  ...vendorGlobal,
  type: 'init-calling',
  config: { consent: { marketing: true } },
  init: async ({ config, env }) => {
    if (!env.vendor) return;
    try {
      await env.vendor.init(config.settings?.site ?? '');
    } catch (error) {
      throw new StepError('Vendor did not start', {
        code: 'vendor-not-ready',
        cause: error,
      });
    }
  },
};

/** Swallows a failed start and a failed call: nothing is reported (item 2). */
export const swallowingSdk: Destination.Instance<Types> = {
  ...vendorGlobal,
  type: 'swallowing-sdk',
  config: {},
  init: async ({ config, env }) => {
    await Promise.resolve(env.vendor?.init(config.settings?.site ?? '')).catch(
      () => undefined,
    );
  },
  push: async (event, { config, env, rule }) => {
    if (rule?.silent) return;
    await Promise.resolve(
      env.vendor?.track(event.name, config.settings?.site),
    ).catch(() => undefined);
  },
};

/**
 * Follows its own `config.consent` at the vendor: on a consent change it
 * tells the vendor whether every key it requires is still granted.
 */
export const consentAware: Destination.Instance<Types> = {
  ...vendorGlobal,
  type: 'consent-aware',
  on: (type, { config, env, data }) => {
    const vendor = env.vendor;
    if (type !== 'consent' || !isVendor(vendor) || !isObject(data)) return;
    const required = Object.keys(config.consent ?? {});
    vendor.consent(required.every((key) => data[key] === true));
  },
};

/** Ignores a revocation: the vendor keeps collecting on its own (I1). */
export const consentIgnoring: Destination.Instance<Types> = {
  ...vendorGlobal,
  type: 'consent-ignoring',
  on: undefined,
};

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
    script.setAttribute('data-walkeros-vendor', '');
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
  on: (type, { env, data }) => {
    const vendor = env.vendor;
    if (type !== 'consent' || !isVendor(vendor) || !isObject(data)) return;
    vendor.consent(data.marketing === true);
  },
};

/** A script's error, kept with its element (the page is the registry). */
const failedScripts = new WeakSet<Element>();

/**
 * Injects its marked script once per page, as loadVendor does (a marked
 * script with its src already on the page is the injected one), with
 * `loadScript` on by default. A push calls the stub synchronously and,
 * with `reports`, fails `vendor-not-loaded` once the script fired `error`.
 */
function pageScript(reports: boolean): Destination.Instance<Types> {
  const src = 'https://vendor.example/page.js';
  const scriptOnPage = () =>
    Array.from(document.querySelectorAll('script[data-walkeros-vendor]')).find(
      (script) => script.getAttribute('src') === src,
    );
  return {
    ...vendorGlobal,
    type: reports ? 'page-script' : 'page-script-ignoring',
    config: { loadScript: true },
    init: ({ config }) => {
      if (!config.loadScript || scriptOnPage()) return;
      const script = document.createElement('script');
      script.src = src;
      script.setAttribute('data-walkeros-vendor', '');
      script.addEventListener('error', () => failedScripts.add(script));
      document.head.appendChild(script);
    },
    push: async (event, context) => {
      const script = scriptOnPage();
      if (reports && script && failedScripts.has(script))
        throw new StepError('Vendor script failed to load', {
          code: 'vendor-not-loaded',
        });
      await vendorGlobal.push(event, context);
    },
  };
}

export const pageScriptVendor = pageScript(true);
export const pageScriptIgnoring = pageScript(false);

/** Sends "revoked" to its vendor on every consent change, grant included. */
export const alwaysRevoking: Destination.Instance<Types> = {
  ...vendorGlobal,
  type: 'always-revoking',
  on: (type, { env }) => {
    const vendor = env.vendor;
    if (type !== 'consent' || !isVendor(vendor)) return;
    vendor.consent(false);
  },
};
