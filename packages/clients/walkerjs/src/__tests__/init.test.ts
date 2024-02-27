import { Walkerjs } from '..';
import { mockDataLayer } from '@elbwalker/jest/web.setup';
import type { WebClient } from '..';

describe('Init', () => {
  let walkerjs: WebClient.Instance;

  beforeEach(() => {});

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
    expect(mockDataLayer).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'page view',
      }),
    );

    jest.clearAllMocks();
    window.elbLayer = [];
    walkerjs = Walkerjs({ default: true, pageview: false });

    expect(mockDataLayer).not.toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'page view',
      }),
    );
  });
});
