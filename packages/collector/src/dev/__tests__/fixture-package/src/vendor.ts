import { isObject, StepError } from '@walkeros/core';
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
 * Calls its vendor in `init`, as `fbq('init', ...)` does: the call is queued
 * by the vendor, not awaited. It requires marketing consent, so the collector
 * initializes it inside the first input that grants it, not at the start.
 */
export const initCalling: Destination.Instance<Types> = {
  ...vendorGlobal,
  type: 'init-calling',
  config: { consent: { marketing: true } },
  init: ({ config, env }) => {
    if (!env.vendor) return;
    Promise.resolve(env.vendor.init(config.settings?.site ?? '')).catch(
      () => undefined,
    );
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
