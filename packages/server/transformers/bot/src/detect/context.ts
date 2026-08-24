/**
 * Request-context model.
 *
 * Every published bot heuristic carries an unstated assumption about how the
 * request was made, and almost all of them assume a top-level navigation. A
 * collector sees beacons, pixels, fetches and server-to-server posts, where the
 * same header value can mean the opposite thing. a wildcard `Accept` from a
 * browser UA is normal on a beacon and anomalous on a pixel.
 *
 * `auto` never determines a context. Absence of `Sec-Fetch-*` is both a signal
 * worth scoring and the reason auto-derivation fails, and the request method
 * does not rescue it: a GET is a pixel, a navigation or a `fetch()` GET, and
 * the first two expect a typed `Accept` while the third correctly sends a wildcard.
 * So context-dependent checks run only under a pinned context. The failure mode
 * is "we scored less", never "we scored wrong".
 */

export type BotContext =
  | 'auto'
  | 'navigation'
  | 'pixel'
  | 'beacon'
  | 'fetch'
  | 'server';

const BOT_CONTEXTS: ReadonlySet<string> = new Set<BotContext>([
  'auto',
  'navigation',
  'pixel',
  'beacon',
  'fetch',
  'server',
]);

/** True when the value is one of the six BotContext literals. */
export function isBotContext(value: unknown): value is BotContext {
  return typeof value === 'string' && BOT_CONTEXTS.has(value);
}

export type PinnedContext = Exclude<BotContext, 'auto'>;

export interface ContextProfile {
  /** The only Sec-Fetch-Dest a real browser sends in this context. */
  dest: string;
  /** Sec-Fetch-Mode values a real browser can send in this context. */
  modes: string[];
  /** Sec-Fetch-User is only ever sent on a user-activated navigation. */
  allowsFetchUser: boolean;
  /** Browsers send a media-type-specific Accept here, never a bare wildcard. */
  typedAccept: boolean;
  /** Lowercased Content-Type prefix the context forces, when it forces one. */
  contentTypePrefix?: string;
}

/**
 * Browser-truth profiles. `server` has no entry: no browser is involved, so
 * every browser-shaped check is meaningless there.
 */
export const CONTEXT_PROFILES: Record<
  Exclude<PinnedContext, 'server'>,
  ContextProfile
> = {
  navigation: {
    dest: 'document',
    modes: ['navigate'],
    allowsFetchUser: true,
    typedAccept: true,
  },
  pixel: {
    dest: 'image',
    modes: ['no-cors'],
    allowsFetchUser: false,
    typedAccept: true,
  },
  beacon: {
    dest: 'empty',
    modes: ['no-cors'],
    allowsFetchUser: false,
    typedAccept: false,
    contentTypePrefix: 'text/plain',
  },
  fetch: {
    dest: 'empty',
    modes: ['cors', 'no-cors'],
    allowsFetchUser: false,
    typedAccept: false,
  },
};

/** Resolves the pinned context, or undefined when checks must not run. */
export function pinnedContext(
  context: BotContext | undefined,
): PinnedContext | undefined {
  return context && context !== 'auto' ? context : undefined;
}

/** The profile for a pinned context, or undefined for `server`. */
export function contextProfile(
  context: PinnedContext,
): ContextProfile | undefined {
  return context === 'server' ? undefined : CONTEXT_PROFILES[context];
}
