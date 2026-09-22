import { isArray, isObject } from '@walkeros/core';

const MAX_PRODUCTS = 100;
const MAX_CATEGORIES = 5;

/** [sku, name, category, price, quantity, brand, variant, dimensions] */
type EcProduct = [
  string,
  string | null,
  string | string[] | null,
  number | null,
  number | null,
  string | null,
  string | null,
  Record<string, string> | null,
];

type Row = { row: EcProduct } | { invalid: string };

/** A finite number, or a numeric string as its number; undefined otherwise. */
export function toNumber(value: unknown): number | undefined {
  if (typeof value === 'number')
    return Number.isFinite(value) ? value : undefined;
  if (typeof value !== 'string' || value.trim() === '') return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

/** A required argument is missing when undefined, null or empty. */
export function isMissing(value: unknown): value is undefined | null | '' {
  return value === undefined || value === null || value === '';
}

function toText(value: unknown): string | null {
  return isMissing(value) ? null : String(value);
}

/** null when missing, undefined when present but not numeric. */
function toOptionalNumber(value: unknown): number | null | undefined {
  return isMissing(value) ? null : toNumber(value);
}

function toCategory(value: unknown): string | string[] | null | undefined {
  if (isMissing(value)) return null;
  if (typeof value === 'string') return value;
  if (
    isArray(value) &&
    value.length <= MAX_CATEGORIES &&
    value.every((item) => typeof item === 'string')
  )
    return value.map(String);
  return undefined;
}

function toDimensions(value: unknown): Record<string, string> | null {
  if (!isObject(value)) return null;
  const dimensions: Record<string, string> = {};
  Object.entries(value).forEach(([id, dimension]) => {
    if (!isMissing(dimension)) dimensions[id] = String(dimension);
  });
  return Object.keys(dimensions).length ? dimensions : null;
}

function toRow(product: unknown): Row {
  if (!isObject(product) || isMissing(product.sku))
    return { invalid: 'ec_products: sku missing' };

  const category = toCategory(product.category);
  if (category === undefined)
    return {
      invalid: 'ec_products: category must be a string or up to 5 strings',
    };

  const price = toOptionalNumber(product.price);
  if (price === undefined) return { invalid: 'ec_products: price not numeric' };

  const quantity = toOptionalNumber(product.quantity);
  if (quantity === undefined)
    return { invalid: 'ec_products: quantity not numeric' };

  return {
    row: [
      String(product.sku),
      toText(product.name),
      category,
      price,
      quantity,
      toText(product.brand),
      toText(product.variant),
      toDimensions(product.customDimensions),
    ],
  };
}

/** JS product objects -> the ec_products JSON string, or the reason it cannot be one. Pure. */
export function toEcProducts(
  products: unknown,
): { value: string } | { invalid: string } {
  if (
    !isArray(products) ||
    products.length < 1 ||
    products.length > MAX_PRODUCTS
  )
    return { invalid: 'ec_products: expected 1 to 100 products' };

  const rows: EcProduct[] = [];
  for (const product of products) {
    const result = toRow(product);
    if ('invalid' in result) return result;
    rows.push(result.row);
  }

  return { value: JSON.stringify(rows) };
}
