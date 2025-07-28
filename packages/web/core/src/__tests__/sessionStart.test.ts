import type { On, WalkerOS, Collector } from '@walkerOS/core';
import { elb, sessionStart, sessionStorage, sessionWindow } from '..';

let consent: On.ConsentConfig;

jest.mock('../elb', () => ({
  elb: jest.fn().mockImplementation((event, data, options) => {
    if (event === 'walker on' && data == 'consent') {
      consent = options;
    }
  }),
}));
jest.mock('../session/sessionStorage', () => ({
  sessionStorage: jest.fn().mockImplementation((config) => {
    return { ...config.data, mock: 'storage' };
  }),
}));
jest.mock('../session/sessionWindow', () => ({
  sessionWindow: jest.fn().mockImplementation((config) => {
    return { ...config.data, mock: 'window' };
  }),
}));

describe('sessionStart', () => {
  const w = window;

  const mockElb = elb as jest.Mock;
  const mockSessionStorage = sessionStorage as jest.Mock;
  const mockSessionWindow = sessionWindow as jest.Mock;

  beforeEach(() => {
    Object.defineProperty(w, 'performance', {
      value: {
        getEntriesByType: jest.fn().mockReturnValue([{ type: 'navigate' }]),
      },
      writable: true,
    });

    jest.clearAllMocks();
    jest.resetModules();

    consent = {};
  });

  test('Default', () => {
    sessionStart();
    expect(mockSessionWindow).toHaveBeenCalledWith({});
  });

  test('Storage', () => {
    sessionStart({ storage: true });
    expect(mockSessionStorage).toHaveBeenCalledWith({ storage: true });
  });

  test('Consent', () => {
    const consentName = 'foo';
    const config = { consent: consentName };
    sessionStart(config);
    expect(mockElb).toHaveBeenCalledTimes(1);
    expect(mockElb).toHaveBeenCalledWith('walker on', 'consent', {
      foo: expect.any(Function),
    });

    // Simulate granted consent call from walker.js collector
    // Granted
    expect(mockSessionStorage).toHaveBeenCalledTimes(0);
    consent[consentName]({} as unknown as Collector.Instance, {
      [consentName]: true,
    });
    expect(mockSessionStorage).toHaveBeenCalledWith(config);

    // Denied
    expect(mockSessionWindow).toHaveBeenCalledTimes(0);
    consent[consentName]({} as unknown as Collector.Instance, {
      [consentName]: false,
    });
    expect(mockSessionWindow).toHaveBeenCalledWith(config);
  });

  test('Callback without consent', () => {
    const collector = {} as unknown as Collector.Instance;
    const mockCb = jest.fn();
    const config = { cb: mockCb, collector, storage: false };
    sessionStart(config);

    expect(mockCb).toHaveBeenCalledTimes(1);
    expect(mockCb).toHaveBeenCalledWith(
      {
        mock: 'window',
      },
      collector,
      expect.any(Function),
    );
  });

  test('Callback with consent', () => {
    const consentName = 'foo';
    const collector = {} as unknown as Collector.Instance;
    const mockCb = jest.fn();
    const config = { cb: mockCb, consent: consentName, storage: true };
    sessionStart(config);

    // Granted, use sessionStorage
    consent[consentName](collector, {
      [consentName]: true,
    });
    expect(mockCb).toHaveBeenCalledTimes(1);
    expect(mockCb).toHaveBeenCalledWith(
      {
        mock: 'storage',
      },
      collector,
      expect.any(Function),
    );

    // Denied, use sessionWindow
    consent[consentName](collector, {
      [consentName]: false,
    });
    expect(mockCb).toHaveBeenCalledTimes(2);
    expect(mockCb).toHaveBeenCalledWith(
      {
        mock: 'window',
      },
      collector,
      expect.any(Function),
    );
  });

  test('Callback default', () => {
    // No elb calls if no session is started
    sessionStart();
    expect(mockElb).toHaveBeenCalledTimes(1);
    expect(mockElb).toHaveBeenCalledWith('walker user', expect.any(Object));

    jest.clearAllMocks();
    sessionStart({ data: { isStart: true } });
    expect(mockElb).toHaveBeenCalledTimes(2);
    expect(mockElb).toHaveBeenNthCalledWith(
      1,
      'walker user',
      expect.any(Object),
    );
    expect(mockElb).toHaveBeenNthCalledWith(2, {
      event: 'session start',
      data: expect.any(Object),
    });
  });

  test('Callback default storage', () => {
    sessionStart({
      data: { storage: true, isNew: true, device: 'd3v1c3', id: 's3ss10n' },
    });
    expect(mockElb).toHaveBeenCalledWith('walker user', {
      device: 'd3v1c3',
      session: 's3ss10n',
    });
  });

  test('Callback disabled', () => {
    // No elb calls if no session is started
    sessionStart({ cb: false, data: { isStart: true } });
    expect(mockElb).toHaveBeenCalledTimes(0);
  });

  test('Callback default elb calls', () => {
    const session = sessionStart({ data: { isNew: true, isStart: true } });
    expect(mockElb).toHaveBeenCalledWith({
      event: 'session start',
      data: session,
    });
  });

  test('multiple consent keys', () => {
    sessionStart({ consent: ['foo', 'bar'] });
    expect(mockElb).toHaveBeenCalledWith('walker on', 'consent', {
      foo: expect.any(Function),
      bar: expect.any(Function),
    });
  });
});
