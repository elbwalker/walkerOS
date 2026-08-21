import { isbot } from 'isbot';
import { agents, type AgentEntry } from '../data/agents';
import { crawlers, type CrawlerEntry } from '../data/crawlers';

export interface UAResult {
  isBot: boolean;
  agent?: { product: string; purpose: AgentEntry['purpose'] };
}

export function detectUA(ua: string): UAResult {
  const lower = ua.toLowerCase();
  const matched = agents.find((a) => lower.includes(a.match.toLowerCase()));
  return {
    isBot: !ua || isbot(ua) || matched !== undefined,
    agent: matched
      ? { product: matched.product, purpose: matched.purpose }
      : undefined,
  };
}

/** Non-AI crawler lookup. `agents` is scanned first, so an AI token wins. */
export function detectCrawler(ua: string): CrawlerEntry | undefined {
  const lower = ua.toLowerCase();
  return crawlers.find((c) => lower.includes(c.match.toLowerCase()));
}

export interface UAFamily {
  /**
   * A Chromium build that ships the low-entropy client hints. The iOS
   * wrappers (CriOS, EdgiOS, OPiOS) are WebKit underneath and send none.
   */
  sendsClientHints: boolean;
  /** Claimed Chromium major version, when the UA states one. */
  chromiumMajor?: number;
  /** The claimed browser version is one that shipped Fetch Metadata. */
  shipsFetchMetadata: boolean;
}

const IOS_WRAPPER = /(CriOS|FxiOS|EdgiOS|OPiOS|EdgA?iOS)\//;
const CHROMIUM_MAJOR = /Chrom(?:e|ium)\/(\d+)/;
const FIREFOX_MAJOR = /Firefox\/(\d+)/;
const SAFARI_VERSION = /Version\/(\d+)(?:\.(\d+))?/;

/** Client hints shipped in Chrome 89, Fetch Metadata in Chrome 76. */
const CHROMIUM_CLIENT_HINTS = 89;
const CHROMIUM_FETCH_METADATA = 76;
const FIREFOX_FETCH_METADATA = 90;
const SAFARI_FETCH_METADATA = { major: 16, minor: 4 };

/**
 * Reads what a UA claims about itself. Every field fails closed: a version that
 * cannot be read confidently reports the capability as absent, so an
 * absence-based heuristic never fires on a UA we could not parse.
 */
export function parseUAFamily(ua: string): UAFamily {
  const iosWrapper = IOS_WRAPPER.test(ua);
  const chromiumMatch = CHROMIUM_MAJOR.exec(ua);
  const chromiumMajor =
    !iosWrapper && chromiumMatch ? Number(chromiumMatch[1]) : undefined;

  let shipsFetchMetadata =
    chromiumMajor !== undefined && chromiumMajor >= CHROMIUM_FETCH_METADATA;

  if (!shipsFetchMetadata && !iosWrapper) {
    const firefoxMatch = FIREFOX_MAJOR.exec(ua);
    if (firefoxMatch) {
      shipsFetchMetadata = Number(firefoxMatch[1]) >= FIREFOX_FETCH_METADATA;
    } else if (chromiumMajor === undefined && /Safari\//.test(ua)) {
      const safariMatch = SAFARI_VERSION.exec(ua);
      if (safariMatch) {
        const major = Number(safariMatch[1]);
        const minor = Number(safariMatch[2] ?? 0);
        shipsFetchMetadata =
          major > SAFARI_FETCH_METADATA.major ||
          (major === SAFARI_FETCH_METADATA.major &&
            minor >= SAFARI_FETCH_METADATA.minor);
      }
    }
  }

  return {
    sendsClientHints:
      chromiumMajor !== undefined && chromiumMajor >= CHROMIUM_CLIENT_HINTS,
    chromiumMajor,
    shipsFetchMetadata,
  };
}
