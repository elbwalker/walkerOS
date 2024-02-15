import { On } from '@elbwalker/types';
import { elb, sessionStart, sessionStorage, sessionWindow } from '../../';
import type { WalkerOS } from '@elbwalker/types';

let consent: On.Rules;

jest.mock('../../web', () => ({
  ...jest.requireActual('../../web'), // Keep original
  elb: jest.fn().mockImplementation((event, data, options) => {
    if (event === 'walker on' && data == 'consent') {
      consent = options;
    }
  }),
  sessionStorage: jest.fn().mockImplementation(() => {
    return { session: true };
  }),
  sessionWindow: jest.fn().mockImplementation(() => {
    return { session: false };
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
      foo: [expect.any(Function)],
    });

    // Simulate granted consent call from walker.js instance
    // Granted
    expect(mockSessionStorage).toHaveBeenCalledTimes(0);
    consent[consentName][0]({} as unknown as WalkerOS.Instance, {
      [consentName]: true,
    });
    expect(mockSessionStorage).toHaveBeenCalledWith(config);

    // Denied
    expect(mockSessionWindow).toHaveBeenCalledTimes(0);
    consent[consentName][0]({} as unknown as WalkerOS.Instance, {
      [consentName]: false,
    });
    expect(mockSessionWindow).toHaveBeenCalledWith(config);
  });

  test('Consent callback', () => {
    const consentName = 'foo';
    const config = { consent: consentName, storage: true };
    const mockCb = jest.fn();
    sessionStart(config, mockCb);

    // Granted, use sessionStorage
    consent[consentName][0]({} as unknown as WalkerOS.Instance, {
      [consentName]: true,
    });
    expect(mockCb).toHaveBeenCalledTimes(1);
    expect(mockCb).toHaveBeenCalledWith({ storage: true, session: true });

    // Denied, use sessionWindow
    consent[consentName][0]({} as unknown as WalkerOS.Instance, {
      [consentName]: false,
    });
    expect(mockCb).toHaveBeenCalledTimes(2);
    expect(mockCb).toHaveBeenCalledWith({ storage: true, session: false });
  });
});
