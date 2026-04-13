import type { Env } from '../types';

/**
 * Mock PostHog class that records method calls for testing.
 * Follows the BigQuery env.BigQuery constructor injection pattern.
 */
function createMockPostHog() {
  return class MockPostHog {
    apiKey: string;
    options: Record<string, unknown>;
    calls: Array<{ method: string; args: unknown[] }>;

    constructor(apiKey: string, options?: Record<string, unknown>) {
      this.apiKey = apiKey;
      this.options = options || {};
      this.calls = [];
    }

    capture(params: Record<string, unknown>) {
      this.calls.push({ method: 'capture', args: [params] });
    }

    identify(params: Record<string, unknown>) {
      this.calls.push({ method: 'identify', args: [params] });
    }

    groupIdentify(params: Record<string, unknown>) {
      this.calls.push({ method: 'groupIdentify', args: [params] });
    }

    flush() {
      this.calls.push({ method: 'flush', args: [] });
      return Promise.resolve();
    }

    async shutdown() {
      this.calls.push({ method: 'shutdown', args: [] });
    }

    enable() {
      this.calls.push({ method: 'enable', args: [] });
    }

    disable() {
      this.calls.push({ method: 'disable', args: [] });
    }
  };
}

/**
 * Standard mock environment for push operations.
 * Injects a mock PostHog class constructor via env.PostHog.
 */
export const push: Env = {
  get PostHog() {
    return createMockPostHog() as unknown as Env['PostHog'];
  },
};

/** Simulation tracking paths for CLI --simulate. */
export const simulation = [
  'call:client.capture',
  'call:client.identify',
  'call:client.groupIdentify',
  'call:client.shutdown',
];
