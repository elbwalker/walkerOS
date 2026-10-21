import { isObject, StepError } from '@walkeros/core';
import type { Destination } from '@walkeros/core';

export interface Vendor {
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
