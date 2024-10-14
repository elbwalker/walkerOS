import type { WalkerOS } from '@elbwalker/types';
import type { Config, Destination } from '../types';

describe('Node Destination Meta', () => {
  let destination: Destination;

  const oldXMLHttpRequest = window.XMLHttpRequest;
  const mockOnload = jest.fn().mockImplementation(() => {
    return Promise.resolve({});
  });
  const mockXHRSend = jest.fn().mockImplementation(function () {
    this.status = 200;
    this.response = JSON.stringify({ data: {} });
    this.onload(); // Manually trigger onload to simulate the response
  });
  const mockXHR = {
    onload: mockOnload,
    open: jest.fn(),
    send: mockXHRSend,
    setRequestHeader: jest.fn(),
    readyState: 4,
  };

  let event: WalkerOS.Event;
  let config: Config;
  const access_token = 's3cr3t';
  const pixel_id = 'p1x3l1d';
  const onLog = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.resetModules();

    Object.defineProperty(window, 'XMLHttpRequest', {
      value: jest.fn(() => mockXHR),
      writable: true,
    });

    destination = jest.requireActual('../').default;
    destination.config = {};

    config = {
      custom: { access_token, pixel_id },
      onLog,
    };
    event = {
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
        type: 'web',
        id: 'https://localhost:80',
        previous_id: 'http://remotehost:9001',
      },
    };
  });

  afterEach(() => {
    window.XMLHttpRequest = oldXMLHttpRequest;
  });

  test('init', async () => {
    await expect(destination.init({})).rejects.toThrow(
      'Error: Config custom access_token missing',
    );
    await expect(
      destination.init({ custom: { access_token } }),
    ).rejects.toThrow('Error: Config custom pixel_id missing');
    await expect(
      destination.init({ custom: { access_token, pixel_id } }),
    ).resolves.toEqual(
      expect.objectContaining({ custom: { access_token, pixel_id } }),
    );
  });

  test('push', async () => {
    await destination.push([{ event }], config);

    expect(mockXHRSend).toHaveBeenCalledWith(expect.any(String));
    expect(getRequestStr(mockXHRSend)).toContain('"access_token":"s3cr3t"');
    expect(getRequestStr(mockXHRSend)).toContain('"id":"p1x3l1d"');
    expect(getRequestStr(mockXHRSend)).toContain(
      '"event_name":"entity action"',
    );
  });

  test('test_code', async () => {
    config.custom.test_code = 'TESTNNNNN';
    await destination.push([{ event }], config);

    expect(getRequestObj(mockXHRSend)).toEqual(
      expect.objectContaining({
        test_event_code: 'TESTNNNNN',
      }),
    );
  });

  test('IDs', async () => {
    event.data.clickId = 'abc...';

    await destination.push([{ event }], config);

    const user_data = getRequestData(mockXHRSend).user_data;
    console.log('🚀 ~ test ~ user_data:', user_data);

    expect(user_data).toEqual(
      expect.objectContaining({
        fbc: expect.any(String),
      }),
    );
    expect(user_data.fbc).toContain('fb.1.');
    expect(user_data.fbc).toContain('abc...');
  });

  test('user data', async () => {
    event.user.city = 'Hamburg';
    event.user.country = 'DE';
    event.user.zip = '20354';
    event.user.userAgent = 'br0ws3r';
    event.user.ip = '127.0.0.1';

    await destination.push([{ event }], config);

    const user_data = getRequestData(mockXHRSend).user_data;

    expect(user_data).toEqual(
      expect.objectContaining({
        ct: expect.any(Array),
        country: expect.any(Array),
        zp: expect.any(Array),
        client_ip_address: '127.0.0.1',
        client_user_agent: 'br0ws3r',
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
