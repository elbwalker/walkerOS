import webClient from '../';
import type { WebClient } from '../types';

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
    walkerjs = webClient({ prefix });

    expect(walkerjs.config).toStrictEqual(
      expect.objectContaining({
        prefix: prefix,
      }),
    );
  });

  test('disable page view', () => {
    // First default beforeEach call with pageview true by default
    walkerjs = webClient({ default: true });
    expect(mockFn).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'page view',
      }),
    );

    jest.clearAllMocks();
    w.elbLayer = [];
    walkerjs = webClient({ default: true, pageview: false });

    expect(mockFn).not.toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'page view',
      }),
    );
  });
});
