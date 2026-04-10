import { getMarketingParameters } from '..';

describe('getMarketingParameters', () => {
  test('marketing parameters', () => {
    const url = 'https://www.walkeros.io/?';
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
      platform: 'google',
    });
    expect(getMarketingParameters(new URL(url + 'fbclid=fb'))).toStrictEqual({
      clickId: 'fbclid',
      fbclid: 'fb',
      platform: 'meta',
    });
    expect(getMarketingParameters(new URL(url + 'gclid=gid'))).toStrictEqual({
      clickId: 'gclid',
      gclid: 'gid',
      platform: 'google',
    });
    expect(getMarketingParameters(new URL(url + 'msclkid=ms'))).toStrictEqual({
      clickId: 'msclkid',
      msclkid: 'ms',
      platform: 'microsoft',
    });
    expect(getMarketingParameters(new URL(url + 'ttclid=tt'))).toStrictEqual({
      clickId: 'ttclid',
      ttclid: 'tt',
      platform: 'tiktok',
    });
    expect(getMarketingParameters(new URL(url + 'twclid=x'))).toStrictEqual({
      clickId: 'twclid',
      twclid: 'x',
      platform: 'twitter',
    });
    expect(getMarketingParameters(new URL(url + 'igshid=ig'))).toStrictEqual({
      clickId: 'igshid',
      igshid: 'ig',
      platform: 'meta',
    });
    expect(getMarketingParameters(new URL(url + 'sclid=sc'))).toStrictEqual({
      clickId: 'sclid',
      sclid: 'sc',
      platform: 'snapchat',
    });
    expect(getMarketingParameters(new URL(url + 'li_fat_id=li'))).toStrictEqual(
      {
        clickId: 'li_fat_id',
        li_fat_id: 'li',
        platform: 'linkedin',
      },
    );

    // Custom parameters
    expect(
      getMarketingParameters(new URL(url + 'utm_custom=bar'), {
        utm_custom: 'foo',
      }),
    ).toStrictEqual({ foo: 'bar' });
  });

  test('resolves platform for known click IDs', () => {
    const url = 'https://www.walkeros.io/?';
    const cases: Array<[string, string, string]> = [
      ['gclid', 'g', 'google'],
      ['wbraid', 'w', 'google'],
      ['gbraid', 'gb', 'google'],
      ['dclid', 'd', 'google'],
      ['gclsrc', 'gs', 'google'],
      ['fbclid', 'f', 'meta'],
      ['igshid', 'i', 'meta'],
      ['msclkid', 'm', 'microsoft'],
      ['ttclid', 'tt', 'tiktok'],
      ['twclid', 't', 'twitter'],
      ['li_fat_id', 'li', 'linkedin'],
      ['epik', 'e', 'pinterest'],
      ['sclid', 's', 'snapchat'],
      ['rdt_cid', 'r', 'reddit'],
      ['qclid', 'q', 'quora'],
      ['yclid', 'y', 'yandex'],
      ['ymclid', 'ym', 'yandex'],
      ['ysclid', 'ys', 'yandex'],
      ['dicbo', 'di', 'outbrain'],
      ['obclid', 'ob', 'outbrain'],
      ['tblci', 'tb', 'taboola'],
      ['mc_cid', 'mc', 'mailchimp'],
      ['mc_eid', 'me', 'mailchimp'],
      ['_kx', 'kx', 'klaviyo'],
      ['_hsenc', 'hs', 'hubspot'],
      ['_hsmi', 'hm', 'hubspot'],
      ['s_kwcid', 'sk', 'adobe'],
      ['ef_id', 'ef', 'adobe'],
      ['mkt_tok', 'mk', 'adobe'],
      ['irclickid', 'ir', 'impact'],
      ['cjevent', 'cj', 'cj'],
      ['_branch_match_id', 'br', 'branch'],
    ];
    for (const [param, value, platform] of cases) {
      const result = getMarketingParameters(new URL(url + `${param}=${value}`));
      expect(result).toMatchObject({
        clickId: param,
        [param]: value,
        platform,
      });
    }
  });

  test('resolves Snapchat ScCid case-insensitively', () => {
    const url = 'https://www.walkeros.io/?ScCid=abc';
    const result = getMarketingParameters(new URL(url));
    expect(result.platform).toBe('snapchat');
    expect(result.clickId).toBe('sccid');
  });

  test('multi click-ID URL resolves platform by priority order', () => {
    const url = 'https://www.walkeros.io/?gclid=g&fbclid=f';
    const result = getMarketingParameters(new URL(url));
    expect(result.platform).toBe('google');
    expect(result.clickId).toBe('gclid');
    expect(result.gclid).toBe('g');
    expect(result.fbclid).toBe('f');
  });

  test('reverse priority — fbclid wins when gclid absent', () => {
    const url = 'https://www.walkeros.io/?fbclid=f&ttclid=t';
    const result = getMarketingParameters(new URL(url));
    expect(result.platform).toBe('meta');
    expect(result.clickId).toBe('fbclid');
  });

  test('no click ID — no platform field', () => {
    const url = 'https://www.walkeros.io/?utm_source=newsletter';
    const result = getMarketingParameters(new URL(url));
    expect(result.platform).toBeUndefined();
    expect(result.clickId).toBeUndefined();
    expect(result.source).toBe('newsletter');
  });

  test('custom click-ID registry extends defaults', () => {
    const url = 'https://www.walkeros.io/?xyzclid=abc';
    const result = getMarketingParameters(new URL(url), undefined, [
      { param: 'xyzclid', platform: 'xyz' },
    ]);
    expect(result.clickId).toBe('xyzclid');
    expect(result.xyzclid).toBe('abc');
    expect(result.platform).toBe('xyz');
  });

  test('custom click-ID overrides default platform name', () => {
    const url = 'https://www.walkeros.io/?fbclid=f';
    const result = getMarketingParameters(new URL(url), undefined, [
      { param: 'fbclid', platform: 'facebook' },
    ]);
    expect(result.platform).toBe('facebook');
  });
});
