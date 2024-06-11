import { getMarketingParameters } from '..';

describe('getMarketingParameters', () => {
  test('marketing parameters', () => {
    const url = 'https://www.elbwalker.com/?';
    expect(getMarketingParameters(new URL(url))).toStrictEqual({});

    expect(
      getMarketingParameters(new URL(url + 'utm_campaign=c')),
    ).toStrictEqual(expect.objectContaining({ campaign: 'c' }));
    expect(
      getMarketingParameters(new URL(url + 'utm_content=c')),
    ).toStrictEqual(expect.objectContaining({ content: 'c' }));
    expect(getMarketingParameters(new URL(url + 'dclid=id'))).toStrictEqual(
      expect.objectContaining({ clickId: 'id' }),
    );
    expect(getMarketingParameters(new URL(url + 'fbclid=id'))).toStrictEqual(
      expect.objectContaining({ clickId: 'id' }),
    );
    expect(getMarketingParameters(new URL(url + 'gclid=id'))).toStrictEqual(
      expect.objectContaining({ clickId: 'id' }),
    );
    expect(getMarketingParameters(new URL(url + 'utm_medium=m'))).toStrictEqual(
      expect.objectContaining({ medium: 'm' }),
    );
    expect(getMarketingParameters(new URL(url + 'msclkid=id'))).toStrictEqual(
      expect.objectContaining({ clickId: 'id' }),
    );
    expect(getMarketingParameters(new URL(url + 'utm_source=s'))).toStrictEqual(
      expect.objectContaining({ source: 's' }),
    );
    expect(getMarketingParameters(new URL(url + 'utm_term=t'))).toStrictEqual(
      expect.objectContaining({ term: 't' }),
    );

    // Custom parameters
    expect(
      getMarketingParameters(new URL(url + 'utm_custom=bar'), {
        utm_custom: 'foo',
      }),
    ).toStrictEqual(expect.objectContaining({ foo: 'bar' }));
  });
});
