import type { WalkerOS } from '@walkeros/core';
import type {
  GA4Event,
  GA4EventParams,
  GA4Hit,
  GA4HitParams,
  GA4Item,
  GA4Request,
} from './types';

export function parseQuery(url: string): Record<string, string> {
  const out: Record<string, string> = {};
  const qIdx = url.indexOf('?');
  if (qIdx === -1) return out;
  const usp = new URLSearchParams(url.slice(qIdx + 1));
  usp.forEach((value, key) => {
    out[key] = value;
  });
  return out;
}

export function parseBody(body: string): Record<string, string>[] {
  if (!body) return [];
  return body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const out: Record<string, string> = {};
      const usp = new URLSearchParams(line);
      usp.forEach((v, k) => {
        out[k] = v;
      });
      return out;
    });
}

// Two separate dispatch maps keyed by 2-char prefix.
// Split by type so the assignment site stays type-safe (no cast).
const ITEM_STRING_FIELDS: Readonly<Record<string, keyof GA4Item>> = {
  id: 'id',
  nm: 'name',
  br: 'brand',
  ca: 'category',
  c2: 'category2',
  c3: 'category3',
  c4: 'category4',
  c5: 'category5',
  va: 'variant',
  cp: 'coupon',
  ln: 'listName',
  li: 'listId',
  lo: 'locationId',
  af: 'affiliation',
  cn: 'creativeName',
  cs: 'creativeSlot',
  pi: 'promotionId',
  pn: 'promotionName',
};

const ITEM_NUMBER_FIELDS: Readonly<Record<string, keyof GA4Item>> = {
  pr: 'price',
  qt: 'quantity',
  ds: 'discount',
  lp: 'listPosition',
};

function setItemString(item: GA4Item, key: keyof GA4Item, value: string): void {
  // Narrow assignment by key — these are the string-typed fields.
  switch (key) {
    case 'id':
      item.id = value;
      return;
    case 'name':
      item.name = value;
      return;
    case 'brand':
      item.brand = value;
      return;
    case 'category':
      item.category = value;
      return;
    case 'category2':
      item.category2 = value;
      return;
    case 'category3':
      item.category3 = value;
      return;
    case 'category4':
      item.category4 = value;
      return;
    case 'category5':
      item.category5 = value;
      return;
    case 'variant':
      item.variant = value;
      return;
    case 'coupon':
      item.coupon = value;
      return;
    case 'listName':
      item.listName = value;
      return;
    case 'listId':
      item.listId = value;
      return;
    case 'locationId':
      item.locationId = value;
      return;
    case 'affiliation':
      item.affiliation = value;
      return;
    case 'creativeName':
      item.creativeName = value;
      return;
    case 'creativeSlot':
      item.creativeSlot = value;
      return;
    case 'promotionId':
      item.promotionId = value;
      return;
    case 'promotionName':
      item.promotionName = value;
      return;
  }
}

function setItemNumber(item: GA4Item, key: keyof GA4Item, value: number): void {
  switch (key) {
    case 'price':
      item.price = value;
      return;
    case 'quantity':
      item.quantity = value;
      return;
    case 'discount':
      item.discount = value;
      return;
    case 'listPosition':
      item.listPosition = value;
      return;
  }
}

export function parseItem(value: string): GA4Item {
  const item: GA4Item = { custom: {} };
  const customKeys = new Map<string, string>();
  const customVals = new Map<string, string>();

  for (const raw of value.split('~')) {
    if (raw.length === 0) continue;

    // Variable-length k<N>/v<N> (must match before 2-char prefix lookup
    // because k10/v10 etc are wider than 2 chars).
    const kvMatch = /^([kv])(\d+)(.*)$/.exec(raw);
    if (kvMatch) {
      const [, kind, idx, val] = kvMatch;
      if (kind === 'k') customKeys.set(idx, val);
      else customVals.set(idx, val);
      continue;
    }

    if (raw.length < 2) continue;
    const prefix = raw.slice(0, 2);
    const val = raw.slice(2);

    const stringKey = ITEM_STRING_FIELDS[prefix];
    if (stringKey !== undefined) {
      setItemString(item, stringKey, val);
      continue;
    }
    const numberKey = ITEM_NUMBER_FIELDS[prefix];
    if (numberKey !== undefined) {
      const n = Number(val);
      if (!Number.isNaN(n)) setItemNumber(item, numberKey, n);
      continue;
    }
  }

  // Pair k<N> with v<N>; drop unmatched.
  for (const [idx, key] of customKeys) {
    const v = customVals.get(idx);
    if (v !== undefined) item.custom[key] = v;
  }
  return item;
}

export function parseConsent(hit: { gcs?: string }): WalkerOS.Consent {
  const gcs = hit.gcs;
  if (!gcs || !/^G[01]{3}$/.test(gcs)) return {};
  // gcs[1] is reserved (always '1' for current consent mode v2)
  return {
    marketing: gcs[2] === '1', // ad_storage
    analytics: gcs[3] === '1', // analytics_storage
  };
}

const HIT_PARAM_KEYS = new Set([
  'v',
  'tid',
  'cid',
  'sid',
  'sct',
  'seg',
  '_p',
  '_z',
  'gtm',
  'dl',
  'dt',
  'dr',
  'ul',
  'sr',
  'uid',
  '_dbg',
  '_s',
  '_ss',
  '_fv',
  'gcs',
  'gcd',
  'dma',
  'dma_cps',
  'npa',
  'p',
]);

export function parseRequest(req: GA4Request): GA4Hit {
  const queryParams = parseQuery(req.url);
  const hit: GA4HitParams = {};
  const queryEventParams: Record<string, string> = {};

  // Split URL params into hit-level vs event-level.
  for (const [k, v] of Object.entries(queryParams)) {
    if (HIT_PARAM_KEYS.has(k)) hit[k] = v;
    else queryEventParams[k] = v;
  }

  // GET: event params live in the URL alongside hit params.
  // POST: in body lines.
  const bodyLines = req.body ? parseBody(req.body) : [];
  const rawEvents =
    bodyLines.length > 0
      ? bodyLines
      : Object.keys(queryEventParams).length > 0
        ? [queryEventParams]
        : [];

  const events: GA4Event[] = rawEvents
    .filter((raw) => typeof raw.en === 'string' && raw.en.length > 0)
    .map((raw) => buildEvent(raw));

  return { hit, events };
}

function buildEvent(raw: Record<string, string>): GA4Event {
  const params: GA4EventParams = { ep: {}, epn: {}, up: {}, upn: {} };
  const itemEntries: Array<[number, string]> = [];

  for (const [k, v] of Object.entries(raw)) {
    if (k === 'en') continue;

    // pr<N> items
    const prMatch = /^pr(\d+)$/.exec(k);
    if (prMatch) {
      itemEntries.push([Number(prMatch[1]), v]);
      continue;
    }

    // Dotted-key nesting
    if (k.startsWith('ep.')) {
      params.ep[k.slice(3)] = v;
      continue;
    }
    if (k.startsWith('epn.')) {
      const n = Number(v);
      if (!Number.isNaN(n)) params.epn[k.slice(4)] = n;
      continue;
    }
    if (k.startsWith('up.')) {
      params.up[k.slice(3)] = v;
      continue;
    }
    if (k.startsWith('upn.')) {
      const n = Number(v);
      if (!Number.isNaN(n)) params.upn[k.slice(4)] = n;
      continue;
    }

    // Standalone numeric keys
    if (k === '_et') {
      const n = Number(v);
      if (!Number.isNaN(n)) params._et = n;
      continue;
    }
    if (k === '_c') {
      params._c = v;
      continue;
    }
    // Unknown standalone keys: drop. Add to GA4EventParams type if a future
    // need surfaces.
  }

  itemEntries.sort((a, b) => a[0] - b[0]);
  const items = itemEntries.map(([, v]) => parseItem(v));

  return { en: raw.en, params, items };
}
