import { computeScore, type Signals } from '../detect/score';

const chromeUA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const firefoxUA =
  'Mozilla/5.0 (X11; Linux x86_64; rv:126.0) Gecko/20100101 Firefox/126.0';
const safariUA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15';
const oldSafariUA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 15_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.6 Mobile/15E148 Safari/604.1';
const webViewUA =
  'Mozilla/5.0 (Linux; Android 11; SM-G991B Build/RP1A.200720.012; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/142.0.0.0 Mobile Safari/537.36';
const chromeChUa =
  '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"';

/** A fully wired pipeline: every absence-based family declared, context pinned. */
const WIRED = {
  context: 'beacon',
  declared: [
    'userAgent',
    'acceptLanguage',
    'acceptEncoding',
    'secFetchSite',
    'secFetchMode',
    'secFetchDest',
    'secChUa',
  ],
} as const;

/** A real Chrome beacon on a fully wired pipeline: the clean, common case. */
const cleanBeacon: Signals = {
  userAgent: chromeUA,
  acceptLanguage: 'de-DE,de;q=0.9',
  acceptEncoding: 'gzip, deflate, br, zstd',
  secFetchSite: 'cross-site',
  secFetchMode: 'no-cors',
  secFetchDest: 'empty',
  secChUa: chromeChUa,
  secChUaMobile: '?0',
  secChUaPlatform: '"macOS"',
  accept: '*/*',
  contentType: 'text/plain;charset=UTF-8',
  method: 'POST',
};

describe('unknown', () => {
  it('an empty signal bag is not measured', () => {
    expect(computeScore({})).toMatchObject({
      botScore: null,
      botCategory: 'unknown',
    });
  });

  it('reports what is unwired rather than staying silent', () => {
    expect(computeScore({}).botReasons).toEqual([
      'context_undetermined',
      'ch_not_declared',
      'fetchmeta_not_declared',
      'accept_not_declared',
    ]);
  });

  it('any resolvable signal takes it out of unknown', () => {
    expect(computeScore({ ip: '203.0.113.7' }).botCategory).not.toBe('unknown');
  });
});

describe('deterministic ladder', () => {
  it('missing UA scores 70 as automation', () => {
    const result = computeScore({ ip: '203.0.113.7' }, WIRED);
    expect(result).toMatchObject({ botScore: 70, botCategory: 'automation' });
    expect(result.botProduct).toBeUndefined();
  });

  it('an empty-string UA is equivalent to an absent one', () => {
    expect(computeScore({ userAgent: '', ip: '203.0.113.7' })).toEqual(
      computeScore({ ip: '203.0.113.7' }),
    );
  });

  it.each([
    [
      'GPTBot',
      'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; GPTBot/1.4; +https://openai.com/gptbot',
      'ai-crawler',
      'GPTBot',
    ],
    [
      'ChatGPT-User',
      'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; ChatGPT-User/1.0; +https://openai.com/bot',
      'ai-agent',
      'ChatGPT-User',
    ],
    [
      'Googlebot',
      'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Googlebot/2.1; +http://www.google.com/bot.html) Chrome/124.0.0.0 Safari/537.36',
      'search-crawler',
      'Googlebot',
    ],
    [
      'AhrefsBot',
      'Mozilla/5.0 (compatible; AhrefsBot/7.0; +http://ahrefs.com/robot/)',
      'seo-tool',
      'AhrefsBot',
    ],
    [
      'UptimeRobot',
      'Mozilla/5.0+(compatible; UptimeRobot/2.0; http://www.uptimerobot.com/)',
      'monitor',
      'UptimeRobot',
    ],
    [
      'facebookexternalhit',
      'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
      'link-preview',
      'Meta external hit',
    ],
  ])('%s scores 90 in category %s', (_, userAgent, botCategory, botProduct) => {
    expect(computeScore({ userAgent })).toMatchObject({
      botScore: 90,
      botCategory,
      botProduct,
    });
  });

  it('a named bot emits ua_named_bot', () => {
    expect(
      computeScore({ userAgent: 'Mozilla/5.0 (compatible; GPTBot/1.4)' }, WIRED)
        .botReasons,
    ).toEqual(['ua_named_bot']);
  });

  it('the AI map is consulted before isbot', () => {
    // isbot matches GPTBot too; the 80 rung must not win.
    expect(
      computeScore({ userAgent: 'Mozilla/5.0 (compatible; GPTBot/1.4)' })
        .botScore,
    ).toBe(90);
  });

  it('the AI map is consulted before the crawler map', () => {
    // Googlebot-shaped AI crawler tokens must not be relabelled search-crawler.
    expect(
      computeScore({
        userAgent: 'Mozilla/5.0 (compatible; Google-CloudVertexBot/1.0)',
      }).botCategory,
    ).toBe('ai-crawler');
  });

  it('an unnamed bot falls through to isbot at 80', () => {
    expect(computeScore({ userAgent: 'curl/8.4.0' }, WIRED)).toMatchObject({
      botScore: 80,
      botCategory: 'automation',
      botReasons: ['ua_isbot'],
    });
  });

  it('a real browser claiming a navigation on a beacon endpoint scores 75', () => {
    expect(
      computeScore(
        { ...cleanBeacon, secFetchDest: 'document', secFetchMode: 'navigate' },
        WIRED,
      ),
    ).toMatchObject({
      botScore: 75,
      botCategory: 'automation',
      botReasons: ['fetchmeta_impossible_for_context'],
    });
  });

  it('a beacon carrying a Content-Type sendBeacon cannot set scores 75', () => {
    expect(
      computeScore({ ...cleanBeacon, contentType: 'application/json' }, WIRED)
        .botReasons,
    ).toEqual(['content_type_impossible_for_context']);
  });

  it('a client-hint platform that contradicts the UA scores 75', () => {
    expect(
      computeScore({ ...cleanBeacon, secChUaPlatform: '"Windows"' }, WIRED),
    ).toMatchObject({
      botScore: 75,
      botCategory: 'automation',
      botReasons: ['ch_platform_contradiction'],
    });
  });

  it('a mobile client hint on a desktop UA contradicts it', () => {
    expect(
      computeScore({ ...cleanBeacon, secChUaMobile: '?1' }, WIRED).botCategory,
    ).toBe('automation');
  });

  it('a coherent platform and UA pair is not a contradiction', () => {
    expect(computeScore(cleanBeacon, WIRED).botCategory).toBe('human');
  });

  it('context-dependent contradictions never fire under auto', () => {
    expect(
      computeScore(
        { ...cleanBeacon, secFetchDest: 'document', secFetchMode: 'navigate' },
        { ...WIRED, context: 'auto' },
      ).botCategory,
    ).not.toBe('automation');
  });

  it('the server context runs no browser-shaped checks', () => {
    expect(
      computeScore(
        { ...cleanBeacon, secFetchDest: 'document', secFetchMode: 'navigate' },
        { ...WIRED, context: 'server' },
      ).botCategory,
    ).not.toBe('automation');
  });
});

describe('identity demotion', () => {
  const contradicted: Signals = {
    userAgent:
      'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; ChatGPT-User/1.0; +https://openai.com/bot',
    secFetchDest: 'document',
    secFetchMode: 'navigate',
  };

  it('keeps the score, because the client is still software', () => {
    expect(computeScore(contradicted, WIRED).botScore).toBe(90);
  });

  it('demotes the category and suppresses the claimed product', () => {
    const result = computeScore(contradicted, WIRED);
    expect(result.botCategory).toBe('automation');
    expect(result.botProduct).toBeUndefined();
  });

  it('records both the claim and the contradiction', () => {
    expect(computeScore(contradicted, WIRED).botReasons).toEqual([
      'ua_named_bot',
      'fetchmeta_impossible_for_context',
      'identity_claim_contradicted',
    ]);
  });
});

describe('graded layer', () => {
  it('a clean real browser on a wired pipeline emits no reasons', () => {
    expect(computeScore(cleanBeacon, WIRED)).toMatchObject({
      botScore: 0,
      botCategory: 'human',
      botReasons: [],
    });
  });

  it('a Chromium UA whose brands disagree on the major version is graded', () => {
    expect(
      computeScore(
        { ...cleanBeacon, secChUa: '"Chromium";v="98", "Not-A.Brand";v="99"' },
        WIRED,
      ),
    ).toMatchObject({
      botScore: 30,
      botCategory: 'suspicious',
      botReasons: ['ch_version_mismatch'],
    });
  });

  it('a Chromium UA with no client hints at all is graded', () => {
    const { secChUa: _omitted, ...withoutHints } = cleanBeacon;
    expect(computeScore(withoutHints, WIRED)).toMatchObject({
      botScore: 25,
      botCategory: 'suspicious',
      botReasons: ['ch_missing_on_chromium'],
    });
  });

  it.each([
    ['Firefox', firefoxUA],
    ['Safari', safariUA],
  ])('%s never enters the client-hint check, since it ships none', (_, ua) => {
    const { secChUa: _omitted, ...withoutHints } = cleanBeacon;
    expect(
      computeScore({ ...withoutHints, userAgent: ua }, WIRED).botReasons,
    ).not.toContain('ch_missing_on_chromium');
  });

  it('a wildcard Accept on a pixel endpoint is graded', () => {
    expect(
      computeScore(
        { ...cleanBeacon, accept: '*/*', contentType: undefined },
        { ...WIRED, context: 'pixel', declared: [...WIRED.declared, 'accept'] },
      ).botReasons,
    ).toContain('accept_generic_on_typed_context');
  });

  it('the identical Accept on a beacon endpoint is normal', () => {
    expect(computeScore(cleanBeacon, WIRED).botReasons).not.toContain(
      'accept_generic_on_typed_context',
    );
  });

  it('a modern UA sending no Fetch Metadata is graded', () => {
    const {
      secFetchSite: _a,
      secFetchMode: _b,
      secFetchDest: _c,
      ...withoutFetchMeta
    } = cleanBeacon;
    expect(computeScore(withoutFetchMeta, WIRED)).toMatchObject({
      botScore: 15,
      botReasons: ['fetchmeta_missing_on_modern_ua'],
    });
  });

  it('Safari before 16.4 never enters the Fetch Metadata check', () => {
    const {
      secFetchSite: _a,
      secFetchMode: _b,
      secFetchDest: _c,
      secChUa: _d,
      ...bare
    } = cleanBeacon;
    expect(
      computeScore({ ...bare, userAgent: oldSafariUA }, WIRED).botReasons,
    ).toEqual([]);
  });

  it('off-profile Fetch Metadata is a mismatch, not a contradiction', () => {
    expect(
      computeScore({ ...cleanBeacon, secFetchMode: 'cors' }, WIRED),
    ).toMatchObject({
      botScore: 15,
      botCategory: 'human',
      botReasons: ['fetchmeta_profile_mismatch'],
    });
  });

  it.each([
    ['acceptLanguage', 'accept_language_missing', 10],
    ['acceptEncoding', 'accept_encoding_missing', 5],
  ] as const)('a missing %s is graded', (name, code, weight) => {
    expect(
      computeScore({ ...cleanBeacon, [name]: undefined }, WIRED),
    ).toMatchObject({ botScore: weight, botReasons: [code] });
  });

  it('never reaches the deterministic layer on absence alone', () => {
    const { userAgent } = cleanBeacon;
    expect(computeScore({ userAgent }, WIRED).botScore).toBeLessThanOrEqual(60);
  });

  it('an in-app WebView stays below the drop threshold', () => {
    const { secChUa: _omitted, ...withoutHints } = cleanBeacon;
    const result = computeScore(
      { ...withoutHints, userAgent: webViewUA, secChUaPlatform: '"Android"' },
      WIRED,
    );
    expect(result.botScore).toBeLessThanOrEqual(50);
  });

  it('the cut between human and suspicious is configurable', () => {
    const { secChUa: _omitted, ...withoutHints } = cleanBeacon;
    expect(
      computeScore(withoutHints, { ...WIRED, suspiciousAt: 40 }).botCategory,
    ).toBe('human');
  });
});

describe('declared signals', () => {
  it('an undeclared client-hint family is skipped and reported', () => {
    const { secChUa: _omitted, ...withoutHints } = cleanBeacon;
    const reasons = computeScore(withoutHints, {
      context: 'beacon',
      declared: ['userAgent'],
    }).botReasons;
    expect(reasons).toContain('ch_not_declared');
    expect(reasons).not.toContain('ch_missing_on_chromium');
  });

  it.each([
    ['fetchmeta_not_declared', 'fetchmeta_missing_on_modern_ua'],
    ['accept_not_declared', 'accept_language_missing'],
  ])('%s replaces %s rather than joining it', (diagnostic, graded) => {
    const reasons = computeScore(
      { userAgent: chromeUA },
      { context: 'beacon', declared: ['userAgent'] },
    ).botReasons;
    expect(reasons).toContain(diagnostic);
    expect(reasons).not.toContain(graded);
  });

  it('an unpinned context is reported', () => {
    expect(computeScore({ userAgent: chromeUA }).botReasons).toContain(
      'context_undetermined',
    );
  });
});

describe('reason list invariants', () => {
  const samples: Signals[] = [
    {},
    { ip: '203.0.113.7' },
    cleanBeacon,
    { ...cleanBeacon, secChUa: '"Chromium";v="98"' },
    { userAgent: 'curl/8.4.0' },
    { userAgent: 'Mozilla/5.0 (compatible; GPTBot/1.4)' },
    { ...cleanBeacon, secFetchDest: 'document', secFetchMode: 'navigate' },
  ];

  it.each(samples.map((s, i) => [i, s] as const))(
    'sample %s emits no duplicate codes',
    (_, signals) => {
      const reasons = computeScore(signals, WIRED).botReasons;
      expect(new Set(reasons).size).toBe(reasons.length);
    },
  );

  it('Signature-Agent presence is recorded without a verification claim', () => {
    const result = computeScore(
      { ...cleanBeacon, signatureAgent: '"https://agent.example"' },
      WIRED,
    );
    expect(result.botReasons).toEqual(['signature_agent_present']);
    expect(result.botScore).toBe(0);
  });
});

describe('score range', () => {
  it.each([
    ['unknown', {}],
    ['graded', cleanBeacon],
    ['isbot', { userAgent: 'curl/8.4.0' }],
    ['named', { userAgent: 'Mozilla/5.0 (compatible; GPTBot/1.4)' }],
  ] as const)('%s stays within 0-99', (_, signals) => {
    const { botScore } = computeScore(signals, WIRED);
    if (botScore !== null) {
      expect(botScore).toBeGreaterThanOrEqual(0);
      expect(botScore).toBeLessThanOrEqual(99);
    }
  });
});
