import type {
  Mapping as WalkerOSMapping,
  Destination as CoreDestination,
} from '@walkeros/core';
import type { DestinationWeb } from '@walkeros/web-core';

/**
 * TikTok's 14 recognized standard event names — rigid taxonomy for ad
 * optimization. `mapping.name` values from this union light up IDE
 * autocomplete; `| string` still allows arbitrary custom event names
 * (which TikTok treats as custom events with no optimization value).
 */
export type StandardEventNames =
  | 'ViewContent'
  | 'ClickButton'
  | 'Search'
  | 'AddToWishlist'
  | 'AddToCart'
  | 'InitiateCheckout'
  | 'AddPaymentInfo'
  | 'CompletePayment'
  | 'PlaceAnOrder'
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
 * parameters (email, phone_number, external_id) — TikTok auto-hashes these
 * before sending, so raw values are safe. `include` names walkerOS event
 * sections to flatten into prefixed TikTok event parameters. All other
 * TikTok-native snake_case options (e.g., `auto_config`, `limited_data_use`)
 * are passed through to `ttq.load(apiKey, options)`.
 */
export interface Settings {
  /** TikTok Pixel ID — first argument to ttq.load(...). Required. */
  apiKey: string;
  /**
   * walkerOS mapping value resolving to an Advanced Matching object with any
   * of: `email`, `phone_number`, `external_id`. Applied on first push and
   * re-fired only on change (runtime state in _state.lastIdentity).
   */
  identify?: WalkerOSMapping.Value;
  // `pageview` removed 2026-04-09 — TikTok's auto page view fires from the
  // SDK and cannot be reliably suppressed via init config. Letting it fire
  // is the expected behavior.
  /** TikTok default: true. Enable auto-detection of form fields for Advanced Matching. */
  auto_config?: boolean;
  /** TikTok default: false. Restrict data use under U.S. state privacy laws. */
  limited_data_use?: boolean;
  /**
   * Runtime state — populated by init() and mutated by push(). Not
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
 * Mapping (rule.settings) — per-event overrides.
 *
 * identify — mapping value resolving to an Advanced Matching object (same
 *            shape as settings.identify). Merged onto/replaces the
 *            destination-level identity for this single push.
 * include  — replaces destination-level include for this rule only.
 */
export interface Mapping {
  identify?: WalkerOSMapping.Value;
}

/**
 * Advanced Matching parameter shape — what settings.identify must resolve to.
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
  /** Queue-based pattern — snippet sets this; destination does not read it. */
  methods?: string[];
  /** Internal queue populated before the CDN SDK loads. */
  _i?: Record<string, unknown>;
  /** Flag the snippet sets after the real SDK loads. */
  loaded?: boolean;
}

/**
 * Env — the destination reads `window.ttq` via getEnv(env). Tests attach
 * a mock ttq to env.window; production reads window.ttq created by the
 * SDK snippet.
 */
export interface Env extends DestinationWeb.Env {
  window: {
    ttq: TTQ;
  };
  document: {
    createElement: (tagName: string) => Element;
    head: { appendChild: (node: unknown) => void };
  };
}

export type Types = CoreDestination.Types<Settings, Mapping, Env, InitSettings>;

export type Destination = DestinationWeb.Destination<Types>;
export type Config = DestinationWeb.Config<Types>;

export interface TikTokDestination extends Destination {
  env?: Env;
}

export type Rule = WalkerOSMapping.Rule<Mapping>;
export type Rules = WalkerOSMapping.Rules<Rule>;
