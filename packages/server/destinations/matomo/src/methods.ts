import type { Hit } from './types';
import {
  isMissing,
  toEcItems,
  toNumber,
  toPositiveInteger,
  toText,
} from './items';

export type MethodName =
  | 'trackPageView'
  | 'trackEvent'
  | 'trackGoal'
  | 'trackSiteSearch'
  | 'trackLink'
  | 'trackContentImpression'
  | 'trackContentInteraction'
  | 'trackEcommerceOrder'
  | 'trackEcommerceCartUpdate'
  | 'ping';

/** The Matomo JavaScript tracker methods a server hit can be built from. */
export const METHOD_NAMES: readonly MethodName[] = [
  'trackPageView',
  'trackEvent',
  'trackGoal',
  'trackSiteSearch',
  'trackLink',
  'trackContentImpression',
  'trackContentInteraction',
  'trackEcommerceOrder',
  'trackEcommerceCartUpdate',
  'ping',
];

export function isMethodName(name: string): name is MethodName {
  return METHOD_NAMES.some((method) => method === name);
}

export type MethodResult = { params: Hit } | { invalid: string };

interface Field {
  /** Tracking API parameter. */
  param: string;
  /** JavaScript tracker argument name, used in the invalid reason. */
  arg: string;
  value: unknown;
  required?: boolean;
  type?: 'number' | 'integer' | 'goal';
}

/** Renders fields in order; a missing required or malformed value is invalid. */
function toParams(method: MethodName, fields: Field[]): MethodResult {
  const params: Hit = [];

  for (const { param, arg, value, required, type } of fields) {
    const text = toText(value);
    if (text === undefined) {
      if (required) return { invalid: `${method}: ${arg} missing` };
      continue;
    }

    if (type === 'goal') {
      const id = toPositiveInteger(value);
      if (id === undefined)
        return { invalid: `${method}: ${arg} not a positive integer` };
      params.push([param, id]);
      continue;
    }

    if (type) {
      const number = toNumber(value);
      if (number === undefined)
        return { invalid: `${method}: ${arg} not a number` };
      if (type === 'integer' && !Number.isInteger(number))
        return { invalid: `${method}: ${arg} not an integer` };
      params.push([param, String(number)]);
      continue;
    }

    params.push([param, text]);
  }

  return { params };
}

/** An ecommerce hit: idgoal=0, the method's fields, then the items as ec_items. */
function ecommerce(
  method: MethodName,
  fields: Field[],
  items: unknown,
): MethodResult {
  const result = toParams(method, fields);
  if ('invalid' in result) return result;
  const params: Hit = [['idgoal', '0'], ...result.params];
  if (items === undefined) return { params };
  const ecItems = toEcItems(items, method);
  if ('invalid' in ecItems) return ecItems;
  return { params: [...params, ['ec_items', ecItems.json]] };
}

type Translate = (args: readonly unknown[], items: unknown) => MethodResult;

const METHODS: Record<MethodName, Translate> = {
  trackPageView: ([customTitle]) =>
    toParams('trackPageView', [
      { param: 'action_name', arg: 'customTitle', value: customTitle },
    ]),

  trackEvent: ([category, action, name, value]) =>
    toParams('trackEvent', [
      { param: 'e_c', arg: 'category', value: category, required: true },
      { param: 'e_a', arg: 'action', value: action, required: true },
      { param: 'e_n', arg: 'name', value: name },
      { param: 'e_v', arg: 'value', value, type: 'number' },
    ]),

  trackGoal: ([idGoal, customRevenue]) =>
    toParams('trackGoal', [
      {
        param: 'idgoal',
        arg: 'idGoal',
        value: idGoal,
        required: true,
        type: 'goal',
      },
      {
        param: 'revenue',
        arg: 'customRevenue',
        value: customRevenue,
        type: 'number',
      },
    ]),

  trackSiteSearch: ([keyword, category, resultsCount]) =>
    toParams('trackSiteSearch', [
      { param: 'search', arg: 'keyword', value: keyword, required: true },
      { param: 'search_cat', arg: 'category', value: category },
      {
        param: 'search_count',
        arg: 'resultsCount',
        value: resultsCount,
        type: 'integer',
      },
    ]),

  trackLink: ([url, linkType]) => {
    if (toText(url) === undefined) return { invalid: 'trackLink: url missing' };
    if (isMissing(linkType)) return { invalid: 'trackLink: linkType missing' };
    if (linkType !== 'link' && linkType !== 'download')
      return { invalid: 'trackLink: linkType must be link or download' };
    return toParams('trackLink', [{ param: linkType, arg: 'url', value: url }]);
  },

  trackContentImpression: ([contentName, contentPiece, contentTarget]) =>
    toParams('trackContentImpression', [
      { param: 'c_n', arg: 'contentName', value: contentName, required: true },
      { param: 'c_p', arg: 'contentPiece', value: contentPiece },
      { param: 'c_t', arg: 'contentTarget', value: contentTarget },
    ]),

  trackContentInteraction: ([
    contentInteraction,
    contentName,
    contentPiece,
    contentTarget,
  ]) =>
    toParams('trackContentInteraction', [
      {
        param: 'c_i',
        arg: 'contentInteraction',
        value: contentInteraction,
        required: true,
      },
      { param: 'c_n', arg: 'contentName', value: contentName, required: true },
      { param: 'c_p', arg: 'contentPiece', value: contentPiece },
      { param: 'c_t', arg: 'contentTarget', value: contentTarget },
    ]),

  trackEcommerceOrder: (
    [orderId, grandTotal, subTotal, tax, shipping, discount],
    items,
  ) =>
    ecommerce(
      'trackEcommerceOrder',
      [
        { param: 'ec_id', arg: 'orderId', value: orderId, required: true },
        {
          param: 'revenue',
          arg: 'grandTotal',
          value: grandTotal,
          required: true,
          type: 'number',
        },
        { param: 'ec_st', arg: 'subTotal', value: subTotal, type: 'number' },
        { param: 'ec_tx', arg: 'tax', value: tax, type: 'number' },
        { param: 'ec_sh', arg: 'shipping', value: shipping, type: 'number' },
        { param: 'ec_dt', arg: 'discount', value: discount, type: 'number' },
      ],
      items,
    ),

  trackEcommerceCartUpdate: ([grandTotal], items) =>
    ecommerce(
      'trackEcommerceCartUpdate',
      [
        {
          param: 'revenue',
          arg: 'grandTotal',
          value: grandTotal,
          required: true,
          type: 'number',
        },
      ],
      items,
    ),

  // A heartbeat: pv_time raises the page view's time on Matomo 6, in whole
  // seconds, and is left out below one second.
  ping: ([totalMs]) => {
    if (isMissing(totalMs)) return { params: [['ping', '1']] };
    const ms = toNumber(totalMs);
    if (ms === undefined) return { invalid: 'ping: totalMs not a number' };
    const seconds = Math.round(ms / 1000);
    return {
      params:
        seconds >= 1
          ? [
              ['ping', '1'],
              ['pv_time', String(seconds)],
            ]
          : [['ping', '1']],
    };
  },
};

/**
 * Translates positional JavaScript tracker arguments, and the order or cart
 * items, into ordered Tracking API parameters. Pure.
 */
export function methodParams(
  method: MethodName,
  args: readonly unknown[],
  items?: unknown,
): MethodResult {
  return METHODS[method](args, items);
}
