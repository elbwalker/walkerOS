import type { Mapping, WalkerOS } from '@walkeros/core';

/** Raw input to the decoder. Origin-agnostic (express, lambda, pubsub, etc). */
export interface GA4Request {
  /** Full request URL including query string. */
  url: string;
  /** POST body if present. May be \n- or \r\n-separated multi-event lines. */
  body?: string;
}

/**
 * Parsed GA4 wire payload. One request → one hit → N events.
 * IMPORTANT: dotted GA4 keys (`ep.transaction_id`, `epn.value`) are nested
 * into structured objects at parse time so the mapping engine's getByPath
 * (which splits paths on `.`) can resolve them.
 */
export interface GA4Hit {
  /** Hit-level params from the URL query string. v, tid, cid, sid, dl, dt, ul, sr, gcs, gtm, p. */
  hit: GA4HitParams;
  /** One entry per body line (POST) or single entry (GET). */
  events: GA4Event[];
}

/** Hit-level params extracted from URL query. Known keys typed; unknown keys allowed. */
export interface GA4HitParams {
  v?: string;
  tid?: string;
  cid?: string;
  sid?: string;
  sct?: string;
  seg?: string;
  _p?: string;
  _z?: string;
  gtm?: string;
  dl?: string;
  dt?: string;
  dr?: string;
  ul?: string;
  sr?: string;
  uid?: string;
  _dbg?: string;
  _s?: string;
  _ss?: string;
  _fv?: string;
  gcs?: string;
  gcd?: string;
  dma?: string;
  dma_cps?: string;
  npa?: string;
  p?: string; // platform: web, mob, srv
  [other: string]: string | undefined;
}

export interface GA4Event {
  /** Event name from `en` param. */
  en: string;
  /**
   * Per-event params with dotted keys nested:
   * raw `ep.transaction_id` → `params.ep.transaction_id`
   * raw `epn.value` → `params.epn.value`
   * raw `up.role` → `params.up.role`
   * raw `upn.score` → `params.upn.score`
   * Standalone keys: `_et`, `_c` stay flat.
   */
  params: GA4EventParams;
  /** Parsed items from pr1, pr2, ..., prN. Empty array if none. */
  items: GA4Item[];
}

export interface GA4EventParams {
  /** String event params from ep.<name>. */
  ep: Record<string, string>;
  /** Numeric event params from epn.<name>. Values are coerced via Number(). */
  epn: Record<string, number>;
  /** String user properties from up.<name>. */
  up: Record<string, string>;
  /** Numeric user properties from upn.<name>. */
  upn: Record<string, number>;
  /** Engagement time delta (ms). */
  _et?: number;
  /** Is-conversion flag. */
  _c?: string;
}

/** Parsed product item from one pr<N> param. */
export interface GA4Item {
  id?: string;
  name?: string;
  brand?: string;
  category?: string;
  category2?: string;
  category3?: string;
  category4?: string;
  category5?: string;
  variant?: string;
  price?: number;
  quantity?: number;
  coupon?: string;
  discount?: number;
  listName?: string;
  listId?: string;
  listPosition?: number;
  locationId?: string;
  affiliation?: string;
  creativeName?: string;
  creativeSlot?: string;
  promotionId?: string;
  promotionName?: string;
  /** Custom item params from k<N>/v<N> pairs (multi-digit N supported). */
  custom: Record<string, string>;
}

/** Decoder settings. */
export interface GA4Settings {
  /**
   * Mapping registry keyed by GA4 event name (`en`).
   * User config replaces matching package defaults at the per-event key.
   * Use `'*'` for the unknown-event fallback.
   * Set a rule's `ignore: true` to drop matching events.
   */
  mapping?: GA4Mapping;
  /**
   * Regex string to filter `tid` values. Default `^G-` (drops Ads `AW-`/DC `DC-`).
   * String at config time, compiled to RegExp once at init.
   */
  tidPattern?: string;
}

/** Per-event mapping rule keyed by GA4 event name. */
export type GA4Mapping = Record<string, Mapping.Rule | undefined> & {
  '*'?: Mapping.Rule;
};
