import { agents } from '../data/agents';
import { crawlers } from '../data/crawlers';
import { detectCrawler, detectUA, parseUAFamily } from '../detect/ua';

describe('detectUA', () => {
  test('empty UA returns isBot true, no agent', () => {
    expect(detectUA('')).toEqual({ isBot: true, agent: undefined });
  });

  test('plain Chrome returns isBot false, no agent', () => {
    const ua =
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
    expect(detectUA(ua)).toEqual({ isBot: false, agent: undefined });
  });

  test('curl is caught by isbot', () => {
    expect(detectUA('curl/8.4.0').isBot).toBe(true);
  });

  test('GPTBot matches training-purpose agent', () => {
    const ua =
      'Mozilla/5.0 (compatible; GPTBot/1.2; +https://openai.com/gptbot)';
    expect(detectUA(ua).agent).toEqual({
      product: 'GPTBot',
      purpose: 'training',
    });
  });

  test('ChatGPT-User matches user-action agent', () => {
    const ua =
      'Mozilla/5.0 AppleWebKit/537.36; compatible; ChatGPT-User/1.0; +https://openai.com/bot';
    expect(detectUA(ua).agent).toEqual({
      product: 'ChatGPT-User',
      purpose: 'user-action',
    });
  });

  test('Claude-SearchBot matches before Claude-User (order specificity)', () => {
    expect(
      detectUA('Mozilla/5.0 (compatible; Claude-SearchBot/1.0)').agent?.product,
    ).toBe('Claude-SearchBot');
  });

  test('Claude-User matches before ClaudeBot', () => {
    expect(
      detectUA('Mozilla/5.0 (compatible; Claude-User/1.0)').agent?.product,
    ).toBe('Claude-User');
  });

  test('Google-Agent matches as user-action', () => {
    expect(
      detectUA('Mozilla/5.0 (compatible; Google-Agent/1.0)').agent,
    ).toEqual({ product: 'Google-Agent', purpose: 'user-action' });
  });

  test('ChatGPT-Agent matches as user-action', () => {
    expect(
      detectUA('Mozilla/5.0 (compatible; ChatGPT-Agent/1.0)').agent,
    ).toEqual({ product: 'ChatGPT-Agent', purpose: 'user-action' });
  });

  test('matching is case-insensitive', () => {
    expect(detectUA('gptbot/1.0').agent?.product).toBe('GPTBot');
  });
});

describe('robots.txt-only tokens', () => {
  // These are opt-out directives, not user agents, so no UA can ever carry
  // them. A row for one is a row that can never fire.
  const tokens = ['Google-Extended', 'Applebot-Extended', 'Googlebot-News'];

  it.each(tokens)('%s is absent from both UA maps', (token) => {
    expect(agents.map((a) => a.match)).not.toContain(token);
    expect(crawlers.map((c) => c.match)).not.toContain(token);
  });
});

describe('detectCrawler', () => {
  it.each([
    [
      'Googlebot desktop',
      'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Googlebot/2.1; +http://www.google.com/bot.html) Chrome/124.0.0.0 Safari/537.36',
      'Googlebot',
    ],
    ['Googlebot Image', 'Googlebot-Image/1.0', 'Googlebot Image'],
    ['GoogleOther Image', 'GoogleOther-Image/1.0', 'GoogleOther Image'],
    [
      'GoogleOther desktop',
      'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GoogleOther) Chrome/124.0.0.0 Safari/537.36',
      'GoogleOther',
    ],
    [
      'Google-InspectionTool',
      'Mozilla/5.0 (compatible; Google-InspectionTool/1.0)',
      'Google InspectionTool',
    ],
    [
      'Applebot',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.1.1 Safari/605.1.15 (Applebot/0.1; +http://www.apple.com/go/applebot)',
      'Applebot',
    ],
    ['Screaming Frog', 'Screaming Frog SEO Spider/21.4', 'Screaming Frog'],
    [
      'Slackbot link expanding',
      'Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)',
      'Slack link expanding',
    ],
    ['WhatsApp', 'WhatsApp/2.23.20.0 A', 'WhatsApp'],
  ])('%s resolves to %s', (_, ua, product) => {
    expect(detectCrawler(ua)?.product).toBe(product);
  });

  test('adidxbot matches before bingbot, whose token it contains', () => {
    expect(
      detectCrawler(
        'Mozilla/5.0 (compatible; adidxbot/2.0; +http://www.bing.com/bingbot.htm)',
      )?.product,
    ).toBe('AdIdxBot');
  });

  test('TelegramBot matches before Twitterbot, whose token it contains', () => {
    expect(detectCrawler('TelegramBot (like TwitterBot)')?.product).toBe(
      'TelegramBot',
    );
  });

  test('a real browser matches nothing', () => {
    expect(
      detectCrawler(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      ),
    ).toBeUndefined();
  });

  test('matching is case-insensitive', () => {
    expect(detectCrawler('googlebot/2.1')?.product).toBe('Googlebot');
  });
});

describe('detectCrawler monitors', () => {
  it.each([
    [
      'Uptrends',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 uptrends',
      'Uptrends',
    ],
    [
      'Site24x7',
      'Mozilla/5.0 (compatible; Site24x7/1.0; +https://www.site24x7.com/)',
      'Site24x7',
    ],
    ['Datadog Synthetics API test', 'Datadog/Synthetics', 'Datadog Synthetics'],
    [
      'Datadog Synthetics browser test',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36 DatadogSynthetics',
      'Datadog Synthetics',
    ],
    [
      'New Relic Synthetics',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.60 Safari/537.36 NewRelicSynthetics/1.0',
      'New Relic Synthetics',
    ],
    [
      'Better Stack',
      'Better Uptime Bot Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
      'Better Stack',
    ],
    [
      'HetrixTools',
      'HetrixTools Uptime Monitoring Bot. https://hetrix.tools/uptime-monitoring-bot.html',
      'HetrixTools',
    ],
    [
      'updown.io',
      'Mozilla/5.0 (compatible; updown.io daemon 2.4)',
      'updown.io',
    ],
    [
      'Oh Dear',
      'Mozilla/5.0 (compatible; OhDear/1.1; +https://ohdear.app/checker)',
      'Oh Dear',
    ],
    [
      'GTmetrix',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 GTmetrix',
      'GTmetrix',
    ],
  ])('%s resolves to the named monitor %s', (_, ua, product) => {
    expect(detectCrawler(ua)).toMatchObject({ product, category: 'monitor' });
  });

  test('Better Uptime Bot does not shadow UptimeRobot', () => {
    expect(
      detectCrawler(
        'Mozilla/5.0+(compatible; UptimeRobot/2.0; http://www.uptimerobot.com/)',
      )?.product,
    ).toBe('UptimeRobot');
  });
});

describe('crawler token reachability', () => {
  // An entry whose token contains an earlier entry's token can never fire: the
  // earlier, broader row always wins the first-hit scan.
  test('no entry is shadowed by an earlier, broader token', () => {
    const shadowed = crawlers
      .filter((entry, index) =>
        crawlers
          .slice(0, index)
          .some((earlier) =>
            entry.match.toLowerCase().includes(earlier.match.toLowerCase()),
          ),
      )
      .map((entry) => entry.match);

    expect(shadowed).toEqual([]);
  });
});

describe('parseUAFamily', () => {
  it.each([
    [
      'Chrome 124 desktop',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      { sendsClientHints: true, chromiumMajor: 124, shipsFetchMetadata: true },
    ],
    [
      'Chrome 88, before client hints',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.0.0 Safari/537.36',
      { sendsClientHints: false, chromiumMajor: 88, shipsFetchMetadata: true },
    ],
    [
      'Chrome on iOS is WebKit underneath',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/119.0.0.0 Mobile/15E148 Safari/604.1',
      {
        sendsClientHints: false,
        chromiumMajor: undefined,
        shipsFetchMetadata: false,
      },
    ],
    [
      'Firefox 126',
      'Mozilla/5.0 (X11; Linux x86_64; rv:126.0) Gecko/20100101 Firefox/126.0',
      {
        sendsClientHints: false,
        chromiumMajor: undefined,
        shipsFetchMetadata: true,
      },
    ],
    [
      'Safari 17.4',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
      {
        sendsClientHints: false,
        chromiumMajor: undefined,
        shipsFetchMetadata: true,
      },
    ],
    [
      'Safari 15.6, before Fetch Metadata',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 15_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.6 Mobile/15E148 Safari/604.1',
      {
        sendsClientHints: false,
        chromiumMajor: undefined,
        shipsFetchMetadata: false,
      },
    ],
    [
      'headless Chrome still reads as Chromium',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/152.0.0.0 Safari/537.36',
      { sendsClientHints: true, chromiumMajor: 152, shipsFetchMetadata: true },
    ],
    [
      'an unparseable UA claims nothing',
      'curl/8.4.0',
      {
        sendsClientHints: false,
        chromiumMajor: undefined,
        shipsFetchMetadata: false,
      },
    ],
  ])('%s', (_, ua, expected) => {
    expect(parseUAFamily(ua)).toEqual(expected);
  });
});
