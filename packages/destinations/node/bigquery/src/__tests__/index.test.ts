import type { Config, Destination, PartialConfig } from '../types';
import type { WalkerOS } from '@elbwalker/types';

describe('Node Destination BigQuery', () => {
  // Mock the bigquery package with __mocks__ implementation
  jest.mock('@google-cloud/bigquery');

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
    timestamp: 1690561989523,
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

  const projectId = 'pr0j3ct1d';
  // const location = 'EU';
  const datasetId = 'd4t4s3t1d';
  const tableId = 't4bl31d';

  let destination: Destination, config: Config;

  const credentials: string = 'psst';

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
    jest.clearAllMocks();
    jest.resetModules();

    destination = jest.requireActual('../').default;
    destination.config = {};
  });

  test('runSetup', async () => {
    await expect(
      destination.init({ custom: { runSetup: true } }),
    ).rejects.toThrow(Error);

    const config = await getConfig({
      runSetup: true,
      projectId,
      bigquery: { credentials },
    });

    expect(await destination.init(config)).toBeTruthy();

    const mockFn = getMockFn(config);
    expect(mockFn).toHaveBeenCalledWith('dataset', 'walkeros');
    expect(mockFn).toHaveBeenCalledWith('createDataset', 'walkeros', {
      location: 'EU',
    });
    expect(mockFn).toHaveBeenCalledWith(
      'createTable',
      'events',
      expect.any(Object),
    );
  });

  test('init', async () => {
    expect(destination.init).toBeDefined();
    if (!destination.init) return;

    await expect(
      destination.init({ custom: { datasetId, tableId } }),
    ).rejects.toThrow('Config custom projectId missing');

    config = await getConfig({ projectId });
    expect(config.custom.datasetId).toBe('walkeros');
    expect(config.custom.tableId).toBe('events');
  });

  test('push', async () => {
    const config = await getConfig({ projectId, bigquery: { credentials } });
    const mockFn = getMockFn(config);

    await destination.push([{ event }], config);
    expect(mockFn).toHaveBeenCalledWith('insert', [
      {
        event: 'entity action',
        consent: '{"debugging":true}',
        id: '1-gr0up-1',
        entity: 'entity',
        action: 'action',
        timestamp: expect.any(Date),
        server_timestamp: expect.any(Date),
        data: '{"foo":"bar"}',
        context: '{"dev":["test",1]}',
        custom: '{"bar":"baz"}',
        globals: '{"lang":"ts"}',
        user: expect.any(Object),
        nested: expect.any(String),
        trigger: 'test',
        timing: 3.14,
        group: 'gr0up',
        count: 1,
        version: expect.any(Object),
        source: expect.any(Object),
      },
    ]);
  });
});
