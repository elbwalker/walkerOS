import { makeTagId, type Tag, type TagTree } from '../types';

describe('tag-skeleton types', () => {
  it('constructs a representative nested tag tree', () => {
    const property: Tag = {
      id: makeTagId('product-price', 0),
      type: 'property',
      name: 'price',
      value: '29.99',
    };

    const action: Tag = {
      id: makeTagId('product-add', 0),
      type: 'action',
      name: 'add',
      label: 'click:add',
    };

    const entity: Tag = {
      id: makeTagId('product', 0),
      type: 'entity',
      name: 'product',
      children: [property, action],
    };

    const context: Tag = {
      id: makeTagId('context', 0),
      type: 'context',
      name: 'context',
      contextIndex: 0,
      children: [entity],
    };

    const global: Tag = {
      id: makeTagId('globals', 0),
      type: 'global',
      name: 'globals',
      value: 'en',
    };

    const tree: TagTree = {
      width: 320,
      height: 240,
      roots: [context, global],
    };

    expect(tree.width).toBe(320);
    expect(tree.height).toBe(240);
    expect(tree.src).toBeUndefined();
    expect(tree.roots).toHaveLength(2);

    const [firstRoot, secondRoot] = tree.roots;
    expect(firstRoot?.type).toBe('context');
    expect(firstRoot?.contextIndex).toBe(0);
    expect(secondRoot?.type).toBe('global');

    const nestedEntity = firstRoot?.children?.[0];
    expect(nestedEntity?.type).toBe('entity');
    expect(nestedEntity?.name).toBe('product');

    expect(nestedEntity?.children).toEqual([
      {
        id: 'product-price-0',
        type: 'property',
        name: 'price',
        value: '29.99',
      },
      { id: 'product-add-0', type: 'action', name: 'add', label: 'click:add' },
    ]);
  });

  it('makeTagId builds a stable id from seed and index', () => {
    expect(makeTagId('product', 0)).toBe('product-0');
  });
});
