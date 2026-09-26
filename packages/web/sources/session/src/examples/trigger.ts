import type { Trigger, Collector } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';

interface SessionTriggerOptions {
  url?: string;
  referrer?: string;
  sessionData?: Record<string, unknown>;
  deviceId?: string;
  sessionKey?: string;
  deviceKey?: string;
}

const createTrigger: Trigger.CreateFn<Record<string, unknown>, void> = async (
  config: Collector.InitConfig,
) => {
  let flow: Trigger.FlowHandle | undefined;

  const trigger: Trigger.Fn<Record<string, unknown>, void> =
    (type?: string, opts?: unknown) =>
    async (content: Record<string, unknown>) => {
      const options = (opts || {}) as SessionTriggerOptions;

      // Seed the world the source reads (page, referrer, storage) before the
      // flow starts: the source reads it once, at init.
      if (options.url) {
        const urlObj = new URL(options.url);
        window.history.replaceState({}, '', urlObj.pathname + urlObj.search);
      }
      if (options.referrer) {
        Object.defineProperty(document, 'referrer', {
          value: options.referrer,
          configurable: true,
        });
      }
      if (options.sessionData) {
        const key = options.sessionKey || 'elbSessionId';
        localStorage.setItem(key, JSON.stringify(options.sessionData));
      }
      if (options.deviceId) {
        const key = options.deviceKey || 'elbDeviceId';
        localStorage.setItem(key, options.deviceId);
      }
      // A load is a navigation; a simulated page (JSDOM) records none, and
      // the source starts a session only on one.
      const perf: Partial<Performance> = window.performance;
      const entriesByType =
        typeof perf.getEntriesByType === 'function'
          ? perf.getEntriesByType.bind(perf)
          : () => [];
      if (entriesByType('navigation').length === 0) {
        Object.defineProperty(perf, 'getEntriesByType', {
          configurable: true,
          value: (entryType: string) =>
            entryType === 'navigation'
              ? [{ type: 'navigate' }]
              : entriesByType(entryType),
        });
      }

      // The source emits once: at the run barrier, where a consent-gated
      // source also receives the starting consent (config.consent).
      if (!flow) {
        const result = await startFlow({ ...config, run: config.run ?? true });
        flow = { collector: result.collector, elb: result.elb };
      }
    };

  return {
    get flow() {
      return flow;
    },
    trigger,
  };
};

/** Prepares localStorage with session/device data before source init. */
const trigger = (input: unknown, env: Record<string, unknown>): void => {
  if (!input || typeof input !== 'object') return;
  const data = input as Record<string, unknown>;
  const storage = env.localStorage as Storage;

  if (data.sessionData && typeof data.sessionData === 'object') {
    const key =
      typeof data.sessionKey === 'string' ? data.sessionKey : 'elbSessionId';
    storage.setItem(key, JSON.stringify(data.sessionData));
  }

  if (typeof data.deviceId === 'string') {
    const key =
      typeof data.deviceKey === 'string' ? data.deviceKey : 'elbDeviceId';
    storage.setItem(key, data.deviceId);
  }
};

export { createTrigger, trigger };
