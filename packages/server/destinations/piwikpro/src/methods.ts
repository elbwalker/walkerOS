import type { Hit } from './types';
import { isArray, isObject } from '@walkeros/core';
import { isMissing, toEcProducts, toNumber } from './products';

export type MethodName =
  | 'trackPageView'
  | 'trackEvent'
  | 'trackGoal'
  | 'trackSiteSearch'
  | 'trackLink'
  | 'trackContentImpression'
  | 'trackContentInteraction'
  | 'ecommerceProductDetailView'
  | 'ecommerceAddToCart'
  | 'ecommerceRemoveFromCart'
  | 'ecommerceCartUpdate'
  | 'ecommerceOrder'
  | 'ping';

/** The portable Piwik PRO JS methods a server hit can be built from. */
export const METHOD_NAMES: readonly MethodName[] = [
  'trackPageView',
  'trackEvent',
  'trackGoal',
  'trackSiteSearch',
  'trackLink',
  'trackContentImpression',
  'trackContentInteraction',
  'ecommerceProductDetailView',
  'ecommerceAddToCart',
  'ecommerceRemoveFromCart',
  'ecommerceCartUpdate',
  'ecommerceOrder',
  'ping',
];

export function isMethodName(name: string): name is MethodName {
  return METHOD_NAMES.some((method) => method === name);
}

/** Index of the dimensions argument, or undefined when the method has none. */
export const DIMENSIONS_ARG: Partial<Record<MethodName, number>> = {
  trackEvent: 4,
  trackGoal: 2,
  trackSiteSearch: 3,
  trackLink: 2,
};

export type MethodResult = { params: Hit } | { invalid: string };

interface Field {
  /** Tracking API parameter. */
  param: string;
  /** JS argument name, used in the invalid reason. */
  arg: string;
  value: unknown;
  required?: boolean;
  type?: 'number' | 'integer';
}

/** Renders fields in order; a missing required or malformed value is invalid. */
function toParams(method: MethodName, fields: Field[]): MethodResult {
  const params: Hit = [];

  for (const { param, arg, value, required, type } of fields) {
    if (isMissing(value)) {
      if (required) return { invalid: `${method}: ${arg} missing` };
      continue;
    }

    if (!type) {
      params.push([param, String(value)]);
      continue;
    }

    const number = toNumber(value);
    if (number === undefined)
      return { invalid: `${method}: ${arg} not numeric` };
    if (type === 'integer' && !Number.isInteger(number))
      return { invalid: `${method}: ${arg} not an integer` };
    params.push([param, String(number)]);
  }

  return { params };
}

function isPrimitive(value: unknown): value is string | number | boolean {
  return ['string', 'number', 'boolean'].includes(typeof value);
}

/** `search_cats`: a string becomes ["x"], an array keeps its primitive items as strings. */
function toSearchCategories(category: unknown): string | undefined {
  if (typeof category === 'string') return JSON.stringify([category]);
  if (!isArray(category)) return undefined;
  const categories = category
    .filter((item) => !isMissing(item) && isPrimitive(item))
    .map(String);
  return categories.length ? JSON.stringify(categories) : undefined;
}

/** Ecommerce methods: products first, then the rest with ec_products in place. */
function ecommerce(
  method: MethodName,
  products: unknown,
  fields: (ecProducts: Field) => Field[],
): MethodResult {
  if (isMissing(products)) return { invalid: `${method}: products missing` };

  const result = toEcProducts(products);
  if ('invalid' in result) return { invalid: `${method}: ${result.invalid}` };

  return toParams(
    method,
    fields({ param: 'ec_products', arg: 'products', value: result.value }),
  );
}

type Translate = (args: readonly unknown[]) => MethodResult;

const METHODS: Record<MethodName, Translate> = {
  trackPageView: ([title]) =>
    toParams('trackPageView', [
      { param: 'action_name', arg: 'title', value: title },
    ]),

  trackEvent: ([category, action, name, value]) =>
    toParams('trackEvent', [
      { param: 'e_c', arg: 'category', value: category, required: true },
      { param: 'e_a', arg: 'action', value: action, required: true },
      { param: 'e_n', arg: 'name', value: name },
      { param: 'e_v', arg: 'value', value, type: 'number' },
    ]),

  trackGoal: ([goalId, value]) =>
    toParams('trackGoal', [
      { param: 'idgoal', arg: 'goalId', value: goalId, required: true },
      { param: 'revenue', arg: 'value', value, type: 'number' },
    ]),

  trackSiteSearch: ([keyword, category, count]) =>
    toParams('trackSiteSearch', [
      { param: 'search', arg: 'keyword', value: keyword, required: true },
      {
        param: 'search_cats',
        arg: 'category',
        value: toSearchCategories(category),
      },
      { param: 'search_count', arg: 'count', value: count, type: 'integer' },
    ]),

  trackLink: ([address, type]) => {
    if (isMissing(address)) return { invalid: 'trackLink: address missing' };
    if (isMissing(type)) return { invalid: 'trackLink: type missing' };
    if (type !== 'link' && type !== 'download')
      return { invalid: 'trackLink: type must be link or download' };
    return toParams('trackLink', [
      { param: type, arg: 'address', value: address },
      { param: 'url', arg: 'address', value: address },
    ]);
  },

  trackContentImpression: ([name, piece, target]) =>
    toParams('trackContentImpression', [
      { param: 'c_n', arg: 'name', value: name, required: true },
      { param: 'c_p', arg: 'piece', value: piece },
      { param: 'c_t', arg: 'target', value: target },
    ]),

  trackContentInteraction: ([interaction, name, piece, target]) =>
    toParams('trackContentInteraction', [
      { param: 'c_i', arg: 'interaction', value: interaction, required: true },
      { param: 'c_n', arg: 'name', value: name, required: true },
      { param: 'c_p', arg: 'piece', value: piece },
      { param: 'c_t', arg: 'target', value: target },
    ]),

  ecommerceProductDetailView: ([products]) =>
    ecommerce('ecommerceProductDetailView', products, (ecProducts) => [
      { param: 'e_t', arg: 'type', value: 'product-detail-view' },
      ecProducts,
    ]),

  ecommerceAddToCart: ([products]) =>
    ecommerce('ecommerceAddToCart', products, (ecProducts) => [
      { param: 'e_t', arg: 'type', value: 'add-to-cart' },
      ecProducts,
    ]),

  ecommerceRemoveFromCart: ([products]) =>
    ecommerce('ecommerceRemoveFromCart', products, (ecProducts) => [
      { param: 'e_t', arg: 'type', value: 'remove-from-cart' },
      ecProducts,
    ]),

  ecommerceCartUpdate: ([products, grandTotal]) =>
    ecommerce('ecommerceCartUpdate', products, (ecProducts) => [
      { param: 'e_t', arg: 'type', value: 'cart-update' },
      ecProducts,
      {
        param: 'revenue',
        arg: 'grandTotal',
        value: grandTotal,
        required: true,
        type: 'number',
      },
    ]),

  ecommerceOrder: ([products, info]) => {
    if (isMissing(products))
      return { invalid: 'ecommerceOrder: products missing' };
    if (!isObject(info)) return { invalid: 'ecommerceOrder: info missing' };
    return ecommerce('ecommerceOrder', products, (ecProducts) => [
      { param: 'e_t', arg: 'type', value: 'order' },
      { param: 'ec_id', arg: 'orderId', value: info.orderId, required: true },
      {
        param: 'revenue',
        arg: 'grandTotal',
        value: info.grandTotal,
        required: true,
        type: 'number',
      },
      { param: 'ec_st', arg: 'subTotal', value: info.subTotal, type: 'number' },
      { param: 'ec_tx', arg: 'tax', value: info.tax, type: 'number' },
      { param: 'ec_sh', arg: 'shipping', value: info.shipping, type: 'number' },
      { param: 'ec_dt', arg: 'discount', value: info.discount, type: 'number' },
      ecProducts,
    ]);
  },

  ping: () => toParams('ping', [{ param: 'ping', arg: 'ping', value: 6 }]),
};

/** Translates positional JS arguments into ordered Tracking API parameters. Pure. */
export function methodParams(
  name: MethodName,
  args: readonly unknown[],
): MethodResult {
  return METHODS[name](args);
}
