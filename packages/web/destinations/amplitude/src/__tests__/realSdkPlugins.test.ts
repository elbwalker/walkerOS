import type { Logger } from '@walkeros/core';
import type * as Unified from '@amplitude/unified';
import type { UnifiedClient } from '@amplitude/unified';
import { startFlow } from '@walkeros/collector';
import { getEvent, Level } from '@walkeros/core';
import { destinationAmplitude } from '..';

// The real @amplitude/unified, with the client the destination creates kept
// and the name of each plugin it adds. A file of its own: the destination
// keeps one client per page.
const mockClients: UnifiedClient[] = [];
const mockAdded: string[] = [];
jest.mock('@amplitude/unified', () => {
  const actual = jest.requireActual<typeof Unified>('@amplitude/unified');
  return {
    ...actual,
    createInstance: (): UnifiedClient => {
      const client = actual.createInstance();
      mockClients.push(client);
      return {
        ...client,
        add: (plugin) => {
          mockAdded.push(plugin.name ?? '');
          return client.add(plugin);
        },
      };
    },
  };
});

describe('amplitude plugins on the real SDK', () => {
  const fetchBefore = globalThis.fetch;
  const requests: string[] = [];

  beforeEach(() => {
    jest.useRealTimers();
    globalThis.fetch = async (input) => {
      requests.push(String(input));
      return new Response('{}', { status: 200 });
    };
  });

  afterEach(() => {
    globalThis.fetch = fetchBefore;
  });

  it('starts Session Replay alone: no Experiment, no Guides & Surveys, no engagement script', async () => {
    const levels: Logger.Level[] = [];
    const { elb } = await startFlow({
      logger: { handler: (level) => levels.push(level) },
      destinations: {
        amplitude: {
          code: destinationAmplitude,
          config: {
            settings: {
              apiKey: 'a1b2c3d4e5f6789012345678abcdef12',
              sessionReplay: { sampleRate: 0 },
            },
          },
        },
      },
    });

    expect((await elb(getEvent('page view'))).ok).toBe(true);

    expect(levels.filter((level) => level === Level.ERROR)).toEqual([]);
    expect(mockClients).toHaveLength(1);
    const [client] = mockClients;
    expect(mockAdded).toEqual(['@amplitude/plugin-session-replay-browser']);
    expect(client.experiment()).toBeUndefined();
    expect(document.querySelectorAll('script')).toHaveLength(0);
    expect(requests.filter((url) => url.includes('engagement'))).toEqual([]);
  });
});
