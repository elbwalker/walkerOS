import type { Mapping, WalkerOS } from '@walkeros/core';
import { getByPath, getId } from '@walkeros/core';
import type {
  GA4Event,
  GA4Hit,
  GA4HitParams,
  GA4Item,
  GA4Mapping,
} from './types';
import { parseConsent } from './parse';

/**
 * Lookup root for mapping path resolution. Mapping rules reference keys via
 * dotted paths: `hit.dl`, `params.ep.transaction_id`, `params.epn.value`, `items`.
 *
 * `en` exposes the GA4 event name (used by the `*` fallback so unknown events
 * can carry their original name through). `firstItem` exposes `items[0]` so
 * promotion-style mappings can resolve `firstItem.promotionId` etc. without
 * needing array-index syntax in `getByPath`.
 *
 * Typed as `Record<string, unknown> & { ... }` so `getByPath` (which accepts
 * unknown) is happy without any narrowing cast on the call site.
 */
type LookupRoot = Record<string, unknown> & {
  hit: GA4HitParams;
  params: GA4Event['params'];
  items: GA4Event['items'];
  en: string;
  firstItem?: GA4Item;
};

/**
 * Convert a parsed GA4 hit into zero or more walkerOS events.
 * One GA4 hit may carry several events (POST batch); each is mapped
 * independently with hit-level metadata merged in.
 */
export function mapHitToEvents(
  hit: GA4Hit,
  mapping: GA4Mapping,
): WalkerOS.DeepPartialEvent[] {
  const out: WalkerOS.DeepPartialEvent[] = [];
  for (const event of hit.events) {
    const mapped = mapOneEvent(hit.hit, event, mapping);
    if (mapped) out.push(mapped);
  }
  return out;
}

function mapOneEvent(
  hitParams: GA4HitParams,
  event: GA4Event,
  mapping: GA4Mapping,
): WalkerOS.DeepPartialEvent | null {
  const ruleEntry = mapping[event.en] ?? mapping['*'];
  if (!ruleEntry) return null;
  // For v1, only single-rule entries are supported (no array fan-out).
  const rule: Mapping.Rule = Array.isArray(ruleEntry)
    ? ruleEntry[0]
    : ruleEntry;
  if (!rule || rule.ignore) return null;

  const lookup: LookupRoot = {
    hit: hitParams,
    params: event.params,
    items: event.items,
    en: event.en,
    ...(event.items.length > 0 ? { firstItem: event.items[0] } : {}),
  };

  const evaluated: WalkerOS.DeepPartialEvent = {};

  if (rule.name) {
    const [entity, ...rest] = rule.name.split(' ');
    evaluated.name = rule.name;
    evaluated.entity = entity;
    evaluated.action = rest.join(' ');
  }

  if (rule.data !== undefined) {
    const data = evalValue(rule.data, lookup);
    if (data !== undefined) {
      evaluated.data = data as WalkerOS.Properties;
    }
  }

  // Hit-level merge: user / globals / source.
  evaluated.user = {
    ...(hitParams.uid !== undefined ? { id: hitParams.uid } : {}),
    ...(hitParams.cid !== undefined ? { device: hitParams.cid } : {}),
    ...(hitParams.sid !== undefined ? { session: hitParams.sid } : {}),
  };
  evaluated.globals = {
    ...(hitParams.ul !== undefined ? { language: hitParams.ul } : {}),
    ...(hitParams.sr !== undefined ? { screen: hitParams.sr } : {}),
  };
  evaluated.source = {
    type: 'ga4',
    ...(hitParams.p !== undefined ? { platform: hitParams.p } : {}),
  };

  // Consent from gcs string, id from hit._p (fallback to generated string),
  // timestamp from sid (epoch seconds → ms; falls back to wall-clock now),
  // timing from event._et (ms; 0 if absent), trigger hard-coded to "ga4" for v1.
  evaluated.consent = parseConsent(hitParams);
  evaluated.id = hitParams._p ?? getId();
  const sidNum = hitParams.sid ? Number(hitParams.sid) : NaN;
  evaluated.timestamp =
    !Number.isNaN(sidNum) && sidNum > 0 ? sidNum * 1000 : Date.now();
  evaluated.timing = event.params._et ?? 0;
  evaluated.trigger = 'ga4';

  if (event.items.length > 0) {
    evaluated.nested = itemsToNested(event.items);
  }

  return evaluated;
}

/**
 * GA4 items → walkerOS nested product entities.
 * Field naming: camelCase GA4Item keys are emitted as snake_case data keys
 * (`listName` → `list_name`, `promotionId` → `promotion_id`, etc).
 * Custom k<N>/v<N> pairs are spread as-is.
 *
 * Returns `WalkerOS.Entities` (i.e. `Array<WalkerOS.Entity>`). Note that the
 * canonical `WalkerOS.Entity` interface uses `entity: string` as the kind
 * discriminator (not `type`).
 */
function itemsToNested(items: GA4Item[]): WalkerOS.Entities {
  return items.map((item): WalkerOS.Entity => {
    const data: WalkerOS.Properties = {};
    if (item.id !== undefined) data.id = item.id;
    if (item.name !== undefined) data.name = item.name;
    if (item.brand !== undefined) data.brand = item.brand;
    if (item.category !== undefined) data.category = item.category;
    if (item.category2 !== undefined) data.category2 = item.category2;
    if (item.category3 !== undefined) data.category3 = item.category3;
    if (item.category4 !== undefined) data.category4 = item.category4;
    if (item.category5 !== undefined) data.category5 = item.category5;
    if (item.variant !== undefined) data.variant = item.variant;
    if (item.price !== undefined) data.price = item.price;
    if (item.quantity !== undefined) data.quantity = item.quantity;
    if (item.coupon !== undefined) data.coupon = item.coupon;
    if (item.discount !== undefined) data.discount = item.discount;
    if (item.listName !== undefined) data.list_name = item.listName;
    if (item.listId !== undefined) data.list_id = item.listId;
    if (item.listPosition !== undefined) data.list_position = item.listPosition;
    if (item.locationId !== undefined) data.location_id = item.locationId;
    if (item.affiliation !== undefined) data.affiliation = item.affiliation;
    if (item.creativeName !== undefined) data.creative_name = item.creativeName;
    if (item.creativeSlot !== undefined) data.creative_slot = item.creativeSlot;
    if (item.promotionId !== undefined) data.promotion_id = item.promotionId;
    if (item.promotionName !== undefined)
      data.promotion_name = item.promotionName;
    for (const [k, v] of Object.entries(item.custom)) data[k] = v;
    return { entity: 'product', data, nested: [], context: {} };
  });
}

/**
 * Minimal mapping evaluator. v1 supports:
 *   - string → path lookup via getByPath
 *   - Array<Value> → fallback chain: first non-undefined wins
 *   - { value: X } → literal
 *   - { key: 'path' } → path lookup
 *   - { map: {...} } → recursive object build
 *
 * Deferred to v2: condition, loop, fn, validate, set, consent, $code.
 */
function evalValue(
  value: Mapping.Value | Mapping.Values,
  root: LookupRoot,
): unknown {
  if (Array.isArray(value)) {
    for (const v of value) {
      const resolved = evalValue(v, root);
      if (resolved !== undefined && resolved !== null) return resolved;
    }
    return undefined;
  }
  if (typeof value === 'string') {
    return getByPath(root, value);
  }
  if (typeof value === 'object' && value !== null) {
    if ('value' in value && value.value !== undefined) return value.value;
    if ('key' in value && typeof value.key === 'string') {
      return getByPath(root, value.key);
    }
    if ('map' in value && value.map) {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value.map)) {
        const resolved = evalValue(v, root);
        if (resolved !== undefined) out[k] = resolved;
      }
      return out;
    }
  }
  return undefined;
}
