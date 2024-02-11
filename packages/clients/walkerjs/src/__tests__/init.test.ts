import { Walkerjs } from '..';
import type { WebClient } from '..';

describe('Init', () => {
  const w = window;
  const mockFn = jest.fn(); //.mockImplementation(console.log);

  let walkerjs: WebClient.Instance;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();

    w.dataLayer = [];
    (w.dataLayer as unknown[]).push = mockFn;
  });

  test('custom prefix', () => {
    const prefix = 'data-prefix';
    walkerjs = Walkerjs({ prefix });

    expect(walkerjs.config).toStrictEqual(
      expect.objectContaining({
        prefix: prefix,
      }),
    );
  });

  test('disable page view', () => {
    // First default beforeEach call with pageview true by default
    walkerjs = Walkerjs({ default: true });
    expect(mockFn).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'page view',
      }),
    );

    jest.clearAllMocks();
    w.elbLayer = [];
    walkerjs = Walkerjs({ default: true, pageview: false });

    expect(mockFn).not.toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'page view',
      }),
    );
  });
});
