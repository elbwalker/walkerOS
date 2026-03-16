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

      // Pre-init: seed world state before source reads it
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

      // Lazy startFlow — session source fires events during init, but
      // collector.allowed is false until command('run'). The initial
      // session event is dropped. After startFlow, clear the session
      // data written by the dropped init, re-seed, and trigger a consent
      // update to cause session re-init with allowed=true.
      if (!flow) {
        const result = await startFlow({ ...config, run: config.run ?? true });
        flow = { collector: result.collector, elb: result.elb };

        // Clear session data written by the dropped init
        const sessionKey =
          options.sessionKey ||
          ((
            config.sources?.session?.config?.settings as Record<string, unknown>
          )?.sessionKey as string) ||
          'elbSessionId';
        const deviceKey =
          options.deviceKey ||
          ((
            config.sources?.session?.config?.settings as Record<string, unknown>
          )?.deviceKey as string) ||
          'elbDeviceId';
        localStorage.removeItem(sessionKey);
        localStorage.removeItem(deviceKey);

        // Re-seed localStorage if trigger options specified session data
        if (options.sessionData) {
          localStorage.setItem(sessionKey, JSON.stringify(options.sessionData));
        }
        if (options.deviceId) {
          localStorage.setItem(deviceKey, options.deviceId);
        }

        // Re-apply consent to trigger session source on('consent') handler.
        // Now allowed=true so the session start event reaches destinations.
        if (config.consent) {
          await flow.collector.command('consent', config.consent);
        }
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
