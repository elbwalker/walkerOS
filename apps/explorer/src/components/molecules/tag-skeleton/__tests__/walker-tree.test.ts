/**
 * @jest-environment jsdom
 */
import type { Tag } from '../types';
import { scopeToTagTree } from '../walker-tree';

/** Render markup into the live jsdom document, then resolve that scope. */
function treeFromHtml(html: string) {
  document.body.innerHTML = html;
  return scopeToTagTree(document.body);
}

/**
 * A realistic product card: a globals carrier, a context band, a `product`
 * entity with a `click:add` action and a nested `price` entity.
 */
const HTML = `
  <div data-elbglobals="language:en;plan:premium">
    <div data-elbcontext="test:checkout_v2">
      <div data-elb="product" data-elb-product="name:Shirt;color:blue" data-elbaction="click:add">
        <span data-elb="price" data-elb-price="value:29.99;currency:EUR"></span>
      </div>
    </div>
  </div>
`;

/** Find the first descendant Tag (depth-first) matching a predicate. */
function findTag(
  tags: Tag[],
  predicate: (tag: Tag) => boolean,
): Tag | undefined {
  for (const tag of tags) {
    if (predicate(tag)) return tag;
    const found = tag.children ? findTag(tag.children, predicate) : undefined;
    if (found) return found;
  }
  return undefined;
}

describe('walker-tree adapter', () => {
  it('resolves data-elb HTML into a faithful TagTree', () => {
    const tree = treeFromHtml(HTML);

    expect(tree.width).toBe(0);
    expect(tree.height).toBe(0);
    expect(tree.src).toBeUndefined();

    // Globals appear as leaf roots, before the entities.
    const language = tree.roots.find((tag) => tag.name === 'language');
    const plan = tree.roots.find((tag) => tag.name === 'plan');
    expect(language?.type).toBe('global');
    expect(language?.value).toBe('en');
    expect(plan?.type).toBe('global');
    expect(plan?.value).toBe('premium');

    // The context band wraps the entity, titled by the context key.
    const context = tree.roots.find((tag) => tag.type === 'context');
    expect(context?.name).toBe('test');
    expect(context?.value).toBe('checkout_v2');
    expect(context?.contextIndex).toBe(0);

    // The product entity lives inside the context container.
    const product = findTag(
      context ? [context] : [],
      (tag) => tag.type === 'entity' && tag.name === 'product',
    );
    expect(product).toBeDefined();

    // Resolved properties carry key + value.
    const name = findTag(
      product ? [product] : [],
      (tag) => tag.name === 'name',
    );
    expect(name?.type).toBe('property');
    expect(name?.value).toBe('Shirt');
    const color = findTag(
      product ? [product] : [],
      (tag) => tag.name === 'color',
    );
    expect(color?.value).toBe('blue');

    // The action Tag: name = action, value = trigger.
    const action = findTag(
      product ? [product] : [],
      (tag) => tag.type === 'action',
    );
    expect(action?.name).toBe('add');
    expect(action?.value).toBe('click');

    // The nested price entity is present with its own properties.
    const price = findTag(
      product ? [product] : [],
      (tag) => tag.type === 'entity' && tag.name === 'price',
    );
    expect(price).toBeDefined();
    const priceValue = findTag(
      price ? [price] : [],
      (tag) => tag.name === 'value',
    );
    expect(priceValue?.value).toBe('29.99');
    const currency = findTag(
      price ? [price] : [],
      (tag) => tag.name === 'currency',
    );
    expect(currency?.value).toBe('EUR');
  });

  it('produces stable ids across two calls on the same HTML', () => {
    const first = treeFromHtml(HTML);
    const second = treeFromHtml(HTML);
    expect(second.roots.map((tag) => tag.id)).toEqual(
      first.roots.map((tag) => tag.id),
    );
  });

  it('groups one entity firing on multiple triggers into one Tag', () => {
    const html = `
      <div data-elb="product" data-elb-product="name:Shirt" data-elbaction="load:view;click:add">
      </div>
    `;
    const tree = treeFromHtml(html);
    const products = tree.roots.filter(
      (tag) => tag.type === 'entity' && tag.name === 'product',
    );
    expect(products).toHaveLength(1);
    const actions = (products[0]?.children ?? []).filter(
      (tag) => tag.type === 'action',
    );
    expect(actions.map((tag) => `${tag.value}:${tag.name}`)).toEqual([
      'load:view',
      'click:add',
    ]);
  });

  it('skips the synthetic page fallback entity', () => {
    // An action with no surrounding data-elb entity resolves to a `page`
    // fallback in the walker; the adapter drops it.
    const html = `<button data-elbaction="click:cta">Buy</button>`;
    const tree = treeFromHtml(html);
    expect(tree.roots.find((tag) => tag.name === 'page')).toBeUndefined();
  });

  it('scopeToTagTree resolves a live DOM scope', () => {
    document.body.innerHTML = HTML;
    const tree = scopeToTagTree(document.body);
    expect(
      tree.roots.some((tag) => tag.type === 'context' || tag.type === 'global'),
    ).toBe(true);
  });
});
