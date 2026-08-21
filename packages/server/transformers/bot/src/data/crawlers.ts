/**
 * Curated non-AI crawler UA-substring map (2026-Q3).
 *
 * Sibling of `agents.ts`, which holds the AI agents and AI crawlers. The two
 * files stay separate on purpose: an AhrefsBot hit and a GPTBot hit answer
 * different questions. `agents.ts` is scanned FIRST, this file second; adding a
 * row whose match is a substring of an AI token would therefore be shadowed.
 *
 * Each entry: a substring matched case-insensitively against the User-Agent, a
 * product label, and the category written to botCategory.
 *
 * Category semantics:
 *   - 'search-crawler' — a search engine index; correlates with organic discoverability
 *   - 'seo-tool'       — third-party commercial crawler building its own data set
 *   - 'monitor'        — uptime and synthetic monitoring, usually the site owner's own
 *   - 'link-preview'   — link unfurler, meaning a person just shared this URL
 *
 * Order matters: first-hit wins. More-specific entries must precede broader
 * ones. Three orderings are load-bearing and non-obvious:
 *   - `adidxbot` before `bingbot`: every adidxbot UA carries the literal string
 *     `bingbot` in its trailing info URL.
 *   - `TelegramBot` before `Twitterbot`: Telegram's UA is `TelegramBot (like TwitterBot)`.
 *   - `Googlebot` last in the Google block: it is a substring of `Googlebot-Image/1.0`
 *     and `Googlebot-Video/1.0`.
 *
 * A UA match is a claim, not proof: Screaming Frog ships Googlebot and Bingbot
 * presets, and any client can send any UA. Vendor IP ranges and reverse DNS
 * suffixes for the entries that publish them are listed in
 * `docs/research/2026-08-20-search-crawler-list.md` and are consumed once
 * identity verification exists.
 *
 * Vendor docs of record (verified 2026-08):
 *   Google:          https://developers.google.com/search/docs/crawling-indexing/google-common-crawlers
 *   Microsoft:       https://www.bing.com/webmasters/help/which-crawlers-does-bing-use-8c184ec0
 *   Apple:           https://support.apple.com/en-us/119829
 *   DuckDuckGo:      https://duckduckgo.com/duckduckbot
 *   Yandex:          https://yandex.com/support/webmaster/robot-workings/check-yandex-robots.html
 *   Baidu:           http://help.baidu.com/question?prod_en=master&class=Baiduspider
 *   Huawei:          https://aspiegel.com/petalbot
 *   Yahoo:           https://help.yahoo.com/kb/SLN22600.html
 *   Ahrefs:          https://ahrefs.com/robot
 *   Semrush:         https://www.semrush.com/bot/
 *   Majestic:        https://mj12bot.com/
 *   Screaming Frog:  https://www.screamingfrog.co.uk/seo-spider/user-guide/configuration/
 *   UptimeRobot:     https://help.uptimerobot.com/en/articles/11358489-what-is-the-uptimerobot-user-agent-string
 *   Meta:            https://developers.facebook.com/docs/sharing/webmasters/web-crawlers
 *   X:               https://developer.x.com/en/docs/x-for-websites/cards/guides/getting-started
 *   Slack:           https://api.slack.com/robots
 *   WhatsApp:        https://developers.facebook.com/documentation/business-messaging/whatsapp/link-previews/
 *
 * Entries without a readable vendor page (SeznamBot, Yeti, Discordbot,
 * TelegramBot, Pingdom, StatusCake, DotBot) rest on the self-reference in the
 * UA string itself. Reviewed quarterly.
 *
 * Deliberately excluded: `Googlebot-News`, `Google-Extended` and
 * `Applebot-Extended` are robots.txt directives that never appear in a UA
 * header. `Google-Agent` and `Google-GeminiNotebook` are AI agents and live in
 * `agents.ts`.
 */
export type CrawlerCategory =
  | 'search-crawler'
  | 'seo-tool'
  | 'monitor'
  | 'link-preview';

export interface CrawlerEntry {
  match: string;
  product: string;
  category: CrawlerCategory;
}

export const crawlers: CrawlerEntry[] = [
  // --- Search engines ---
  {
    match: 'Googlebot-Image',
    product: 'Googlebot Image',
    category: 'search-crawler',
  },
  {
    match: 'Googlebot-Video',
    product: 'Googlebot Video',
    category: 'search-crawler',
  },
  {
    match: 'Storebot-Google',
    product: 'Google StoreBot',
    category: 'search-crawler',
  },
  {
    match: 'Google-InspectionTool',
    product: 'Google InspectionTool',
    category: 'search-crawler',
  },
  {
    match: 'GoogleOther-Image',
    product: 'GoogleOther Image',
    category: 'search-crawler',
  },
  {
    match: 'GoogleOther-Video',
    product: 'GoogleOther Video',
    category: 'search-crawler',
  },
  { match: 'GoogleOther', product: 'GoogleOther', category: 'search-crawler' },
  { match: 'Googlebot', product: 'Googlebot', category: 'search-crawler' },
  { match: 'adidxbot', product: 'AdIdxBot', category: 'search-crawler' },
  { match: 'bingbot', product: 'Bingbot', category: 'search-crawler' },
  { match: 'Applebot', product: 'Applebot', category: 'search-crawler' },
  { match: 'DuckDuckBot', product: 'DuckDuckBot', category: 'search-crawler' },
  { match: 'YandexBot', product: 'YandexBot', category: 'search-crawler' },
  { match: 'Baiduspider', product: 'Baiduspider', category: 'search-crawler' },
  { match: 'PetalBot', product: 'PetalBot', category: 'search-crawler' },
  { match: 'SeznamBot', product: 'SeznamBot', category: 'search-crawler' },
  { match: 'Yeti/', product: 'Naver Yeti', category: 'search-crawler' },
  { match: 'Slurp', product: 'Yahoo Slurp', category: 'search-crawler' },

  // --- SEO tooling ---
  {
    match: 'AhrefsSiteAudit',
    product: 'Ahrefs Site Audit',
    category: 'seo-tool',
  },
  { match: 'AhrefsBot', product: 'AhrefsBot', category: 'seo-tool' },
  { match: 'SemrushBot', product: 'SemrushBot', category: 'seo-tool' },
  {
    match: 'SiteAuditBot',
    product: 'Semrush Site Audit',
    category: 'seo-tool',
  },
  { match: 'DotBot', product: 'Moz DotBot', category: 'seo-tool' },
  { match: 'MJ12bot', product: 'MJ12bot', category: 'seo-tool' },
  {
    match: 'Screaming Frog SEO Spider',
    product: 'Screaming Frog',
    category: 'seo-tool',
  },

  // --- Uptime and synthetic monitoring ---
  { match: 'UptimeRobot', product: 'UptimeRobot', category: 'monitor' },
  { match: 'Pingdom', product: 'Pingdom', category: 'monitor' },
  { match: 'StatusCake', product: 'StatusCake', category: 'monitor' },

  // --- Link unfurlers ---
  {
    match: 'facebookexternalhit',
    product: 'Meta external hit',
    category: 'link-preview',
  },
  { match: 'TelegramBot', product: 'TelegramBot', category: 'link-preview' },
  { match: 'Twitterbot', product: 'Twitterbot', category: 'link-preview' },
  { match: 'LinkedInBot', product: 'LinkedInBot', category: 'link-preview' },
  {
    match: 'Slackbot-LinkExpanding',
    product: 'Slack link expanding',
    category: 'link-preview',
  },
  { match: 'Slackbot', product: 'Slackbot', category: 'link-preview' },
  { match: 'Discordbot', product: 'Discordbot', category: 'link-preview' },
  { match: 'WhatsApp/', product: 'WhatsApp', category: 'link-preview' },
];
