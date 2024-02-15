import { sessionWindow } from '../../';

describe('SessionStart', () => {
  const w = window;
  const url = 'https://www.elbwalker.com/';
  const referrer = 'https://www.example.com/';

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

  test('sessionWindow', () => {
    // Is new
    expect(sessionWindow({ url, referrer: url, isNew: true })).toStrictEqual(
      expect.objectContaining({ id: expect.any(String), isNew: true }),
    );

    // Referral
    expect(sessionWindow({ url, referrer })).toStrictEqual(
      expect.objectContaining({ id: expect.any(String) }),
    );

    // Direct
    expect(sessionWindow({ url, referrer: '' })).toStrictEqual(
      expect.objectContaining({ id: expect.any(String) }),
    );

    // Predefined data
    expect(
      sessionWindow({ url, referrer, data: { id: 'sessionId' } }),
    ).toStrictEqual(expect.objectContaining({ id: 'sessionId' }));
  });

  test('Marketing', () => {
    expect(sessionWindow({ url: url + '?utm_campaign=foo' })).toStrictEqual(
      expect.objectContaining({
        id: expect.any(String),
        campaign: 'foo',
        marketing: true,
      }),
    );

    // Marketing with custom marketing parameter
    expect(
      sessionWindow({
        url: url + '?affiliate=parameter',
        parameters: { affiliate: 'custom' },
      }),
    ).toStrictEqual(
      expect.objectContaining({
        id: expect.any(String),
        custom: 'parameter',
        marketing: true,
      }),
    );
  });

  test('Referrer', () => {
    // Custom domains
    expect(
      sessionWindow({
        url: 'https://www.elbwalker.com',
        referrer: 'https://another.elbwalker.com',
        domains: ['another.elbwalker.com'],
      }),
    ).toStrictEqual({ isNew: false });
    expect(
      sessionWindow({
        url: 'https://www.elbwalker.com',
        referrer: '',
        domains: [''], // Hack to disable direct or hidden referrer
      }),
    ).toStrictEqual({ isNew: false });

    // Default url and referrer
    Object.defineProperty(document, 'referrer', {
      value: referrer,
    });
    Object.defineProperty(window, 'location', {
      value: new URL(url),
    });
    expect(sessionWindow()).toStrictEqual(
      expect.objectContaining({ id: expect.any(String) }),
    );
  });

  test('Reload', () => {
    window.performance.getEntriesByType = jest
      .fn()
      .mockReturnValue([{ type: 'reload' }]);

    expect(sessionWindow()).toStrictEqual({ isNew: false });

    // Reload with marketing parameter
    expect(sessionWindow({ url: url + '?utm_campaign=foo' })).toStrictEqual({
      isNew: false,
    });
  });
});