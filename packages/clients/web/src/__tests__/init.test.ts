import ElbwalkerWeb from '../elbwalker';
import type { Elbwalker } from '@elbwalker/types';

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
    elbwalker = ElbwalkerWeb({ prefix });

    expect(elbwalker.config).toStrictEqual(
      expect.objectContaining({
        prefix: prefix,
      }),
    );
  });

  test('disable page view', () => {
    // First default beforeEach call with pageview true by default
    elbwalker = ElbwalkerWeb({ default: true });
    expect(mockFn).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'page view',
      }),
    );

    jest.clearAllMocks();
    w.elbLayer = [];
    elbwalker = ElbwalkerWeb({ default: true, pageview: false });

    expect(mockFn).not.toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'page view',
      }),
    );
  });
});
