import type { WebCollector } from '../';
import { mockDataLayer } from '@walkerOS/jest/web.setup';
import { webCollector } from '../';

describe('Init', () => {
  let walkerjs: WebCollector.Collector;

  beforeEach(() => {});

  test('config', () => {
    const config: WebCollector.InitConfig = {
      consent: { functional: true },
      custom: { private: 'space' },
      dataLayer: true,
      destinations: {
        lol: { config: {}, push: jest.fn() },
      },
      hooks: {
        postPush: jest.fn(),
      },
      session: { storage: true },
      globalsStatic: { static: 'global' },
      on: {
        run: [jest.fn()],
      },
      pageview: true,
      prefix: 'data-prefix',
      run: true,
      sessionStatic: { id: 's3ss10n', device: 'd3v1c3' },
      tagging: 42,
      user: { id: '1d', device: 'overruled' },
    };

    const collector = webCollector(config);

    expect(collector).toStrictEqual(
      expect.objectContaining({
        consent: { functional: true },
        custom: { private: 'space' },
        config: expect.objectContaining({
          dataLayer: true,
          globalsStatic: { static: 'global' },
          pageview: true,
          prefix: 'data-prefix',
          run: true,
          session: { storage: true },
          tagging: 42,
        }),
        destinations: expect.objectContaining({
          lol: expect.any(Object),
        }),
        globals: { static: 'global' },
        hooks: {
          postPush: expect.any(Function),
        },
        on: {
          run: [expect.any(Function)],
        },
        user: { id: '1d', session: 's3ss10n', device: 'd3v1c3' },
      }),
    );
  });

  test('custom prefix', () => {
    const prefix = 'data-prefix';
    walkerjs = webCollector({ prefix });

    expect(walkerjs.config).toStrictEqual(
      expect.objectContaining({
        prefix: prefix,
      }),
    );
  });

  test('disable page view', async () => {
    // First default beforeEach call with pageview true by default
    walkerjs = webCollector({ default: true });
    await jest.runAllTimersAsync();
    expect(mockDataLayer).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'page view',
      }),
    );

    jest.clearAllMocks();
    window.elbLayer = [];
    walkerjs = webCollector({ default: true, pageview: false });

    expect(mockDataLayer).not.toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'page view',
      }),
    );
  });
});
