import type { WalkerOS } from '@elbwalker/types';
import type { Config, CustomEvent, Destination } from '../types';
import { createEvent } from '@elbwalker/utils';
import { mockFn } from '../__mocks__/facebook-nodejs-business-sdk';

describe('Node Destination Meta', () => {
  let destination: Destination;
  let event: WalkerOS.Event;
  let config: Config;
  const accessToken = 's3cr3t';
  const pixelId = 'p1x3l1d';
  const onLog = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.resetModules();

    destination = jest.requireActual('../').default;
    destination.config = {};

    config = {
      custom: { accessToken, pixelId },
      onLog,
    };
    event = createEvent();
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

  test('push', async () => {
    const config = await getConfig({ accessToken, pixelId });
    await destination.push(event, config);

    // Verify the sequence of calls
    expect(mockFn).toHaveBeenCalledWith(
      'EventRequest',
      accessToken,
      pixelId,
      expect.any(Array),
      'walkerOS',
      undefined,
      pixelId,
      expect.any(String),
    );
    expect(mockFn).toHaveBeenCalledWith('EventRequest.execute');
  });

  test('testCode', async () => {
    const testCode = 'TESTNNNNN';
    const config = await getConfig({ accessToken, pixelId, testCode });
    await destination.push(event, config);

    expect(mockFn).toHaveBeenCalledWith(
      'EventRequest',
      accessToken,
      pixelId,
      expect.any(Array),
      expect.any(String),
      testCode, // testCode
      pixelId,
      expect.any(String),
    );
  });

  test('Debug', async () => {
    const config = await getConfig({ accessToken, pixelId, debug: true });
    await destination.push(event, config);

    expect(mockFn).toHaveBeenCalledWith('EventRequest.setDebugMode', true);
  });

  test('AddToCart', async () => {
    const config = await getConfig({ accessToken, pixelId });
    const data = { foo: 'bar' };

    await destination.push(event, config, {}, { data });
  });

  test('Content', async () => {
    const config = await getConfig({ accessToken, pixelId });
    const data = {
      content: { id: '123', title: 'Test', price: 10, quantity: 2 },
    };

    await destination.push(event, config, {}, { data });

    expect(mockFn).toHaveBeenCalledWith('Content.setId', '123');
    expect(mockFn).toHaveBeenCalledWith('Content.setTitle', 'Test');
    expect(mockFn).toHaveBeenCalledWith('Content.setItemPrice', 10);
    expect(mockFn).toHaveBeenCalledWith('Content.setQuantity', 2);
  });

  test('Currency', async () => {
    const config = await getConfig({ accessToken, pixelId });
    const data = { currency: 'EUR' };

    await destination.push(event, config, {}, { data });

    expect(mockFn).toHaveBeenCalledWith('CustomData.setCurrency', 'EUR');
  });

  test('Value', async () => {
    const config = await getConfig({ accessToken, pixelId });
    const data = { value: 42 };

    await destination.push(event, config, {}, { data });

    expect(mockFn).toHaveBeenCalledWith('CustomData.setValue', 42);
  });
});
