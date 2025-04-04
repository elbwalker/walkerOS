import type { WalkerOS } from '@elbwalker/types';
import type { Config, CustomEvent, Destination } from '../types';
import { createEvent } from '@elbwalker/utils';

describe('Node Destination Meta', () => {
  let destination: Destination;

  const mockXHRSend = jest.fn().mockImplementation(function () {
    this.status = 200;
    this.response = JSON.stringify({ data: {} });
    this.onload(); // Manually trigger onload to simulate the response
  });

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

  test.skip('push', async () => {
    await destination.push(event, config);

    expect(mockXHRSend).toHaveBeenCalledWith(expect.any(String));
    expect(getRequestStr(mockXHRSend)).toContain('"access_token":"s3cr3t"');
    expect(getRequestStr(mockXHRSend)).toContain('"id":"p1x3l1d"');
    expect(getRequestStr(mockXHRSend)).toContain(
      '"event_name":"entity action"',
    );
  });

  test.skip('testCode', async () => {
    config.custom.testCode = 'TESTNNNNN';
    await destination.push(event, config);

    expect(getRequestObj(mockXHRSend)).toEqual(
      expect.objectContaining({
        test_event_code: 'TESTNNNNN',
      }),
    );
  });

  test.skip('IDs', async () => {
    event.data.fbclid = 'abc...';

    await destination.push(event, config);

    const user_data = getRequestData(mockXHRSend).user_data;

    expect(user_data).toEqual(
      expect.objectContaining({
        external_id: expect.arrayContaining(['us3r', 'c00k13', 's3ss10n']),
        fbc: expect.any(String),
      }),
    );
    expect(user_data.fbc).toContain('fb.1.');
    expect(user_data.fbc).toContain('abc...');
  });

  test.skip('user data', async () => {
    event.user.email = 'a@b.c';
    event.user.phone = '0401337';
    event.user.city = 'Hamburg';
    event.user.country = 'DE';
    event.user.zip = '20354';
    event.user.userAgent = 'br0ws3r';
    event.user.ip = '127.0.0.1';

    await destination.push(event, config);

    const user_data = getRequestData(mockXHRSend).user_data;

    expect(user_data).toEqual(
      expect.objectContaining({
        em: expect.any(Array),
        ph: expect.any(Array),
        ct: expect.any(Array),
        country: expect.any(Array),
        zp: expect.any(Array),
        client_ip_address: '127.0.0.1',
        client_user_agent: 'br0ws3r',
      }),
    );
  });

  test.skip('Mapping', async () => {
    event.data = { id: 'abc', quantity: 42, total: 9001 };
    const custom: CustomEvent = {
      currency: { value: 'EUR' },
      content: {
        id: 'data.id',
        price: { value: 214.31 },
        quantity: 'data.quantity',
      },
      value: 'data.total',
    };

    await destination.push(event, config, { custom });

    const requestData = getRequestData(mockXHRSend);
    const custom_data = requestData.custom_data;

    expect(custom_data).toEqual(
      expect.objectContaining({
        currency: 'EUR',
        value: 9001,
        contents: expect.arrayContaining([
          {
            id: 'abc',
            item_price: 214.31,
            quantity: 42,
          },
        ]),
      }),
    );
  });

  function getRequestStr(mock: jest.Mock, i = 0) {
    return mock.mock.calls[i][0];
  }

  function getRequestObj(mock: jest.Mock, i = 0) {
    return JSON.parse(getRequestStr(mock, i));
  }

  function getRequestData(mock: jest.Mock, i = 0) {
    return getRequestObj(mock, i).data[0];
  }
});
