import { WalkerOS } from '@elbwalker/types';
import type { Config, Destination, Custom } from '../types';
import { createEvent } from '@elbwalker/utils';

describe('Node Destination BigQuery', () => {
  // Mock the bigquery package with __mocks__ implementation
  jest.mock('@google-cloud/bigquery');

  const event = createEvent();

  const projectId = 'pr0j3ct1d';
  // const location = 'EU';
  const datasetId = 'd4t4s3t1d';
  const tableId = 't4bl31d';

  let destination: Destination;

  const credentials = { type: 'service_account', private_key: 'secret' };

  function getMockFn(config: Partial<Config>) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (config.custom?.client || ({} as any)).mockFn;
  }

  async function getConfig(custom: Partial<Custom>) {
    return (await destination.init({ custom })) as Config;
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
      destination.init({ custom: { datasetId, tableId } }),
    ).rejects.toThrow('Config custom projectId missing');

    const config = await getConfig({ projectId });
    expect(config).toEqual({
      custom: {
        client: expect.any(Object),
        projectId,
        location: 'EU',
        datasetId: 'walkeros',
        tableId: 'events',
      },
      onLog: expect.any(Function),
    });
  });

  test('push', async () => {
    const config = await getConfig({ projectId, bigquery: { credentials } });
    const mockFn = getMockFn(config);

    await destination.push(event, config);
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
        version: '{"source":"0.0.7","tagging":1}',
        source:
          '{"type":"web","id":"https://localhost:80","previous_id":"http://remotehost:9001"}',
        createdAt: expect.any(Date),
      },
    ]);
  });
});
