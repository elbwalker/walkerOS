import type { Config, Destination } from '../types';
import type { WalkerOS } from '@elbwalker/types';

describe('Node Destination Firehose', () => {
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

  async function getConfig(custom = {}) {
    return (await destination.init({
      custom,
    })) as Config;
  }

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();

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
    await destination.push([{ event }], config);
    expect('TODO').toBe('TODO');
  });
});