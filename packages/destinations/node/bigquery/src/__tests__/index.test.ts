import type { Config, Function, PartialConfig } from '../types';
import type { WalkerOS } from '@elbwalker/types';

describe('Node Destination BigQuery', () => {
  const mockFn = jest.fn().mockImplementation(console.log);

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

  const projectId = 'eventpipe-f9979'; //@TODO change to pr0j3ct1d
  const location = 'EU';
  const datasetId = 'd4t4s3t1d';
  const tableId = 't4bl31d';

  let destination: Function, config: PartialConfig;

  let credentials: string = 'psst';

  function getMockFn(config: PartialConfig) {
    return ((config.custom?.client as any) || {}).mockFn;
  }

  async function getConfig(custom = {}) {
    return (await destination.init({
      custom,
    })) as Config;
  }

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();

    destination = require('../').default;
    destination.config = {};
    config = {
      custom: {
        projectId,
        location,
        datasetId,
        tableId,
      },
    };
  });

  test('setup', async () => {
    expect(destination.setup).toBeDefined();
    if (!destination.setup) return;

    await expect(destination.setup({} as any)).rejects.toThrowError();

    const config = await getConfig({ projectId, bigquery: { credentials } });

    expect(await destination.setup(config)).toBeTruthy();

    const mockFn = getMockFn(config);
    expect(mockFn).toBeCalledWith('dataset', 'walkeros');
    expect(mockFn).toBeCalledWith('createDataset', 'walkeros', {
      location: 'EU',
    });
    expect(mockFn).toBeCalledWith('createTable', 'events', expect.any(Object));
  });

  test('init', async () => {
    expect(destination.init).toBeDefined();
    if (!destination.init) return;

    await expect(
      destination.init({ custom: { datasetId, tableId } } as any),
    ).rejects.toThrow('Config custom projectId missing');

    const config = await getConfig({ projectId });

    expect(config.meta.name).toEqual('BigQuery');
    expect(config.meta.version).toEqual(expect.any(String));
    expect(config.custom.datasetId).toBe('walkeros');
    expect(config.custom.tableId).toBe('events');
  });

  test('push', async () => {
    const config = await getConfig({ projectId, bigquery: { credentials } });
    const mockFn = getMockFn(config);

    const result = await destination.push([{ event }], config);
    expect(mockFn).toBeCalledWith('insert', [
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
