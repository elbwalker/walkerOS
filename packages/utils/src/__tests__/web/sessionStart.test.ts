import { sessionStart } from '../..';

describe('Utils sessionStart', () => {
  const w = window;

  beforeEach(() => {
    // reset DOM with event listeners etc.
    document.body = document.body.cloneNode() as HTMLElement;

    jest.clearAllMocks();
    jest.resetModules();
    jest.useFakeTimers();
  });

  test('sessionStart', () => {
    const url = 'https://www.elbwalker.com/';
    const referrer = 'https://www.example.com/';
    Object.defineProperty(w, 'performance', {
      value: {
        getEntriesByType: jest.fn().mockReturnValue([{ type: 'navigate' }]),
      },
    });

    // Is new
    expect(sessionStart({ url, referrer: url, isNew: true })).toStrictEqual(
      expect.objectContaining({ id: expect.any(String) }),
    );

    // Referral
    expect(sessionStart({ url, referrer })).toStrictEqual(
      expect.objectContaining({ id: expect.any(String) }),
    );

    // Direct
    expect(sessionStart({ url, referrer: '' })).toStrictEqual(
      expect.objectContaining({ id: expect.any(String) }),
    );

    // Predefined data
    expect(
      sessionStart({ url, referrer, data: { id: 'sessionId' } }),
    ).toStrictEqual(expect.objectContaining({ id: 'sessionId' }));

    // Marketing
    expect(sessionStart({ url: url + '?utm_campaign=foo' })).toStrictEqual(
      expect.objectContaining({
        id: expect.any(String),
        campaign: 'foo',
        marketing: true,
      }),
    );

    // Marketing with custom marketing parameter
    expect(
      sessionStart({
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

    // Referrer with custom domains
    expect(
      sessionStart({
        url: 'https://www.elbwalker.com',
        referrer: 'https://docs.elbwalker.com',
        domains: ['docs.elbwalker.com'],
      }),
    ).toBeFalsy();
    expect(
      sessionStart({
        url: 'https://www.elbwalker.com',
        referrer: '',
        domains: [''], // Hack to disable direct or hidden referrer
      }),
    ).toBeFalsy();

    // Default url and referrer
    Object.defineProperty(document, 'referrer', {
      value: referrer,
    });
    Object.defineProperty(window, 'location', {
      value: new URL(url),
    });
    expect(sessionStart()).toStrictEqual(
      expect.objectContaining({ id: expect.any(String) }),
    );

    // Reload
    Object.defineProperty(w, 'performance', {
      value: {
        getEntriesByType: jest.fn().mockReturnValue([{ type: 'reload' }]),
      },
    });
    expect(sessionStart()).toBeFalsy();

    // Reload with marketing parameter
    expect(sessionStart({ url: url + '?utm_campaign=foo' })).toBeFalsy();
  });
});
