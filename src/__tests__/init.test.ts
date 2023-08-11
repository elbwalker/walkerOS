import newElbwalker from '../elbwalker';
import type { Elbwalker } from '../types';

describe('Init', () => {
  const w = window;
  const mockFn = jest.fn(); //.mockImplementation(console.log);

  let elbwalker: Elbwalker.Function;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();

    w.dataLayer = [];
    w.dataLayer.push = mockFn;
  });

  test('custom prefix', () => {
    const prefix = 'data-prefix';
    elbwalker = newElbwalker({ prefix });

    expect(elbwalker.config).toStrictEqual(
      expect.objectContaining({
        prefix: prefix,
      }),
    );
  });

  test('disable page view', () => {
    // First default beforeEach call with pageview true by default
    elbwalker = newElbwalker({ default: true });
    expect(mockFn).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'page view',
      }),
    );

    jest.clearAllMocks();
    w.elbLayer = [];
    elbwalker = newElbwalker({ default: true, pageview: false });

    expect(mockFn).not.toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'page view',
      }),
    );
  });
});
