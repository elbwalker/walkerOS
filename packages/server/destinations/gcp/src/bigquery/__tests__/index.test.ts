import type { Collector } from '@walkeros/core';
import type { Config, Destination, Settings } from '../types';
import { clone, createEvent } from '@walkeros/core';
import { examples } from '../';

const { env } = examples;

describe('Server Destination BigQuery', () => {
  const event = createEvent();

  let destination: Destination;
  const projectId = 'pr0j3ct1d';
  // const location = 'EU';
  const datasetId = 'd4t4s3t1d';
  const tableId = 't4bl31d';
  const credentials = { type: 'service_account', private_key: 'secret' };

  const mockCollector = {} as Collector.Instance;
  let testEnv: typeof env.push;
  let mockInsert: jest.Mock;

  async function getConfig(settings: Partial<Settings> = {}) {
    return (await destination.init({
      config: { settings: settings as Settings },
      collector: mockCollector,
      env: testEnv,
    })) as Config;
  }

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();

    destination = jest.requireActual('../').default;
    destination.config = {};

    // Create test environment with mocked BigQuery client
    testEnv = clone(env.push);
    mockInsert = jest.fn().mockResolvedValue(undefined);

    // Override BigQuery with a mock class that has jest.fn() tracking
    testEnv.BigQuery = class MockBigQuery {
      options: any;

      constructor(options?: any) {
        this.options = options;
      }

      dataset(_datasetId: string) {
        return this;
      }

      table(_tableId: string) {
        return this;
      }

      async insert(rows: unknown[]) {
        mockInsert('insert', rows);
        return Promise.resolve();
      }
    } as any;
  });

  test('init', async () => {
    expect(destination.init).toBeDefined();
    if (!destination.init) return;

    await expect(
      destination.init({
        config: { settings: { datasetId, tableId } as Settings },
        collector: mockCollector,
        env: testEnv,
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

    await destination.push(event, {
      config,
      mapping: undefined,
      data: undefined,
      collector: mockCollector,
      env: testEnv,
    });
    expect(mockInsert).toHaveBeenCalledWith('insert', [
      {
        timestamp: expect.any(Date),
        name: 'entity action',
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
          '[{"entity":"child","data":{"is":"subordinated"},"nested":[],"context":{"element":["child",0]}}]',
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

    await destination.push(event, {
      config,
      mapping: {},
      data,
      collector: mockCollector,
      env: testEnv,
    });
    expect(mockInsert).toHaveBeenCalledWith('insert', [{ foo: 'bar' }]);
  });
});
