import type {
  Mapping as WalkerOSMapping,
  Destination as CoreDestination,
} from '@walkeros/core';
import type { DestinationWeb } from '@walkeros/web-core';

/**
 * Some of TikTok's standard event names, for IDE autocomplete on
 * `mapping.name`. TikTok's own list is the complete one:
 * https://ads.tiktok.com/help/article/standard-events-parameters
 * `| string` allows any other name.
 */
export type StandardEventNames =
  | 'ViewContent'
  | 'Search'
  | 'AddToWishlist'
  | 'AddToCart'
  | 'InitiateCheckout'
  | 'AddPaymentInfo'
  | 'Purchase'
  | 'Contact'
  | 'Download'
  | 'SubmitForm'
  | 'CompleteRegistration'
  | 'Subscribe'
  | (string & {});

/**
 * Settings (destination-level).
 *
 * apiKey is the TikTok Pixel ID. `identify` resolves to Advanced Matching
 * parameters (email, phone_number, external_id); the destination passes them
 * to ttq.identify() unhashed, and TikTok states that its Pixel hashes email
 * and phone number. Event sections to flatten into prefixed TikTok event
 * parameters go in `config.include` (or a rule's `include`), not here. All
 * other TikTok-native snake_case options (e.g., `auto_config`,
 * `limited_data_use`) are passed through to `ttq.load(apiKey, options)`.
 */
export interface Settings {
  /** TikTok Pixel ID, the first argument to ttq.load(...). Required. */
  apiKey: string;
  /**
   * walkerOS mapping value resolving to an Advanced Matching object with any
   * of: `email`, `phone_number`, `external_id`. Applied on first push and
   * re-fired only on change (runtime state in _state.lastIdentity).
   */
  identify?: WalkerOSMapping.Value;
  // No `pageview` setting: the destination calls no ttq.page().
  /** Enable auto-detection of form fields for Advanced Matching. Forwarded to ttq.load(); when unset, the TikTok default applies. */
  auto_config?: boolean;
  /** Restrict data use under U.S. state privacy laws. Forwarded to ttq.load(); when unset, the TikTok default applies. */
  limited_data_use?: boolean;
  /**
   * Runtime state, populated by init() and mutated by push(). Not
   * user-facing. Stores last-resolved identity so subsequent pushes with
   * unchanged values skip redundant ttq.identify() calls.
   */
  _state?: RuntimeState;
  /**
   * Pass-through bucket: any additional TikTok Pixel init config (snake_case
   * keys per TikTok's docs). Merged into ttq.load()'s second argument.
   */
  [key: string]: unknown;
}

export interface RuntimeState {
  lastIdentity?: {
    email?: string;
    phone_number?: string;
    external_id?: string;
  };
}

export type InitSettings = Partial<Settings>;

/**
 * Mapping (rule.settings): per-event overrides.
 *
 * identify: mapping value resolving to an Advanced Matching object (same
 *           shape as settings.identify). Replaces the destination-level
 *           identity for this single push.
 */
export interface Mapping {
  identify?: WalkerOSMapping.Value;
}

/**
 * Advanced Matching parameter shape: what settings.identify must resolve to.
 * All fields are optional; if the resolved object has no non-empty values,
 * the destination skips the ttq.identify() call entirely.
 */
export interface IdentifyParams {
  email?: string;
  phone_number?: string;
  external_id?: string;
}

/**
 * Minimal surface of TikTok's window.ttq this destination uses. Tests mock
 * this by attaching a plain object to env.window.ttq; production uses the
 * real SDK created by the snippet setup() call.
 */
export interface TTQ {
  (...args: unknown[]): void;
  load: (pixelId: string, config?: Record<string, unknown>) => void;
  page: () => void;
  track: (
    event: string,
    params?: Record<string, unknown>,
    options?: { event_id?: string },
  ) => void;
  identify: (params: IdentifyParams) => void;
  enableCookie: () => void;
  disableCookie: () => void;
  /** Queue-based pattern: the snippet sets this; the destination does not read it. */
  methods?: string[];
  /** Internal queue populated before the CDN SDK loads. */
  _i?: Record<string, unknown>;
  /** Flag the snippet sets after the real SDK loads. */
  loaded?: boolean;
}

/**
 * Env: the destination reads `window.ttq` via getEnv(env). Tests attach
 * a mock ttq to env.window; production reads window.ttq created by the
 * SDK snippet.
 */
export interface Env extends DestinationWeb.Env {
  window: {
    ttq: TTQ;
  };
}

/**
 * The queue `setup()` installs until the Pixel script replaces it: each
 * call is kept in `_i.all`.
 */
export type TTQStub = ((...args: unknown[]) => void) & {
  methods: string[];
  _i: Record<string, unknown[]>;
  loaded: boolean;
};

declare global {
  interface Window {
    ttq?: TTQ | TTQStub;
  }
}

export type Types = CoreDestination.Types<Settings, Mapping, Env, InitSettings>;

export type Destination = DestinationWeb.Destination<Types>;
export type Config = DestinationWeb.Config<Types>;

export interface TikTokDestination extends Destination {
  env?: Env;
}

export type Rule = WalkerOSMapping.Rule<Mapping>;
export type Rules = WalkerOSMapping.Rules<Rule>;
