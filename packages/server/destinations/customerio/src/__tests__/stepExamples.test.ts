jest.mock('customerio-node', () => ({
  __esModule: true,
  TrackClient: class {
    identify() {
      return Promise.resolve();
    }
    track() {
      return Promise.resolve();
    }
    trackAnonymous() {
      return Promise.resolve();
    }
    trackPageView() {
      return Promise.resolve();
    }
    destroy() {
      return Promise.resolve();
    }
    suppress() {
      return Promise.resolve();
    }
    unsuppress() {
      return Promise.resolve();
    }
    addDevice() {
      return Promise.resolve();
    }
    deleteDevice() {
      return Promise.resolve();
    }
    mergeCustomers() {
      return Promise.resolve();
    }
  },
  APIClient: class {
    sendEmail() {
      return Promise.resolve();
    }
    sendPush() {
      return Promise.resolve();
    }
  },
  RegionUS: 'us',
  RegionEU: 'eu',
}));

import type { WalkerOS, Mapping as WalkerOSMapping } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { examples } from '../dev';
import type {
  Env,
  CustomerIoTrackClientMock,
  CustomerIoApiClientMock,
  Settings,
} from '../types';

type CallRecord = [string, ...unknown[]];

/**
 * Builds a recording Env where every SDK method appends to a shared
 * call log as ['trackClient.method', ...args] or ['apiClient.method', ...args].
 */
function spyEnv(): { env: Env; collected: () => CallRecord[] } {
  const calls: CallRecord[] = [];

  const trackClient: CustomerIoTrackClientMock = {
    identify: async (...args) => {
      calls.push(['trackClient.identify', ...args]);
    },
    track: async (...args) => {
      calls.push(['trackClient.track', ...args]);
    },
    trackAnonymous: async (...args) => {
      calls.push(['trackClient.trackAnonymous', ...args]);
    },
    trackPageView: async (...args) => {
      calls.push(['trackClient.trackPageView', ...args]);
    },
    destroy: async (...args) => {
      calls.push(['trackClient.destroy', ...args]);
    },
    suppress: async (...args) => {
      calls.push(['trackClient.suppress', ...args]);
    },
    unsuppress: async (...args) => {
      calls.push(['trackClient.unsuppress', ...args]);
    },
    addDevice: async (...args) => {
      calls.push(['trackClient.addDevice', ...args]);
    },
    deleteDevice: async (...args) => {
      calls.push(['trackClient.deleteDevice', ...args]);
    },
    mergeCustomers: async (...args) => {
      calls.push(['trackClient.mergeCustomers', ...args]);
    },
  };

  const apiClient: CustomerIoApiClientMock = {
    sendEmail: async (request) => {
      calls.push(['apiClient.sendEmail', request]);
    },
    sendPush: async (request) => {
      calls.push(['apiClient.sendPush', request]);
    },
  };

  return {
    env: { trackClient, apiClient },
    collected: () => calls,
  };
}

describe('customerio server destination -- step examples', () => {
  it.each(Object.entries(examples.step))('%s', async (_name, rawExample) => {
    const example = rawExample as {
      in?: unknown;
      mapping?: unknown;
      out?: unknown;
      command?: string;
      settings?: Partial<Settings>;
    };

    const { env, collected } = spyEnv();
    const dest = jest.requireActual('../').default;
    const { elb } = await startFlow();

    const baseSettings: Partial<Settings> & {
      siteId: string;
      apiKey: string;
    } = {
      siteId: 'test-site-id',
      apiKey: 'test-api-key',
      customerId: 'user.id',
      anonymousId: 'user.session',
      ...(example.settings || {}),
    };

    const event = example.in as WalkerOS.Event;
    const mapping = example.mapping as WalkerOSMapping.Rule | undefined;
    const mappingConfig = mapping
      ? { [event.entity]: { [event.action]: mapping } }
      : undefined;

    elb(
      'walker destination',
      { ...dest, env },
      {
        settings: baseSettings,
        mapping: mappingConfig,
      },
    );

    await elb(event);

    expect(collected()).toEqual(example.out);
  });
});
