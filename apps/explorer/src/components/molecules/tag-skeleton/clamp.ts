/**
 * Pure containment rule for the overlay editor. Given a proposed rect and its
 * geometric context (parent content box, canvas, same-parent siblings, this
 * node's own children bounding box, and a minimum size), `clampRect` returns a
 * laminar-valid rect: large enough to hold its children, fully inside its
 * container, and disjoint from every sibling. When no such position exists it
 * returns the caller-supplied `fallback` (the pre-drag rect), so the editor can
 * snap back rather than emit a non-laminar tree.
 *
 * Pure: no React, no DOM, no randomness, no clock. Same inputs => same output.
 */

import type { TagRect } from './types';

export interface ClampContext {
  /** Parent's CONTENT box (null = the node sits directly on the canvas root). */
  parentContent: TagRect | null;
  /** The full canvas bounds. */
  canvas: TagRect;
  /** Resolved rects of same-parent siblings, excluding self. */
  siblings: TagRect[];
  /** Union of this node's own children rects, or null when it has none. */
  childrenBBox: TagRect | null;
  /** Minimum allowed size for the rect. */
  min: { w: number; h: number };
}

function rectsOverlap(a: TagRect, b: TagRect): boolean {
  return (
    a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h
  );
}

function within(inner: TagRect, outer: TagRect): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.w <= outer.x + outer.w &&
    inner.y + inner.h <= outer.y + outer.h
  );
}

/** Clamp a rect's position so it sits fully inside `bounds`, keeping its size. */
function clampInto(rect: TagRect, bounds: TagRect): TagRect {
  const maxX = bounds.x + bounds.w - rect.w;
  const maxY = bounds.y + bounds.h - rect.h;
  // When the rect is wider/taller than bounds, the min/max collapse; pin to the
  // bounds origin so callers can detect the impossibility via a later width check.
  const x =
    maxX < bounds.x ? bounds.x : Math.min(Math.max(rect.x, bounds.x), maxX);
  const y =
    maxY < bounds.y ? bounds.y : Math.min(Math.max(rect.y, bounds.y), maxY);
  return { x, y, w: rect.w, h: rect.h };
}

/**
 * Translate `rect` by the minimum amount along one axis to stop overlapping
 * `obstacle`. Picks the smallest of the four candidate pushes (left, right, up,
 * down). Pure and deterministic.
 */
function minTranslateOut(rect: TagRect, obstacle: TagRect): TagRect {
  const pushLeft = obstacle.x - (rect.x + rect.w); // negative dx
  const pushRight = obstacle.x + obstacle.w - rect.x; // positive dx
  const pushUp = obstacle.y - (rect.y + rect.h); // negative dy
  const pushDown = obstacle.y + obstacle.h - rect.y; // positive dy

  const candidates: Array<{ dx: number; dy: number; cost: number }> = [
    { dx: pushLeft, dy: 0, cost: Math.abs(pushLeft) },
    { dx: pushRight, dy: 0, cost: Math.abs(pushRight) },
    { dx: 0, dy: pushUp, cost: Math.abs(pushUp) },
    { dx: 0, dy: pushDown, cost: Math.abs(pushDown) },
  ];

  let best = candidates[0];
  for (const candidate of candidates) {
    if (candidate.cost < best.cost) best = candidate;
  }
  return { x: rect.x + best.dx, y: rect.y + best.dy, w: rect.w, h: rect.h };
}

export function clampRect(
  proposed: TagRect,
  ctx: ClampContext,
  fallback: TagRect,
): TagRect {
  const bounds = ctx.parentContent ?? ctx.canvas;

  // (1) Minimum size, including room for this node's children. The rect's own
  // origin acts as the inset, so the floor is the distance from the rect origin
  // to the far edge of the children bounding box.
  let w = Math.max(proposed.w, ctx.min.w);
  let h = Math.max(proposed.h, ctx.min.h);
  if (ctx.childrenBBox) {
    const childRight = ctx.childrenBBox.x + ctx.childrenBBox.w;
    const childBottom = ctx.childrenBBox.y + ctx.childrenBBox.h;
    w = Math.max(w, childRight - proposed.x);
    h = Math.max(h, childBottom - proposed.y);
  }

  let rect: TagRect = { x: proposed.x, y: proposed.y, w, h };

  // If the required size cannot fit in the container at all, there is no valid
  // position: revert.
  if (rect.w > bounds.w || rect.h > bounds.h) return fallback;

  // (2) Clamp into the parent content box (or canvas).
  rect = clampInto(rect, bounds);

  // (3) Sibling de-overlap by minimum-translation, iterating to a fixed point.
  // Bounded by siblings.length passes: each pass resolves the first overlap and
  // re-clamps; a stable pass with no overlaps means we are done.
  const maxPasses = ctx.siblings.length + 1;
  for (let pass = 0; pass < maxPasses; pass += 1) {
    let moved = false;
    for (const sibling of ctx.siblings) {
      if (rectsOverlap(rect, sibling)) {
        rect = minTranslateOut(rect, sibling);
        // (4) Re-clamp into bounds after each push so we never escape.
        rect = clampInto(rect, bounds);
        moved = true;
      }
    }
    if (!moved) break;
  }

  // Final validity check: fully inside bounds and disjoint from all siblings.
  if (!within(rect, bounds)) return fallback;
  for (const sibling of ctx.siblings) {
    if (rectsOverlap(rect, sibling)) return fallback;
  }

  return rect;
}
