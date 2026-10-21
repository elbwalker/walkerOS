import type { Logger } from '@walkeros/core';
import type * as Unified from '@amplitude/unified';
import type { UnifiedClient } from '@amplitude/unified';
import { startFlow } from '@walkeros/collector';
import { getEvent, Level } from '@walkeros/core';
import { destinationAmplitude } from '..';

// The real @amplitude/unified, with the client the destination creates kept.
const mockClients: UnifiedClient[] = [];
jest.mock('@amplitude/unified', () => {
  const actual = jest.requireActual<typeof Unified>('@amplitude/unified');
  return {
    ...actual,
    createInstance: () => {
      const client = actual.createInstance();
      mockClients.push(client);
      return client;
    },
  };
});

describe('amplitude destination on the real SDK', () => {
  const fetchBefore = globalThis.fetch;
  const requests: string[] = [];

  beforeEach(() => {
    // The SDK's own timers (remote config, flush) run for real; the network
    // is a stub that answers every request with an empty 200.
    jest.useRealTimers();
    globalThis.fetch = async (input) => {
      requests.push(String(input));
      return new Response('{}', { status: 200 });
    };
  });

  afterEach(() => {
    globalThis.fetch = fetchBefore;
  });

  it('starts analytics alone with apiKey only: no ERROR line, its options applied, no plugin', async () => {
    const levels: Logger.Level[] = [];
    const { elb } = await startFlow({
      // The default level: only ERROR lines reach the handler.
      logger: { handler: (level) => levels.push(level) },
      destinations: {
        amplitude: {
          code: destinationAmplitude,
          config: { settings: { apiKey: 'a1b2c3d4e5f6789012345678abcdef12' } },
        },
      },
    });

    expect((await elb(getEvent('page view'))).ok).toBe(true);

    expect(levels.filter((level) => level === Level.ERROR)).toEqual([]);
    expect(mockClients).toHaveLength(1);
    const [client] = mockClients;
    // Options passed as the user id would show up here.
    expect(client.getUserId()).toBeUndefined();
    expect(client.experiment()).toBeUndefined();
    expect(client.sessionReplay()).toBeUndefined();
    // Only analytics hosts are asked: its remote config and its event API.
    expect(
      requests.filter(
        (url) =>
          !url.startsWith('https://sr-client-cfg.amplitude.com/config/') &&
          !url.startsWith('https://api2.amplitude.com/'),
      ),
    ).toEqual([]);
  });
});
