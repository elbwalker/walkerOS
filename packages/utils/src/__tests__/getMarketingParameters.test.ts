import { getMarketingParameters } from '../core';

describe('getMarketingParameters', () => {
  test('marketing parameters', () => {
    const url = 'https://www.elbwalker.com/?';
    expect(getMarketingParameters(new URL(url))).toStrictEqual({});

    expect(
      getMarketingParameters(new URL(url + 'utm_campaign=c')),
    ).toStrictEqual({ campaign: 'c' });
    expect(
      getMarketingParameters(new URL(url + 'utm_content=c')),
    ).toStrictEqual({ content: 'c' });
    expect(getMarketingParameters(new URL(url + 'utm_medium=m'))).toStrictEqual(
      { medium: 'm' },
    );
    expect(getMarketingParameters(new URL(url + 'utm_source=s'))).toStrictEqual(
      { source: 's' },
    );
    expect(getMarketingParameters(new URL(url + 'utm_term=t'))).toStrictEqual({
      term: 't',
    });
    expect(getMarketingParameters(new URL(url + 'dclid=did'))).toStrictEqual({
      clickId: 'did',
      platform: 'google',
    });
    expect(getMarketingParameters(new URL(url + 'fbclid=fb'))).toStrictEqual({
      clickId: 'fb',
      platform: 'meta',
    });
    expect(getMarketingParameters(new URL(url + 'gclid=gid'))).toStrictEqual({
      clickId: 'gid',
      platform: 'google',
    });
    expect(getMarketingParameters(new URL(url + 'msclkid=ms'))).toStrictEqual({
      clickId: 'ms',
      platform: 'microsoft',
    });
    expect(getMarketingParameters(new URL(url + 'ttclid=tt'))).toStrictEqual({
      clickId: 'tt',
      platform: 'tiktok',
    });
    expect(getMarketingParameters(new URL(url + 'twclid=x'))).toStrictEqual({
      clickId: 'x',
      platform: 'twitter',
    });
    expect(getMarketingParameters(new URL(url + 'igshid=ig'))).toStrictEqual({
      clickId: 'ig',
      platform: 'meta',
    });
    expect(getMarketingParameters(new URL(url + 'sclid=sc'))).toStrictEqual({
      clickId: 'sc',
      platform: 'snapchat',
    });

    // Custom parameters
    expect(
      getMarketingParameters(new URL(url + 'utm_custom=bar'), {
        utm_custom: 'foo',
      }),
    ).toStrictEqual({ foo: 'bar' });
  });
});
