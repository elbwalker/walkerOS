import type { Hit } from './types';
import type { MethodName } from './methods';
import { isArray, isObject } from '@walkeros/core';

/** The JavaScript tracker's limit: a category, or a list of up to 5. */
const MAX_CATEGORIES = 5;

/** A required argument is missing when undefined, null or empty. */
export function isMissing(value: unknown): value is undefined | null | '' {
  return value === undefined || value === null || value === '';
}

/** A finite number, or a numeric string as its number; undefined otherwise. */
export function toNumber(value: unknown): number | undefined {
  if (typeof value === 'number')
    return Number.isFinite(value) ? value : undefined;
  if (typeof value !== 'string' || value.trim() === '') return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

/** A string, number or boolean as text; anything else, or '', is no value. */
export function toText(value: unknown): string | undefined {
  if (
    typeof value !== 'string' &&
    typeof value !== 'number' &&
    typeof value !== 'boolean'
  )
    return undefined;
  const text = String(value);
  return text === '' ? undefined : text;
}

/** A positive integer, given as a number or a decimal string, as text. */
export function toPositiveInteger(value: unknown): string | undefined {
  if (typeof value === 'number')
    return Number.isInteger(value) && value > 0 ? String(value) : undefined;
  return typeof value === 'string' && /^[1-9]\d*$/.test(value)
    ? value
    : undefined;
}

/** A sku: a string or a number, as text. */
function toSku(value: unknown): string | undefined {
  return typeof value === 'string' || typeof value === 'number'
    ? toText(value)
    : undefined;
}

type Category = string | string[];

/** '' for none, the text, or a list of up to 5 texts; undefined for more. */
function toCategory(value: unknown): Category | undefined {
  if (!isArray(value)) return toText(value) ?? '';
  if (value.length > MAX_CATEGORIES) return undefined;
  return value
    .map((item) => toText(item))
    .filter((item): item is string => item !== undefined);
}

/** [sku, name, category, price, quantity], Matomo's ec_items row. */
type EcItem = [string, string, Category, number, number];

/**
 * Order or cart items as the ec_items JSON, with Matomo's defaults for a
 * missing name or category (''), price (0) and quantity (1), or the reason
 * they cannot be sent.
 */
export function toEcItems(
  value: unknown,
  method: MethodName,
): { json: string } | { invalid: string } {
  if (!isArray(value)) return { invalid: `${method}: items not a list` };

  const rows: EcItem[] = [];
  for (const [index, item] of value.entries()) {
    const at = `${method}: items[${index}]`;
    const sku = isObject(item) ? toSku(item.sku) : undefined;
    if (!isObject(item) || sku === undefined)
      return { invalid: `${at}.sku missing` };

    const category = toCategory(item.category);
    if (category === undefined)
      return { invalid: `${at}.category more than ${MAX_CATEGORIES}` };

    const price = isMissing(item.price) ? 0 : toNumber(item.price);
    if (price === undefined) return { invalid: `${at}.price not a number` };

    const quantity = isMissing(item.quantity) ? 1 : toNumber(item.quantity);
    if (quantity === undefined)
      return { invalid: `${at}.quantity not a number` };
    if (!Number.isInteger(quantity))
      return { invalid: `${at}.quantity not an integer` };

    rows.push([sku, toText(item.name) ?? '', category, price, quantity]);
  }

  return { json: JSON.stringify(rows) };
}

/**
 * The product fields of a product page's page view (_pks, _pkn, _pkc, _pkp),
 * as Matomo records a product view. Without a sku the page view goes without
 * them; a field that cannot be sent is named in `dropped`.
 */
export function toEcommerceView(value: unknown): {
  params: Hit;
  dropped: string[];
} {
  const sku = isObject(value) ? toSku(value.sku) : undefined;
  if (!isObject(value) || sku === undefined)
    return { params: [], dropped: ['ecommerceView (no sku)'] };

  const params: Hit = [['_pks', sku]];
  const dropped: string[] = [];

  const name = toText(value.name);
  if (name !== undefined) params.push(['_pkn', name]);

  const category = toCategory(value.category);
  if (category === undefined)
    dropped.push(`ecommerceView.category (more than ${MAX_CATEGORIES})`);
  else if (category.length)
    params.push([
      '_pkc',
      typeof category === 'string' ? category : JSON.stringify(category),
    ]);

  if (!isMissing(value.price)) {
    const price = toNumber(value.price);
    if (price === undefined) dropped.push('ecommerceView.price (not a number)');
    else params.push(['_pkp', String(price)]);
  }

  return { params, dropped };
}
