import type {
  Mapping as WalkerOSMapping,
  Destination as CoreDestination,
} from '@walkeros/core';
import type { DestinationWeb } from '@walkeros/web-core';

/**
 * LinkedIn Insight Tag runtime surface.
 *
 * The Insight Tag script installs `window.lintrk`, a single function that
 * accepts exactly one tracked action: `lintrk('track', data)`.
 *
 * Before the script loads, the destination installs a queue-backed shim so
 * calls made during init are buffered and flushed once the script loads.
 * This mirrors the pattern LinkedIn's own snippet uses.
 */
export type LintrkAction = 'track';

export interface LintrkTrackData {
  conversion_id: number;
  conversion_value?: number;
  currency?: string;
  event_id?: string;
}

export type Lintrk = ((action: LintrkAction, data: LintrkTrackData) => void) & {
  /** Internal queue populated before the CDN script loads. */
  q?: unknown[];
};

declare global {
  interface Window {
    _linkedin_partner_id?: string;
    _linkedin_data_partner_ids?: string[];
    lintrk?: Lintrk;
  }
}

/**
 * Destination-level settings.
 *
 * apiKey: the LinkedIn Partner ID (numeric string, e.g. "123456"), assigned
 *         to `window._linkedin_partner_id` before the script loads.
 */
export interface Settings {
  apiKey: string;
}

export type InitSettings = Partial<Settings>;

/**
 * Per-rule mapping settings.
 *
 * conversion: mapping value resolving to an object with short keys:
 *   { id (required), value?, currency?, eventId? }
 *
 * `id` becomes `conversion_id` (number, Campaign Manager conversion rule ID).
 * Other keys translate 1:1 to the vendor parameter names.
 *
 * A rule without `conversion` makes no call: LinkedIn is an opt-in
 * conversion model. A `conversion` that resolves to no `id` fails the push
 * with `missing-input`.
 */
export interface Mapping {
  conversion?: WalkerOSMapping.Value;
}

/**
 * Env: mock surface for tests and dev. The destination mutates
 * `window._linkedin_partner_id` / `window._linkedin_data_partner_ids` and
 * installs `window.lintrk` in init; tests can pre-seed `window.lintrk` with
 * a spy to skip the script injection path.
 */
export interface Env extends DestinationWeb.Env {
  window: {
    _linkedin_partner_id?: string;
    _linkedin_data_partner_ids?: string[];
    lintrk?: Lintrk;
  };
}

export type Types = CoreDestination.Types<Settings, Mapping, Env, InitSettings>;

export type Destination = DestinationWeb.Destination<Types>;
export type Config = DestinationWeb.Config<Types>;

export interface LinkedInDestination extends Destination {
  env?: Env;
}

export type Rule = WalkerOSMapping.Rule<Mapping>;
export type Rules = WalkerOSMapping.Rules<Rule>;
