import { sessionStart, sessionStorage, sessionWindow } from '../../';

jest.mock('../../web/session', () => ({
  ...jest.requireActual('../../web/session'), // Keep original
  sessionStorage: jest.fn(),
  sessionWindow: jest.fn(),
}));

describe('sessionStart', () => {
  const w = window;

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
});
