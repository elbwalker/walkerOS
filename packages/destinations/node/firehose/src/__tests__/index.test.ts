import type { Config, Destination, PartialConfig } from '../types';
import type { WalkerOS } from '@elbwalker/types';

describe('Node Destination Firehose', () => {
  // Mock the bigquery package with __mocks__ implementation
  jest.mock('@aws-sdk/client-firehose');

  let destination: Destination;

  const event: WalkerOS.Event = {
    event: 'entity action',
    data: { foo: 'bar' },
    custom: { bar: 'baz' },
    context: { dev: ['test', 1] },
    globals: { lang: 'ts' },
    user: { id: 'us3r', device: 'c00k13', session: 's3ss10n' },
    nested: [
      {
        type: 'child',
        data: { type: 'nested' },
        nested: [],
        context: { element: ['child', 0] },
      },
    ],
    consent: { debugging: true },
    id: '1-gr0up-1',
    trigger: 'test',
    entity: 'entity',
    action: 'action',
    timestamp: new Date().getTime(),
    timing: 3.14,
    group: 'gr0up',
    count: 1,
    version: {
      client: '0.0.7',
      tagging: 1,
    },
    source: {
      type: 'jest',
      id: 'https://localhost:80',
      previous_id: 'http://remotehost:9001',
    },
  };

  const streamName = 'demo';

  function getMockFn(config: PartialConfig) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (config.custom?.client || ({} as any)).mockFn;
  }

  async function getConfig(custom = {}) {
    return (await destination.init({
      custom,
    })) as Config;
  }

  beforeEach(() => {
    destination = jest.requireActual('../').default;
    destination.config = {};
  });

  test('setup', async () => {
    expect('TODO').toBe('TODO');
  });

  test('init', async () => {
    expect('TODO').toBe('TODO');
  });

  test('push', async () => {
    const config = await getConfig({ streamName });
    const mockFn = getMockFn(config);

    await destination.push([{ event }], config);
    expect(mockFn).toHaveBeenCalledWith('new', {
      DeliveryStreamName: streamName,
      Records: [{ Data: expect.any(Buffer) }],
    });
  });
});
