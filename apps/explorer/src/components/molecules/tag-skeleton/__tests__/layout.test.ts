import {
  layout,
  laminarViolations,
  DEFAULT_LAYOUT_OPTIONS,
  type PositionedTag,
} from '../layout';
import { makeTagId, type Tag, type TagTree } from '../types';

/** True when `inner` is fully contained within `outer`. */
function within(
  inner: PositionedTag['rect'],
  outer: PositionedTag['rect'],
): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.w <= outer.x + outer.w &&
    inner.y + inner.h <= outer.y + outer.h
  );
}

/** The content box of a positioned container: rect minus top gutter and uniform pad. */
function contentBox(node: PositionedTag): PositionedTag['rect'] {
  const { pad, gutter } = DEFAULT_LAYOUT_OPTIONS;
  return {
    x: node.rect.x + pad,
    y: node.rect.y + gutter + pad,
    w: node.rect.w - pad * 2,
    h: node.rect.h - gutter - pad * 2,
  };
}

/** A representative nested tree: a context container wrapping an entity that
 * holds a property leaf and an action leaf. `context` and `entity` are the only
 * containers; `global`, `action` and `property` are leaf markers. */
function nestedTree(): TagTree {
  const property: Tag = {
    id: makeTagId('price', 0),
    type: 'property',
    name: 'price',
    value: '29.99',
  };
  const action: Tag = {
    id: makeTagId('add', 0),
    type: 'action',
    name: 'add',
    value: 'click',
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
    name: 'test',
    value: 'checkout_v2',
    children: [entity],
  };
  return { width: 0, height: 0, roots: [context] };
}

describe('layout()', () => {
  it('places every child rect fully inside its parent content box', () => {
    const { nodes } = layout(nestedTree());
    const byId = new Map(nodes.map((node) => [node.tag.id, node]));

    for (const node of nodes) {
      if (node.parentId === null) continue;
      const parent = byId.get(node.parentId);
      expect(parent).toBeDefined();
      if (!parent) continue;
      expect(within(node.rect, contentBox(parent))).toBe(true);
    }
  });

  it('produces no laminar violations for a nested tree', () => {
    const { nodes } = layout(nestedTree());
    expect(laminarViolations(nodes)).toEqual([]);
  });

  it('returns a Tag with an explicit rect verbatim', () => {
    const rect = { x: 12, y: 34, w: 56, h: 78 };
    const tree: TagTree = {
      width: 200,
      height: 200,
      roots: [{ id: 'fixed-0', type: 'entity', name: 'fixed', rect }],
    };
    const { nodes } = layout(tree);
    const fixed = nodes.find((node) => node.tag.id === 'fixed-0');
    expect(fixed).toBeDefined();
    expect(fixed?.rect).toEqual(rect);
  });

  it('stacks roots vertically and bounds them with width/height', () => {
    const tree: TagTree = {
      width: 0,
      height: 0,
      roots: [
        { id: 'a-0', type: 'entity', name: 'a' },
        { id: 'b-0', type: 'entity', name: 'b' },
      ],
    };
    const result = layout(tree);
    const a = result.nodes.find((node) => node.tag.id === 'a-0');
    const b = result.nodes.find((node) => node.tag.id === 'b-0');
    expect(a).toBeDefined();
    expect(b).toBeDefined();
    if (!a || !b) return;

    // Second root sits below the first (vertical stack).
    expect(b.rect.y).toBeGreaterThanOrEqual(a.rect.y + a.rect.h);

    // Bounding box covers both roots.
    expect(result.width).toBeGreaterThanOrEqual(a.rect.x + a.rect.w);
    expect(result.width).toBeGreaterThanOrEqual(b.rect.x + b.rect.w);
    expect(result.height).toBeGreaterThanOrEqual(b.rect.y + b.rect.h);
  });

  it('honors tree.width/height as the canvas when a src is set', () => {
    const tree: TagTree = {
      width: 800,
      height: 600,
      src: 'screenshot.png',
      roots: [
        {
          id: 'box-0',
          type: 'entity',
          name: 'box',
          rect: { x: 10, y: 10, w: 50, h: 50 },
        },
      ],
    };
    const result = layout(tree);
    expect(result.width).toBe(800);
    expect(result.height).toBe(600);
  });

  it('wraps many property leaves into rows that stay inside the content box', () => {
    const leaves: Tag[] = Array.from({ length: 8 }, (_, index) => ({
      id: makeTagId('prop', index),
      type: 'property' as const,
      name: `prop${index}`,
    }));
    const tree: TagTree = {
      width: 0,
      height: 0,
      roots: [
        { id: 'entity-0', type: 'entity', name: 'entity', children: leaves },
      ],
    };
    const { nodes } = layout(tree);
    const parent = nodes.find((node) => node.tag.id === 'entity-0');
    expect(parent).toBeDefined();
    if (!parent) return;

    const content = contentBox(parent);
    const leafNodes = nodes.filter((node) => node.parentId === 'entity-0');
    expect(leafNodes).toHaveLength(8);
    for (const leaf of leafNodes) {
      expect(within(leaf.rect, content)).toBe(true);
    }

    // At least two distinct rows (wrapping happened).
    const rows = new Set(leafNodes.map((leaf) => leaf.rect.y));
    expect(rows.size).toBeGreaterThanOrEqual(2);

    expect(laminarViolations(nodes)).toEqual([]);
  });

  it('treats a global as a leaf: it lays out no children', () => {
    const tree: TagTree = {
      width: 0,
      height: 0,
      roots: [
        {
          id: 'global-0',
          type: 'global',
          name: 'language',
          value: 'en',
          // Children on a leaf type must be ignored by layout.
          children: [{ id: 'ignored-0', type: 'property', name: 'nope' }],
        },
      ],
    };
    const { nodes } = layout(tree);
    expect(nodes.map((node) => node.tag.id)).toEqual(['global-0']);
  });

  it('flattens nodes with parents before their children (paint order)', () => {
    const { nodes } = layout(nestedTree());
    const indexById = new Map(nodes.map((node, index) => [node.tag.id, index]));
    for (const node of nodes) {
      if (node.parentId === null) continue;
      const parentIndex = indexById.get(node.parentId);
      const ownIndex = indexById.get(node.tag.id);
      expect(parentIndex).toBeDefined();
      expect(ownIndex).toBeDefined();
      if (parentIndex === undefined || ownIndex === undefined) continue;
      expect(parentIndex).toBeLessThan(ownIndex);
    }
  });
});
