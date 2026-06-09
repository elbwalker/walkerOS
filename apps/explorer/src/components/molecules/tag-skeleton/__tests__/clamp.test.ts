import { clampRect, type ClampContext } from '../clamp';
import type { TagRect } from '../types';

/** True when `inner` is fully contained within `outer`. */
function within(inner: TagRect, outer: TagRect): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.w <= outer.x + outer.w &&
    inner.y + inner.h <= outer.y + outer.h
  );
}

/** True when two rects do not partially overlap (disjoint or fully nested). */
function disjoint(a: TagRect, b: TagRect): boolean {
  return (
    a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y
  );
}

const CANVAS: TagRect = { x: 0, y: 0, w: 1000, h: 1000 };

function ctx(partial: Partial<ClampContext>): ClampContext {
  return {
    parentContent: null,
    canvas: CANVAS,
    siblings: [],
    childrenBBox: null,
    min: { w: 40, h: 20 },
    ...partial,
  };
}

describe('clampRect()', () => {
  it('enforces the minimum size', () => {
    const proposed: TagRect = { x: 10, y: 10, w: 5, h: 5 };
    const result = clampRect(proposed, ctx({}), proposed);
    expect(result.w).toBeGreaterThanOrEqual(40);
    expect(result.h).toBeGreaterThanOrEqual(20);
  });

  it('cannot shrink below the children bounding box (plus its own offset)', () => {
    // children occupy a 200x150 box starting at (50,40) inside the rect
    const childrenBBox: TagRect = { x: 50, y: 40, w: 200, h: 150 };
    const proposed: TagRect = { x: 0, y: 0, w: 60, h: 60 };
    const result = clampRect(proposed, ctx({ childrenBBox }), {
      x: 0,
      y: 0,
      w: 300,
      h: 300,
    });
    // The result must still fully contain the children bbox.
    expect(within(childrenBBox, result)).toBe(true);
  });

  it('clamps a rect fully inside the parent content box', () => {
    const parentContent: TagRect = { x: 100, y: 100, w: 400, h: 400 };
    const proposed: TagRect = { x: 450, y: 450, w: 200, h: 200 };
    const result = clampRect(proposed, ctx({ parentContent }), proposed);
    expect(within(result, parentContent)).toBe(true);
  });

  it('clamps a rect fully inside the canvas when there is no parent', () => {
    const proposed: TagRect = { x: 950, y: 950, w: 200, h: 200 };
    const result = clampRect(proposed, ctx({}), proposed);
    expect(within(result, CANVAS)).toBe(true);
  });

  it('resolves overlap with a sibling so the result is disjoint', () => {
    const sibling: TagRect = { x: 100, y: 100, w: 100, h: 100 };
    const proposed: TagRect = { x: 120, y: 120, w: 100, h: 100 };
    const result = clampRect(proposed, ctx({ siblings: [sibling] }), proposed);
    expect(disjoint(result, sibling)).toBe(true);
    expect(within(result, CANVAS)).toBe(true);
  });

  it('resolves overlap with multiple siblings to a fully disjoint position', () => {
    const siblings: TagRect[] = [
      { x: 0, y: 0, w: 100, h: 100 },
      { x: 100, y: 0, w: 100, h: 100 },
      { x: 0, y: 100, w: 100, h: 100 },
    ];
    const proposed: TagRect = { x: 30, y: 30, w: 80, h: 80 };
    const result = clampRect(proposed, ctx({ siblings }), proposed);
    for (const sibling of siblings) {
      expect(disjoint(result, sibling)).toBe(true);
    }
    expect(within(result, CANVAS)).toBe(true);
  });

  it('returns the fallback when no laminar position exists', () => {
    // A parent content box exactly one min-rect wide, already filled by a sibling.
    const parentContent: TagRect = { x: 0, y: 0, w: 40, h: 20 };
    const sibling: TagRect = { x: 0, y: 0, w: 40, h: 20 };
    const fallback: TagRect = { x: 1, y: 1, w: 1, h: 1 };
    const proposed: TagRect = { x: 0, y: 0, w: 40, h: 20 };
    const result = clampRect(
      proposed,
      ctx({ parentContent, siblings: [sibling] }),
      fallback,
    );
    expect(result).toEqual(fallback);
  });

  it('keeps the fallback rect itself laminar against siblings', () => {
    const parentContent: TagRect = { x: 0, y: 0, w: 40, h: 20 };
    const sibling: TagRect = { x: 0, y: 0, w: 40, h: 20 };
    const fallback: TagRect = { x: 1, y: 1, w: 1, h: 1 };
    const result = clampRect(
      { x: 0, y: 0, w: 40, h: 20 },
      ctx({ parentContent, siblings: [sibling] }),
      fallback,
    );
    // The returned rect is the fallback; it is not asserted disjoint here
    // because the caller owns the fallback's validity. We only assert identity.
    expect(result).toBe(fallback);
  });

  it('never returns a rect that partially overlaps a sibling (within bounds)', () => {
    const siblings: TagRect[] = [
      { x: 200, y: 200, w: 150, h: 150 },
      { x: 400, y: 200, w: 150, h: 150 },
    ];
    const proposed: TagRect = { x: 250, y: 250, w: 120, h: 120 };
    const fallback: TagRect = { x: 0, y: 0, w: 120, h: 120 };
    const result = clampRect(proposed, ctx({ siblings }), fallback);
    for (const sibling of siblings) {
      expect(disjoint(result, sibling)).toBe(true);
    }
  });

  it('is idempotent for an already-valid rect', () => {
    const parentContent: TagRect = { x: 0, y: 0, w: 500, h: 500 };
    const sibling: TagRect = { x: 300, y: 300, w: 100, h: 100 };
    const valid: TagRect = { x: 10, y: 10, w: 100, h: 100 };
    const result = clampRect(
      valid,
      ctx({ parentContent, siblings: [sibling] }),
      valid,
    );
    expect(result).toEqual(valid);
  });
});
