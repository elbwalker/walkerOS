import { elb, sessionStart, sessionStorage, sessionWindow } from '../../';

jest.mock('../../web', () => ({
  ...jest.requireActual('../../web'), // Keep original
  elb: jest.fn().mockImplementation((event, data, options) => {
    console.log({ event, data, options });
  }),
  // elb: jest.fn(),
  sessionStorage: jest.fn(),
  sessionWindow: jest.fn(),
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
    sessionStart({ consent: 'foo' });
    console.log(123, elb);
    expect(mockElb).toHaveBeenCalledTimes(1);
    expect(mockElb).toHaveBeenCalledWith('walker on', 'consent', {
      foo: [expect.any(Function)],
    });
  });
});
