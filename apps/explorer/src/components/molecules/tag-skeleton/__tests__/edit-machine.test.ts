import {
  reduce,
  hitTest,
  findParentId,
  initialState,
  type EditState,
  type EditOptions,
} from '../edit-machine';
import { layout, laminarViolations } from '../layout';
import { makeTagId, type Tag, type TagTree } from '../types';

const OPTS: EditOptions = { hysteresis: 16 };

/**
 * Two sibling entities side by side, each with a property leaf, on an overlay
 * tree with explicit rects so geometry is fully deterministic.
 */
function twoEntityTree(): TagTree {
  const left: Tag = {
    id: 'left-0',
    type: 'entity',
    name: 'left',
    rect: { x: 0, y: 0, w: 300, h: 300 },
    children: [
      {
        id: 'prop-0',
        type: 'property',
        name: 'price',
        value: '9',
        rect: { x: 20, y: 40, w: 80, h: 40 },
      },
    ],
  };
  const right: Tag = {
    id: 'right-0',
    type: 'entity',
    name: 'right',
    rect: { x: 400, y: 0, w: 300, h: 300 },
    children: [],
  };
  return { width: 800, height: 400, src: 'shot.png', roots: [left, right] };
}

/** Resolve a tag's current rect from layout. */
function rectOf(tree: TagTree, id: string) {
  const node = layout(tree).nodes.find((n) => n.tag.id === id);
  if (!node) throw new Error(`no node ${id}`);
  return node.rect;
}

describe('hitTest()', () => {
  it('returns the deepest tag whose rect contains the point', () => {
    const tree = twoEntityTree();
    const { nodes } = layout(tree);
    // Point inside the left entity's property leaf.
    const hit = hitTest(nodes, { x: 40, y: 60 });
    expect(hit?.tag.id).toBe('prop-0');
  });

  it('returns the container when the point is in its content but not a child', () => {
    const tree = twoEntityTree();
    const { nodes } = layout(tree);
    const hit = hitTest(nodes, { x: 250, y: 250 });
    expect(hit?.tag.id).toBe('left-0');
  });

  it('returns null when the point hits nothing', () => {
    const tree = twoEntityTree();
    const { nodes } = layout(tree);
    const hit = hitTest(nodes, { x: 350, y: 350 });
    expect(hit).toBeNull();
  });
});

describe('reduce() move + re-parent', () => {
  it('does not re-parent while the pointer center stays within the host margin', () => {
    const tree = twoEntityTree();
    // Grab the property leaf at its top-left.
    let state: EditState = reduce(
      initialState,
      { kind: 'down', mode: 'move', id: 'prop-0', point: { x: 20, y: 40 } },
      tree,
      OPTS,
    ).state;
    // Nudge it a little, still well inside the left entity.
    state = reduce(
      state,
      { kind: 'move', point: { x: 40, y: 60 } },
      tree,
      OPTS,
    ).state;
    expect(state.kind).toBe('moving');
    if (state.kind !== 'moving') return;
    expect(state.armedHostId).toBe('left-0');
  });

  it('arms the new host only after the pointer center crosses the border past hysteresis', () => {
    const tree = twoEntityTree();
    let state: EditState = reduce(
      initialState,
      { kind: 'down', mode: 'move', id: 'prop-0', point: { x: 40, y: 60 } },
      tree,
      OPTS,
    ).state;

    // Move the pointer center to x=410 (just inside the right entity which
    // starts at x=400). 410 - 400 = 10 < hysteresis 16 => NOT armed yet.
    state = reduce(
      state,
      { kind: 'move', point: { x: 410, y: 60 } },
      tree,
      OPTS,
    ).state;
    if (state.kind !== 'moving') throw new Error('expected moving');
    expect(state.armedHostId).toBe('left-0');

    // Move deeper, x=430 => 430-400 = 30 > 16 => armed to right entity.
    state = reduce(
      state,
      { kind: 'move', point: { x: 430, y: 60 } },
      tree,
      OPTS,
    ).state;
    if (state.kind !== 'moving') throw new Error('expected moving');
    expect(state.armedHostId).toBe('right-0');
  });

  it('commits a re-parent on up and emits a laminar tree', () => {
    const tree = twoEntityTree();
    let result = reduce(
      initialState,
      { kind: 'down', mode: 'move', id: 'prop-0', point: { x: 40, y: 60 } },
      tree,
      OPTS,
    );
    result = reduce(
      result.state,
      { kind: 'move', point: { x: 450, y: 100 } },
      tree,
      OPTS,
    );
    result = reduce(result.state, { kind: 'up' }, tree, OPTS);

    expect(result.state.kind).toBe('idle');
    // The property is now a child of the right entity.
    expect(findParentId(result.tree, 'prop-0')).toBe('right-0');
    expect(laminarViolations(layout(result.tree).nodes)).toEqual([]);
  });

  it('snaps back (no model change) when a move within the same host is committed', () => {
    const tree = twoEntityTree();
    const before = rectOf(tree, 'prop-0');
    let result = reduce(
      initialState,
      { kind: 'down', mode: 'move', id: 'prop-0', point: { x: 40, y: 60 } },
      tree,
      OPTS,
    );
    result = reduce(
      result.state,
      { kind: 'move', point: { x: 60, y: 90 } },
      tree,
      OPTS,
    );
    result = reduce(result.state, { kind: 'up' }, tree, OPTS);
    // Still parented to the left entity.
    expect(findParentId(result.tree, 'prop-0')).toBe('left-0');
    // Moved within the same parent: rect changed but still laminar.
    const after = rectOf(result.tree, 'prop-0');
    expect(after).not.toEqual(before);
    expect(laminarViolations(layout(result.tree).nodes)).toEqual([]);
  });
});

describe('reduce() resize', () => {
  it('clamps a resized child to fit inside its parent', () => {
    const tree = twoEntityTree();
    let result = reduce(
      initialState,
      {
        kind: 'down',
        mode: 'resize',
        id: 'prop-0',
        edge: 'se',
        point: { x: 100, y: 80 },
      },
      tree,
      OPTS,
    );
    // Drag the SE handle way beyond the parent's content box.
    result = reduce(
      result.state,
      { kind: 'move', point: { x: 5000, y: 5000 } },
      tree,
      OPTS,
    );
    result = reduce(result.state, { kind: 'up' }, tree, OPTS);

    const parent = rectOf(result.tree, 'left-0');
    const child = rectOf(result.tree, 'prop-0');
    expect(child.x + child.w).toBeLessThanOrEqual(parent.x + parent.w);
    expect(child.y + child.h).toBeLessThanOrEqual(parent.y + parent.h);
    expect(laminarViolations(layout(result.tree).nodes)).toEqual([]);
  });

  it('does not let a parent shrink below its children bounding box', () => {
    const tree = twoEntityTree();
    const childBefore = rectOf(tree, 'prop-0');
    let result = reduce(
      initialState,
      {
        kind: 'down',
        mode: 'resize',
        id: 'left-0',
        edge: 'se',
        point: { x: 300, y: 300 },
      },
      tree,
      OPTS,
    );
    // Try to collapse the left entity to a tiny size.
    result = reduce(
      result.state,
      { kind: 'move', point: { x: 5, y: 5 } },
      tree,
      OPTS,
    );
    result = reduce(result.state, { kind: 'up' }, tree, OPTS);

    const parent = rectOf(result.tree, 'left-0');
    // Parent must still contain the (unchanged) child bbox.
    expect(parent.x + parent.w).toBeGreaterThanOrEqual(
      childBefore.x + childBefore.w,
    );
    expect(parent.y + parent.h).toBeGreaterThanOrEqual(
      childBefore.y + childBefore.h,
    );
    expect(laminarViolations(layout(result.tree).nodes)).toEqual([]);
  });

  it('treats siblings as walls during resize', () => {
    const tree = twoEntityTree();
    let result = reduce(
      initialState,
      {
        kind: 'down',
        mode: 'resize',
        id: 'left-0',
        edge: 'se',
        point: { x: 300, y: 300 },
      },
      tree,
      OPTS,
    );
    // Grow the left entity east into the right entity.
    result = reduce(
      result.state,
      { kind: 'move', point: { x: 600, y: 300 } },
      tree,
      OPTS,
    );
    result = reduce(result.state, { kind: 'up' }, tree, OPTS);
    expect(laminarViolations(layout(result.tree).nodes)).toEqual([]);
  });
});

describe('reduce() commit invariant', () => {
  it('every committed tree passes laminarViolations === []', () => {
    const tree = twoEntityTree();
    const points = [
      { x: 100, y: 100 },
      { x: 450, y: 150 },
      { x: 700, y: 280 },
      { x: 10, y: 10 },
    ];
    for (const point of points) {
      let result = reduce(
        initialState,
        { kind: 'down', mode: 'move', id: 'prop-0', point: { x: 40, y: 60 } },
        tree,
        OPTS,
      );
      result = reduce(result.state, { kind: 'move', point }, tree, OPTS);
      result = reduce(result.state, { kind: 'up' }, tree, OPTS);
      expect(laminarViolations(layout(result.tree).nodes)).toEqual([]);
    }
  });
});
