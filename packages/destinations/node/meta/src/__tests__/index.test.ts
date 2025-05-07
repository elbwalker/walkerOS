import type { WalkerOS } from '@elbwalker/types';
import type { DestinationNode } from '@elbwalker/source-node';
import type { Config, Destination } from '../types';
import { getEvent } from '@elbwalker/utils';
import createSourceNode from '@elbwalker/source-node';
import { events, mapping } from '../examples';

const mockSendNode = jest.fn().mockResolvedValue({
  events_received: 1,
  messages: [],
  fbtrace_id: 'abc',
});
jest.mock('@elbwalker/utils/node', () => ({
  ...jest.requireActual('@elbwalker/utils/node'),
  sendNode: mockSendNode,
}));

describe('Node Destination Meta', () => {
  let destination: Destination;
  const accessToken = 's3cr3t';
  const pixelId = 'p1x3l1d';

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.resetModules();

    destination = jest.requireActual('../').default;
    destination.config = {};
  });

  afterEach(() => {});

  async function getConfig(custom = {}) {
    return (await destination.init({ custom })) as Config;
  }

  test('init', async () => {
    await expect(destination.init({})).rejects.toThrow(
      'Error: Config custom accessToken missing',
    );
    await expect(destination.init({ custom: { accessToken } })).rejects.toThrow(
      'Error: Config custom pixelId missing',
    );

    const config = await getConfig({ accessToken, pixelId });
    expect(config).toEqual(
      expect.objectContaining({
        custom: { accessToken, pixelId },
      }),
    );
  });

  test('testCode', async () => {
    const { elb } = createSourceNode({});
    const event = getEvent();
    const config: DestinationNode.Config = {
      custom: { accessToken, pixelId, test_event_code: 'TEST' },
      mapping: mapping.config,
    };

    elb('walker destination', destination, config);
    await elb(event);
    const requestBody = JSON.parse(mockSendNode.mock.calls[0][1]);
    expect(requestBody.test_event_code).toEqual('TEST');
  });

  test('userData', async () => {
    const { elb } = createSourceNode({});
    const event = getEvent();
    const config: DestinationNode.Config = {
      custom: mapping.InitUserData,
      mapping: {
        entity: {
          action: {
            data: {
              map: {
                user_data: {
                  map: {
                    ph: { value: '123' },
                  },
                },
              },
            },
          },
        },
      },
    };

    elb('walker destination', destination, config);
    await elb(event);
    const requestBody = JSON.parse(mockSendNode.mock.calls[0][1]);
    expect(requestBody.data[0].user_data).toEqual({
      em: expect.any(String),
      ph: '123',
    });
  });

  test('event Purchase', async () => {
    const { elb } = createSourceNode({});
    const event = getEvent('order complete');

    const config: DestinationNode.Config = {
      custom: { accessToken, pixelId },
      mapping: mapping.config,
    };

    elb('walker destination', destination, config);

    await elb(event);
    const requestBody = JSON.parse(mockSendNode.mock.calls[0][1]);

    expect(requestBody).toEqual(events.Purchase());
  });
});
