import { isbot } from 'isbot';
import type { CrawlerCategory } from '../data/crawlers';
import {
  contextProfile,
  pinnedContext,
  type BotContext,
  type ContextProfile,
} from './context';
import {
  parseSecChUa,
  parseSecChUaMobile,
  parseSecChUaPlatform,
} from './secChUa';
import { detectCrawler, detectUA, parseUAFamily, type UAFamily } from './ua';

/**
 * Request signals handed to the scorer. An absent value and an empty string
 * are equivalent: both mean the signal was not present on the request.
 */
export interface Signals {
  userAgent?: string;
  ip?: string;
  acceptLanguage?: string;
  acceptEncoding?: string;
  secFetchSite?: string;
  secFetchMode?: string;
  secFetchDest?: string;
  secFetchUser?: string;
  secChUa?: string;
  secChUaMobile?: string;
  secChUaPlatform?: string;
  accept?: string;
  contentType?: string;
  referer?: string;
  signatureAgent?: string;
  method?: string;
  /** Reserved: resolved but not consumed. */
  ja4?: string;
  /** Reserved: resolved but not consumed. */
  headerNames?: string;
}

export type SignalName = keyof Signals;

/**
 * What kind of client issued the request. `botScore` says how automated it is,
 * this says what it is.
 */
export type BotCategory =
  | 'human'
  | 'suspicious'
  | 'automation'
  | CrawlerCategory
  | 'ai-agent'
  | 'ai-crawler'
  | 'unknown';

export interface ScoreResult {
  /**
   * Automation likelihood, 0-99, higher = more automated. `null` means not
   * measured, never "human".
   */
  botScore: number | null;
  botCategory: BotCategory;
  /** Identified product, set only when a named detector matched. */
  botProduct?: string;
  /** Stable reason codes. Semver-stable public API. */
  botReasons: string[];
}

export interface ScoreOptions {
  /** Pinning a context is what enables the context-dependent checks. */
  context?: BotContext;
  /** Graded-layer cut between `human` and `suspicious`. */
  suspiciousAt?: number;
  /**
   * Input names the operator explicitly listed in `settings.input`. An
   * absence-based heuristic runs only for a declared name, because "the client
   * did not send this header" and "the operator never mapped it" both resolve
   * to undefined and only the operator knows which one it is.
   */
  declared?: readonly SignalName[];
}

export const DEFAULT_SUSPICIOUS_AT = 25;

/** The graded layer caps here; the deterministic layer starts at 70. */
const GRADED_CAP = 60;

const SCORE_UA_MISSING = 70;
const SCORE_CONTRADICTION = 75;
const SCORE_ISBOT = 80;
const SCORE_NAMED_BOT = 90;

const FETCH_META_NAMES: SignalName[] = [
  'secFetchSite',
  'secFetchMode',
  'secFetchDest',
];
const ACCEPT_NAMES: SignalName[] = ['acceptLanguage', 'acceptEncoding'];

/** Sec-CH-UA-Platform values, and the UA token each one requires. */
const PLATFORM_UA_TOKENS: Record<string, RegExp> = {
  Windows: /Windows/i,
  macOS: /Macintosh|Mac OS X/i,
  Android: /Android/i,
  iOS: /iPhone|iPad|iPod/i,
  Linux: /Linux/i,
  'Chrome OS': /CrOS/i,
  'Chromium OS': /CrOS/i,
};

const MOBILE_UA_TOKENS = /Mobile|Android|iPhone|iPad|iPod/i;

interface GradedFinding {
  code: string;
  weight: number;
}

const signalPresent = (value: string | undefined): value is string =>
  typeof value === 'string' && value !== '';

const hasAnySignal = (signals: Signals): boolean =>
  Object.values(signals).some(signalPresent);

/** True when the first media range of an Accept header is a bare wildcard. */
function isGenericAccept(accept: string): boolean {
  const first = accept.split(',')[0].split(';')[0].trim();
  return first === '*/*';
}

/**
 * Compares Fetch Metadata against the context's browser-truth profile.
 * `impossible` means no real browser can produce this here; `mismatch` means
 * the values are merely off-profile.
 */
function fetchMetaVerdict(
  profile: ContextProfile,
  isNavigation: boolean,
  signals: Signals,
): 'ok' | 'impossible' | 'mismatch' {
  const dest = signals.secFetchDest;
  const mode = signals.secFetchMode;

  if (isNavigation) {
    if (
      (signalPresent(dest) && dest !== profile.dest) ||
      (signalPresent(mode) && !profile.modes.includes(mode))
    )
      return 'impossible';
  } else if (
    dest === 'document' ||
    mode === 'navigate' ||
    (!profile.allowsFetchUser && signalPresent(signals.secFetchUser))
  ) {
    return 'impossible';
  }

  if (
    (signalPresent(dest) && dest !== profile.dest) ||
    (signalPresent(mode) && !profile.modes.includes(mode))
  )
    return 'mismatch';

  return 'ok';
}

/** A Content-Type the context cannot produce, e.g. anything but text/plain on a beacon. */
function contentTypeImpossible(
  profile: ContextProfile,
  signals: Signals,
): boolean {
  const prefix = profile.contentTypePrefix;
  if (!prefix || !signalPresent(signals.contentType)) return false;
  return !signals.contentType.toLowerCase().startsWith(prefix);
}

/** The client-hint platform description disagrees with the UA it accompanies. */
function chPlatformContradiction(signals: Signals, ua: string): boolean {
  if (signalPresent(signals.secChUaPlatform)) {
    const platform = parseSecChUaPlatform(signals.secChUaPlatform);
    const required = platform ? PLATFORM_UA_TOKENS[platform] : undefined;
    if (required && !required.test(ua)) return true;
    // Every Android UA also says Linux, so Linux additionally excludes Android.
    if (platform === 'Linux' && /Android/i.test(ua)) return true;
  }

  if (
    signalPresent(signals.secChUaMobile) &&
    parseSecChUaMobile(signals.secChUaMobile) === true &&
    !MOBILE_UA_TOKENS.test(ua)
  )
    return true;

  return false;
}

/** No non-GREASE brand agrees with the Chromium major the UA claims. */
function chVersionMismatch(secChUa: string, family: UAFamily): boolean {
  if (family.chromiumMajor === undefined) return false;
  const brands = parseSecChUa(secChUa);
  if (!brands.length) return false;
  const major = String(family.chromiumMajor);
  return !brands.some((brand) => brand.version === major);
}

function detectContradictions(
  signals: Signals,
  ua: string,
  context: ReturnType<typeof pinnedContext>,
): string[] {
  const codes: string[] = [];
  const profile = context ? contextProfile(context) : undefined;

  if (profile) {
    if (
      fetchMetaVerdict(profile, context === 'navigation', signals) ===
      'impossible'
    )
      codes.push('fetchmeta_impossible_for_context');
    if (contentTypeImpossible(profile, signals))
      codes.push('content_type_impossible_for_context');
  }

  if (chPlatformContradiction(signals, ua))
    codes.push('ch_platform_contradiction');

  return codes;
}

function gradedFindings(
  signals: Signals,
  ua: string,
  context: ReturnType<typeof pinnedContext>,
  declared: ReadonlySet<SignalName>,
): GradedFinding[] {
  const findings: GradedFinding[] = [];
  const family = parseUAFamily(ua);
  const profile = context ? contextProfile(context) : undefined;

  if (signalPresent(signals.secChUa)) {
    if (chVersionMismatch(signals.secChUa, family))
      findings.push({ code: 'ch_version_mismatch', weight: 30 });
  } else if (declared.has('secChUa') && family.sendsClientHints) {
    findings.push({ code: 'ch_missing_on_chromium', weight: 25 });
  }

  if (
    profile?.typedAccept &&
    signalPresent(signals.accept) &&
    isGenericAccept(signals.accept)
  )
    findings.push({ code: 'accept_generic_on_typed_context', weight: 25 });

  const fetchMetaDeclared = FETCH_META_NAMES.filter((name) =>
    declared.has(name),
  );
  if (
    fetchMetaDeclared.length &&
    fetchMetaDeclared.every((name) => !signalPresent(signals[name])) &&
    family.shipsFetchMetadata
  ) {
    findings.push({ code: 'fetchmeta_missing_on_modern_ua', weight: 15 });
  } else if (
    profile &&
    fetchMetaVerdict(profile, context === 'navigation', signals) === 'mismatch'
  ) {
    findings.push({ code: 'fetchmeta_profile_mismatch', weight: 15 });
  }

  if (declared.has('acceptLanguage') && !signalPresent(signals.acceptLanguage))
    findings.push({ code: 'accept_language_missing', weight: 10 });

  if (declared.has('acceptEncoding') && !signalPresent(signals.acceptEncoding))
    findings.push({ code: 'accept_encoding_missing', weight: 5 });

  return findings;
}

/**
 * Scores a request. Pure and synchronous: every signal arrives in the bag, and
 * nothing here performs I/O.
 *
 * Deterministic precedence, most specific first, first match wins:
 *   1. UA absent                        -> 70, automation
 *   2. AI agent UA map                  -> 90, ai-agent or ai-crawler
 *   3. Non-AI crawler UA map            -> 90, category from the entry
 *   4. isbot                            -> 80, automation
 *   5. Impossible-for-context values    -> 75, automation
 *
 * A UA-map match co-occurring with a contradiction keeps its score, because the
 * client is still software, but loses its claimed identity: the category drops
 * to `automation` and no `botProduct` is written.
 *
 * When no rung fires, the graded layer adds weighted evidence and caps at 60,
 * so every emitted score is attributable to exactly one layer.
 */
export function computeScore(
  signals: Signals,
  options: ScoreOptions = {},
): ScoreResult {
  const context = pinnedContext(options.context);
  const declared = new Set(options.declared ?? []);
  const suspiciousAt = options.suspiciousAt ?? DEFAULT_SUSPICIOUS_AT;
  const ua = signals.userAgent ?? '';

  // Configuration facts, identical for every event on a given pipeline. They
  // are what turns botReasons into a wiring diagnostic.
  const notes: string[] = [];
  if (signalPresent(signals.signatureAgent))
    notes.push('signature_agent_present');
  if (!context) notes.push('context_undetermined');
  if (!declared.has('secChUa')) notes.push('ch_not_declared');
  if (!FETCH_META_NAMES.some((name) => declared.has(name)))
    notes.push('fetchmeta_not_declared');
  if (!ACCEPT_NAMES.some((name) => declared.has(name)))
    notes.push('accept_not_declared');

  if (!hasAnySignal(signals))
    return { botScore: null, botCategory: 'unknown', botReasons: notes };

  if (!ua)
    return {
      botScore: SCORE_UA_MISSING,
      botCategory: 'automation',
      botReasons: ['ua_missing', ...notes],
    };

  const contradictions = detectContradictions(signals, ua, context);
  const uaResult = detectUA(ua);
  const crawler = uaResult.agent ? undefined : detectCrawler(ua);

  const named: { product: string; category: BotCategory } | undefined =
    uaResult.agent
      ? {
          product: uaResult.agent.product,
          category:
            uaResult.agent.purpose === 'user-action'
              ? 'ai-agent'
              : 'ai-crawler',
        }
      : crawler
        ? { product: crawler.product, category: crawler.category }
        : undefined;

  if (named) {
    if (contradictions.length)
      return {
        botScore: SCORE_NAMED_BOT,
        botCategory: 'automation',
        botReasons: [
          'ua_named_bot',
          ...contradictions,
          'identity_claim_contradicted',
          ...notes,
        ],
      };

    return {
      botScore: SCORE_NAMED_BOT,
      botCategory: named.category,
      botProduct: named.product,
      botReasons: ['ua_named_bot', ...notes],
    };
  }

  if (isbot(ua))
    return {
      botScore: SCORE_ISBOT,
      botCategory: 'automation',
      botReasons: ['ua_isbot', ...notes],
    };

  if (contradictions.length)
    return {
      botScore: SCORE_CONTRADICTION,
      botCategory: 'automation',
      botReasons: [...contradictions, ...notes],
    };

  const findings = gradedFindings(signals, ua, context, declared);
  const score = Math.min(
    findings.reduce((sum, finding) => sum + finding.weight, 0),
    GRADED_CAP,
  );

  return {
    botScore: score,
    botCategory: score >= suspiciousAt ? 'suspicious' : 'human',
    botReasons: [...findings.map((finding) => finding.code), ...notes],
  };
}
