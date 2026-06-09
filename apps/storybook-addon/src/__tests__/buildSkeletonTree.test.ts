import { buildAttributeTree } from '../utils/attributeTreeUtils';

const root = (html: string): Element => {
  const el = document.createElement('div');
  el.innerHTML = html;
  return el;
};

describe('buildSkeletonTree (buildAttributeTree)', () => {
  test('resolves explicit, generic, and scoped onto the entity with origins', () => {
    const r = root(`
      <div data-elb_="currency:EUR">
        <div data-elb-="color:red">
          <div data-elb="product" data-elb-product="id:1"></div>
        </div>
      </div>
    `);
    const { nodes } = buildAttributeTree(r, 'data-elb');
    expect(nodes).toHaveLength(1);
    const product = nodes[0];
    expect(product.attributes.entity).toBe('product');
    const byKey = Object.fromEntries(
      product.attributes.properties!.map((p) => [p.key, p]),
    );
    expect(byKey.id).toMatchObject({ value: 1, origin: 'data' });
    expect(byKey.color).toMatchObject({ value: 'red', origin: 'generic' });
    expect(byKey.currency).toMatchObject({ value: 'EUR', origin: 'scoped' });
  });

  test('never produces an empty-string property key', () => {
    const r = root('<div data-elb="page" data-elb-="lang:en"></div>');
    const { nodes } = buildAttributeTree(r, 'data-elb');
    const keys = nodes[0].attributes.properties!.map((p) => p.key);
    expect(keys).not.toContain('');
    expect(keys).toContain('lang');
  });

  test('a shared generic fans out onto every consuming entity', () => {
    const r = root(`
      <div data-elb-="brand:acme">
        <div data-elb="product"></div>
        <div data-elb="cart"></div>
      </div>
    `);
    const { nodes } = buildAttributeTree(r, 'data-elb');
    const brandOf = (name: string) =>
      nodes
        .find((n) => n.attributes.entity === name)!
        .attributes.properties!.find((p) => p.key === 'brand');
    expect(brandOf('product')).toMatchObject({
      value: 'acme',
      origin: 'generic',
    });
    expect(brandOf('cart')).toMatchObject({ value: 'acme', origin: 'generic' });
  });

  test('nests entities by DOM ancestry', () => {
    const r = root(
      '<div data-elb="order"><div data-elb="product"></div></div>',
    );
    const { nodes } = buildAttributeTree(r, 'data-elb');
    expect(nodes).toHaveLength(1);
    expect(nodes[0].attributes.entity).toBe('order');
    expect(nodes[0].children[0].attributes.entity).toBe('product');
  });

  test("does not leak a nested entity's explicit data into the parent", () => {
    const r = root(`
      <div data-elb="order" data-elb-order="x:1">
        <div data-elb="product" data-elb-product="y:2"></div>
      </div>
    `);
    const { nodes } = buildAttributeTree(r, 'data-elb');
    const order = nodes[0];
    const product = order.children[0];
    const orderKeys = order.attributes.properties!.map((p) => p.key);
    const productKeys = product.attributes.properties!.map((p) => p.key);
    expect(orderKeys).toContain('x');
    expect(orderKeys).not.toContain('y');
    expect(productKeys).toContain('y');
    expect(productKeys).not.toContain('x');
  });

  test('hides the synthetic data-elbproperty marker from the html markup', () => {
    const r = root('<div data-elb="product" data-elb-product="id:1"></div>');
    // simulate what enhanceProperties stamps on the live DOM
    r.querySelector('[data-elb]')!.setAttribute('data-elbproperty', '');
    const { nodes } = buildAttributeTree(r, 'data-elb');
    expect(nodes[0].htmlMarkup).not.toContain('data-elbproperty');
    expect(nodes[0].htmlMarkup).toContain('data-elb-product');
  });
});
