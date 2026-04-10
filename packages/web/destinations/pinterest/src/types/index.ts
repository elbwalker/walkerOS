import type {
  Mapping as WalkerOSMapping,
  Destination as CoreDestination,
} from '@walkeros/core';
import type { DestinationWeb } from '@walkeros/web-core';

/**
 * Pinterest Tag global. The queue-based function created by the Pinterest
 * snippet. Before core.js loads, calls are queued on `pintrk.queue`.
 * After core.js resolves the queue, `pintrk` is replaced with the real
 * implementation. Both shapes accept the same argument signatures.
 */
export interface Pintrk {
  (command: 'load', tagId: string, identify?: IdentifyFields): void;
  (command: 'page'): void;
  (
    command: 'track',
    eventName: string,
    eventData?: EventData,
    callback?: (didInit: boolean, error?: unknown) => void,
  ): void;
  (command: 'set', userData: IdentifyFields): void;
  queue?: unknown[][];
  version?: string;
}

declare global {
  interface Window {
    pintrk?: Pintrk;
  }
}

/**
 * Pinterest standard event taxonomy. See Pinterest Tag documentation.
 * Client-side names are lowercase concatenated strings (addtocart,
 * not add_to_cart). Sending the wrong name means the event will not
 * appear correctly in Pinterest's conversion reports.
 */
export type StandardEventName =
  | 'pagevisit'
  | 'viewcategory'
  | 'search'
  | 'addtocart'
  | 'checkout'
  | 'watchvideo'
  | 'signup'
  | 'lead'
  | 'addpaymentinfo'
  | 'addtowishlist'
  | 'initiatecheckout'
  | 'subscribe'
  | 'viewcontent'
  | 'contact'
  | 'customizeproduct'
  | 'findlocation'
  | 'schedule'
  | 'starttrial'
  | 'submitapplication'
  | 'custom';

/** Open union — any string is still passed through to pintrk. */
export type EventName = StandardEventName | (string & {});

/**
 * Enhanced matching fields. Web destination strictly limits to the two
 * documented client-side Pinterest Tag fields. CAPI-only fields (ph, fn,
 * ln, address, country, ip, ua) belong to a future server destination
 * and are intentionally not accepted here.
 *
 * The Pinterest JS tag auto-hashes `em` with SHA-256 before transmission —
 * the destination does NOT hash.
 */
export interface IdentifyFields {
  em?: string;
  external_id?: string;
}

/**
 * Event data payload for pintrk('track', ...). Pinterest has a prescribed
 * set of parameter names. Common parameters across events plus an open
 * `[key: string]: unknown` for event-specific fields (search_query,
 * video_title, lead_type, opt_out_type, custom properties, etc.).
 */
export interface EventData {
  value?: number;
  order_quantity?: number;
  currency?: string;
  event_id?: string;
  order_id?: string;
  promo_code?: string;
  property?: string;
  product_name?: string;
  product_id?: string;
  product_category?: string;
  product_brand?: string;
  product_price?: number;
  product_quantity?: number;
  product_variant_id?: string;
  product_variant?: string;
  line_items?: LineItem[];
  search_query?: string;
  video_title?: string;
  lead_type?: string;
  opt_out_type?: 'LDP';
  [key: string]: unknown;
}

export interface LineItem {
  product_name?: string;
  product_id?: string;
  product_category?: string;
  product_brand?: string;
  product_price?: number;
  product_quantity?: number;
  product_variant_id?: string;
  product_variant?: string;
  [key: string]: unknown;
}

/**
 * Destination-level settings.
 *
 * @property apiKey — Pinterest Tag ID (numeric string). Required. Passed
 *   to pintrk('load', tagId) on init.
 * @property pageview — Fire pintrk('page') once in init after core.js
 *   loads. Default true (matches Pinterest's base code convention).
 *   Set false when walkerOS sources already emit page view events and
 *   you would otherwise get a duplicate initial fire.
 * @property identify — walkerOS mapping value resolving to IdentifyFields.
 *   Enhanced matching data for pintrk('load', tagId, data) and subsequent
 *   pintrk('set', data) calls when the resolved identity changes.
 * @property include — walkerOS event sections forwarded as prefixed
 *   properties in the track event data. Pinterest strongly prefers
 *   explicit mapping.data over include — include is a fallback for
 *   forwarding auxiliary context.
 */
export interface Settings {
  apiKey: string;
  pageview?: boolean;
  identify?: WalkerOSMapping.Value;
  /**
   * Runtime-only state. Not serialized to schema, not configurable by users.
   * The destination uses this to diff enhanced matching across pushes and
   * to suppress track() calls after consent revocation.
   */
  _state?: {
    lastIdentify?: IdentifyFields;
    consentGranted?: boolean;
  };
}

export type InitSettings = Partial<Settings>;

/**
 * Per-event mapping settings (on rule.settings).
 *
 * @property identify — Per-event identity override. Resolves to
 *   IdentifyFields passed to pintrk('set', data).
 * @property include — Overrides destination-level include for this rule.
 */
export interface Mapping {
  identify?: WalkerOSMapping.Value;
}

/**
 * Env — mock surface for tests. Pinterest Tag uses window.pintrk, so
 * the env extends DestinationWeb.Env (which already provides window
 * and document).
 */
export interface Env extends DestinationWeb.Env {
  window: {
    pintrk?: Pintrk;
  };
}

export type Types = CoreDestination.Types<Settings, Mapping, Env, InitSettings>;

export type Destination = DestinationWeb.Destination<Types>;
export type Config = DestinationWeb.Config<Types>;

export interface PinterestDestination extends Destination {
  env?: Env;
}

export type Rule = WalkerOSMapping.Rule<Mapping>;
export type Rules = WalkerOSMapping.Rules<Rule>;
