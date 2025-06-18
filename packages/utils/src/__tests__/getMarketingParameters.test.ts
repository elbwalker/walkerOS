import { getMarketingParameters } from '..';

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
      clickId: 'dclid',
      dclid: 'did',
    });
    expect(getMarketingParameters(new URL(url + 'fbclid=fb'))).toStrictEqual({
      clickId: 'fbclid',
      fbclid: 'fb',
    });
    expect(getMarketingParameters(new URL(url + 'gclid=gid'))).toStrictEqual({
      clickId: 'gclid',
      gclid: 'gid',
    });
    expect(getMarketingParameters(new URL(url + 'msclkid=ms'))).toStrictEqual({
      clickId: 'msclkid',
      msclkid: 'ms',
    });
    expect(getMarketingParameters(new URL(url + 'ttclid=tt'))).toStrictEqual({
      clickId: 'ttclid',
      ttclid: 'tt',
    });
    expect(getMarketingParameters(new URL(url + 'twclid=x'))).toStrictEqual({
      clickId: 'twclid',
      twclid: 'x',
    });
    expect(getMarketingParameters(new URL(url + 'igshid=ig'))).toStrictEqual({
      clickId: 'igshid',
      igshid: 'ig',
    });
    expect(getMarketingParameters(new URL(url + 'sclid=sc'))).toStrictEqual({
      clickId: 'sclid',
      sclid: 'sc',
    });

    // Custom parameters
    expect(
      getMarketingParameters(new URL(url + 'utm_custom=bar'), {
        utm_custom: 'foo',
      }),
    ).toStrictEqual({ foo: 'bar' });
  });
});
