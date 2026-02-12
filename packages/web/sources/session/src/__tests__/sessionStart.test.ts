import type { On, Collector } from '@walkeros/core';
import { sessionStart, sessionStorage, sessionWindow } from '../lib';

let consent: On.ConsentConfig = {};

jest.mock('../lib/sessionStorage', () => ({
  sessionStorage: jest.fn().mockImplementation((config) => {
    return { ...config.data, mock: 'storage' };
  }),
}));
jest.mock('../lib/sessionWindow', () => ({
  sessionWindow: jest.fn().mockImplementation((config) => {
    return { ...config.data, mock: 'window' };
  }),
}));

describe('sessionStart', () => {
  const w = window;

  const mockSessionStorage = sessionStorage as jest.Mock;
  const mockSessionWindow = sessionWindow as jest.Mock;

  const createMockCollector = () => ({
    command: jest.fn().mockImplementation((cmd, type, options) => {
      if (cmd === 'on' && type === 'consent') {
        consent = options;
      }
    }),
    push: jest.fn(),
    group: undefined,
  });

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

  test('Consent with collector', () => {
    const consentName = 'foo';
    const collector = createMockCollector() as unknown as Collector.Instance;
    const config = { consent: consentName, collector };
    sessionStart(config);

    expect(collector.command).toHaveBeenCalledTimes(1);
    expect(collector.command).toHaveBeenCalledWith('on', 'consent', {
      foo: expect.any(Function),
    });

    // Simulate granted consent call from collector
    expect(mockSessionStorage).toHaveBeenCalledTimes(0);
    consent[consentName](collector, {
      [consentName]: true,
    });
    expect(mockSessionStorage).toHaveBeenCalledWith(config);

    // Denied
    expect(mockSessionWindow).toHaveBeenCalledTimes(0);
    consent[consentName](collector, {
      [consentName]: false,
    });
    expect(mockSessionWindow).toHaveBeenCalledWith(config);
  });

  test('Callback without consent', () => {
    const collector = createMockCollector() as unknown as Collector.Instance;
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
    const collector = createMockCollector() as unknown as Collector.Instance;
    const mockCb = jest.fn();
    const config = {
      cb: mockCb,
      consent: consentName,
      storage: true,
      collector,
    };
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

  test('Callback default with collector', () => {
    const collector = createMockCollector() as unknown as Collector.Instance;

    // No push calls if no session is started
    sessionStart({ collector });
    expect(collector.command).toHaveBeenCalledTimes(2);
    expect(collector.command).toHaveBeenCalledWith('user', expect.any(Object));
    expect(collector.command).toHaveBeenCalledWith(
      'session',
      expect.any(Object),
    );

    jest.clearAllMocks();
    sessionStart({ data: { isStart: true }, collector });
    expect(collector.command).toHaveBeenCalledTimes(2);
    expect(collector.command).toHaveBeenCalledWith('user', expect.any(Object));
    expect(collector.command).toHaveBeenCalledWith(
      'session',
      expect.any(Object),
    );
    expect(collector.push).toHaveBeenCalledTimes(1);
    expect(collector.push).toHaveBeenCalledWith({
      name: 'session start',
      data: expect.any(Object),
    });
  });

  test('Callback default storage', () => {
    const collector = createMockCollector() as unknown as Collector.Instance;
    sessionStart({
      data: { storage: true, isNew: true, device: 'd3v1c3', id: 's3ss10n' },
      collector,
    });
    expect(collector.command).toHaveBeenCalledWith('user', {
      device: 'd3v1c3',
      session: 's3ss10n',
    });
    expect(collector.command).toHaveBeenCalledWith(
      'session',
      expect.any(Object),
    );
  });

  test('Callback disabled', () => {
    const collector = createMockCollector() as unknown as Collector.Instance;
    // No push calls if callback is disabled
    sessionStart({ cb: false, data: { isStart: true }, collector });
    expect(collector.push).toHaveBeenCalledTimes(0);
    expect(collector.command).toHaveBeenCalledTimes(0);
  });

  test('Callback default push calls', () => {
    const collector = createMockCollector() as unknown as Collector.Instance;
    const session = sessionStart({
      data: { isNew: true, isStart: true },
      collector,
    });
    expect(collector.push).toHaveBeenCalledWith({
      name: 'session start',
      data: session,
    });
  });

  test('multiple consent keys', () => {
    const collector = createMockCollector() as unknown as Collector.Instance;
    sessionStart({ consent: ['foo', 'bar'], collector });
    expect(collector.command).toHaveBeenCalledWith('on', 'consent', {
      foo: expect.any(Function),
      bar: expect.any(Function),
    });
  });

  test('without collector - no crash', () => {
    // Session start should work without collector (just no commands/push)
    expect(() => sessionStart()).not.toThrow();
    expect(() => sessionStart({ storage: true })).not.toThrow();
    expect(() => sessionStart({ data: { isStart: true } })).not.toThrow();
  });
});
