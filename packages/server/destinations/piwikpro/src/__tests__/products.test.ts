import { toEcProducts } from '../products';

describe('toEcProducts', () => {
  it('renders positional product arrays with null for missing optionals', () => {
    expect(
      toEcProducts([
        {
          sku: 'ers',
          name: 'Everyday Ruck Snack',
          price: 420,
          quantity: 1,
          variant: 'black',
          customDimensions: { 1: 'l' },
        },
        {
          sku: 'cc',
          name: 'Cool Cap',
          price: 42,
          quantity: 1,
          variant: undefined,
          customDimensions: { 1: 'one size' },
        },
      ]),
    ).toEqual({
      value:
        '[["ers","Everyday Ruck Snack",null,420,1,null,"black",{"1":"l"}],["cc","Cool Cap",null,42,1,null,null,{"1":"one size"}]]',
    });
  });

  it('keeps category, brand and numeric strings', () => {
    expect(
      toEcProducts([
        {
          sku: 7,
          category: ['a', 'b'],
          price: '9.5',
          quantity: '2',
          brand: 'walker',
        },
      ]),
    ).toEqual({ value: '[["7",null,["a","b"],9.5,2,"walker",null,null]]' });
  });

  const one = { sku: 'x' };

  it.each<[string, unknown, string]>([
    ['no products', [], 'ec_products: expected 1 to 100 products'],
    [
      '101 products',
      Array.from({ length: 101 }, () => one),
      'ec_products: expected 1 to 100 products',
    ],
    ['not an array', one, 'ec_products: expected 1 to 100 products'],
    ['a missing sku', [{ name: 'n' }], 'ec_products: sku missing'],
    [
      'six categories',
      [{ sku: 'x', category: ['a', 'b', 'c', 'd', 'e', 'f'] }],
      'ec_products: category must be a string or up to 5 strings',
    ],
    [
      'a non-numeric price',
      [{ sku: 'x', price: 'cheap' }],
      'ec_products: price not numeric',
    ],
  ])('rejects %s', (_, products, invalid) => {
    expect(toEcProducts(products)).toEqual({ invalid });
  });
});
