import type { WalkerOS, Collector } from '@walkerOS/core';
import type { Config, Destination, Settings } from '../types';
import { createEvent } from '@walkerOS/core';

describe('Server Destination BigQuery', () => {
  // Mock the bigquery package with __mocks__ implementation
  jest.mock('@google-cloud/bigquery');

  const event = createEvent();

  let destination: Destination;
  const projectId = 'pr0j3ct1d';
  // const location = 'EU';
  const datasetId = 'd4t4s3t1d';
  const tableId = 't4bl31d';
  const credentials = { type: 'service_account', private_key: 'secret' };

  const mockCollector = {} as Collector.Instance;
  const mockWrap = jest.fn((_name, fn) => fn);

  function getMockFn(config: Partial<Config>) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (config.settings?.client || ({} as any)).mockFn;
  }

  async function getConfig(settings: Partial<Settings> = {}) {
    return (await destination.init({
      config: { settings: settings as Settings },
      collector: mockCollector,
      wrap: mockWrap,
    })) as Config;
  }

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();

    destination = jest.requireActual('../').default;
    destination.config = {};
  });

  test('init', async () => {
    expect(destination.init).toBeDefined();
    if (!destination.init) return;

    await expect(
      destination.init({
        config: { settings: { datasetId, tableId } as Settings },
        collector: mockCollector,
        wrap: mockWrap,
      }),
    ).rejects.toThrow('Config settings projectId missing');

    const config = await getConfig({ projectId });
    expect(config).toEqual({
      settings: {
        client: expect.any(Object),
        projectId,
        location: 'EU',
        datasetId: 'walkeros',
        tableId: 'events',
      },
    });
  });

  test('push', async () => {
    const config = await getConfig({ projectId, bigquery: { credentials } });
    const mockFn = getMockFn(config);

    await destination.push(event, {
      config,
      mapping: undefined,
      data: undefined,
      collector: mockCollector,
      wrap: mockWrap,
    });
    expect(mockFn).toHaveBeenCalledWith('insert', [
      {
        timestamp: expect.any(Date),
        event: 'entity action',
        id: event.id,
        entity: 'entity',
        action: 'action',
        consent: '{"functional":true}',
        data: '{"string":"foo","number":1,"boolean":true,"array":[0,"text",false]}',
        context: '{"dev":["test",1]}',
        globals: '{"lang":"elb"}',
        custom: '{"completely":"random"}',
        user: '{"id":"us3r","device":"c00k13","session":"s3ss10n"}',
        nested:
          '[{"type":"child","data":{"is":"subordinated"},"nested":[],"context":{"element":["child",0]}}]',
        trigger: 'test',
        timing: 3.14,
        group: 'gr0up',
        count: 1,
        version: expect.any(String),
        source:
          '{"type":"web","id":"https://localhost:80","previous_id":"http://remotehost:9001"}',
        createdAt: expect.any(Date),
      },
    ]);
  });

  test('data', async () => {
    const config = await getConfig({ projectId, bigquery: { credentials } });
    const data = { foo: 'bar' };
    const mockFn = getMockFn(config);

    await destination.push(event, {
      config,
      mapping: {},
      data,
      collector: mockCollector,
      wrap: mockWrap,
    });
    expect(mockFn).toHaveBeenCalledWith('insert', [{ foo: 'bar' }]);
  });
});
