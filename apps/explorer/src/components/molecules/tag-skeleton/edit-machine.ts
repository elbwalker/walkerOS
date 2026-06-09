/**
 * Pure state machine for the overlay editor's drag/resize interaction. It owns
 * NO React or DOM state: `reduce(state, event, tree, opts)` takes the current
 * transient interaction state plus the model tree and returns the next state
 * and a (possibly new) tree. The tree only changes on a commit (`up`); during a
 * drag the model is untouched and the component renders a transient preview.
 *
 * Pure: no React, no DOM, no randomness, no clock. Same inputs => same output.
 *
 * Coordinates are in the tree's grid-unit space. The component converts pointer
 * pixels to grid units via one measured scale before calling `reduce`.
 */

import { clampRect, type ClampContext } from './clamp';
import { layout, type PositionedTag } from './layout';
import { DEFAULT_LAYOUT_OPTIONS, type LayoutOptions } from './layout';
import type { Tag, TagRect, TagTree } from './types';

/** A point in grid-unit space. */
export interface Point {
  x: number;
  y: number;
}

/** The eight resize edges/corners. v1 wires the four corners. */
export type ResizeEdge = 'n' | 's' | 'e' | 'w' | 'nw' | 'ne' | 'sw' | 'se';

export type EditState =
  | { kind: 'idle' }
  | {
      kind: 'moving';
      id: string;
      /** Pointer-to-rect-origin offset captured at grab time. */
      grabDX: number;
      grabDY: number;
      /** The rect at grab time; size is preserved while moving. */
      origin: TagRect;
      /** Current model parent of the dragged tag (its real host). */
      hostId: string | null;
      /** Prospective new host, armed once the pointer crosses past hysteresis. */
      armedHostId: string | null;
      /** Latest pointer, in grid units. */
      lastPoint: Point;
    }
  | {
      kind: 'resizing';
      id: string;
      edge: ResizeEdge;
      /** The rect at grab time, the resize origin. */
      origin: TagRect;
      /** Latest pointer, in grid units. */
      lastPoint: Point;
    };

export type EditEvent =
  | { kind: 'down'; mode: 'move'; id: string; point: Point }
  | { kind: 'down'; mode: 'resize'; id: string; edge: ResizeEdge; point: Point }
  | { kind: 'move'; point: Point }
  | { kind: 'up' }
  | { kind: 'cancel' };

export interface EditOptions {
  /** Hysteresis margin: how far past a host's border the pointer must travel
   * before that host is armed as the new parent. In grid units. */
  hysteresis: number;
  /** Layout options used to resolve content boxes. Defaults to the shared set. */
  layout?: Partial<LayoutOptions>;
  /** Minimum tag size. Defaults to a small leaf-friendly floor. */
  min?: { w: number; h: number };
}

export interface ReduceResult {
  state: EditState;
  tree: TagTree;
}

export const initialState: EditState = { kind: 'idle' };

const DEFAULT_MIN = { w: 24, h: 16 };

function pointInRect(point: Point, rect: TagRect): boolean {
  return (
    point.x >= rect.x &&
    point.x < rect.x + rect.w &&
    point.y >= rect.y &&
    point.y < rect.y + rect.h
  );
}

/** Innermost-wins: the deepest positioned tag whose rect contains the point. */
export function hitTest(
  nodes: PositionedTag[],
  point: Point,
): PositionedTag | null {
  let best: PositionedTag | null = null;
  for (const node of nodes) {
    if (!pointInRect(point, node.rect)) continue;
    if (best === null || node.depth > best.depth) best = node;
  }
  return best;
}

/** A tag's parent id in the tree, or null for a root / not found. */
export function findParentId(tree: TagTree, id: string): string | null {
  let found: string | null = null;
  const walk = (tag: Tag, parentId: string | null): void => {
    if (tag.id === id) {
      found = parentId;
      return;
    }
    for (const child of tag.children ?? []) walk(child, tag.id);
  };
  for (const root of tree.roots) walk(root, null);
  return found;
}

/** A tag node by id, or null. */
function findTag(tree: TagTree, id: string): Tag | null {
  let found: Tag | null = null;
  const walk = (tag: Tag): void => {
    if (found) return;
    if (tag.id === id) {
      found = tag;
      return;
    }
    for (const child of tag.children ?? []) walk(child);
  };
  for (const root of tree.roots) walk(root);
  return found;
}

/** A positioned node by id from a layout result, or null. */
function positioned(nodes: PositionedTag[], id: string): PositionedTag | null {
  return nodes.find((node) => node.tag.id === id) ?? null;
}

/** True when `descendantId` is `id` or nested under it (cannot drop onto self). */
function isSelfOrDescendant(
  tree: TagTree,
  id: string,
  candidate: string,
): boolean {
  const tag = findTag(tree, id);
  if (!tag) return false;
  let match = false;
  const walk = (node: Tag): void => {
    if (node.id === candidate) match = true;
    for (const child of node.children ?? []) walk(child);
  };
  walk(tag);
  return match;
}

/** Content box of a container rect (rect minus top gutter and uniform pad). */
function contentBox(rect: TagRect, opts: LayoutOptions): TagRect {
  return {
    x: rect.x + opts.pad,
    y: rect.y + opts.gutter + opts.pad,
    w: rect.w - opts.pad * 2,
    h: rect.h - opts.gutter - opts.pad * 2,
  };
}

/** Union bounding box of a set of rects, or null when empty. */
function bbox(rects: TagRect[]): TagRect | null {
  if (rects.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const rect of rects) {
    minX = Math.min(minX, rect.x);
    minY = Math.min(minY, rect.y);
    maxX = Math.max(maxX, rect.x + rect.w);
    maxY = Math.max(maxY, rect.y + rect.h);
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

/** Immutably set a tag's rect by id, returning a new tree. */
function setRect(tree: TagTree, id: string, rect: TagRect): TagTree {
  const map = (tag: Tag): Tag => {
    if (tag.id === id) return { ...tag, rect };
    if (!tag.children) return tag;
    return { ...tag, children: tag.children.map(map) };
  };
  return { ...tree, roots: tree.roots.map(map) };
}

/** Remove a tag from the tree, returning the new tree and the removed tag. */
function removeTag(
  tree: TagTree,
  id: string,
): { tree: TagTree; removed: Tag | null } {
  let removed: Tag | null = null;
  const filterChildren = (children: Tag[]): Tag[] =>
    children
      .filter((child) => {
        if (child.id === id) {
          removed = child;
          return false;
        }
        return true;
      })
      .map((child) =>
        child.children
          ? { ...child, children: filterChildren(child.children) }
          : child,
      );

  const roots = tree.roots
    .filter((root) => {
      if (root.id === id) {
        removed = root;
        return false;
      }
      return true;
    })
    .map((root) =>
      root.children
        ? { ...root, children: filterChildren(root.children) }
        : root,
    );

  return { tree: { ...tree, roots }, removed };
}

/** Insert `child` (with rect set) under `parentId`, or as a root when null. */
function insertChild(
  tree: TagTree,
  parentId: string | null,
  child: Tag,
): TagTree {
  if (parentId === null) {
    return { ...tree, roots: [...tree.roots, child] };
  }
  const map = (tag: Tag): Tag => {
    if (tag.id === parentId) {
      return { ...tag, children: [...(tag.children ?? []), child] };
    }
    if (!tag.children) return tag;
    return { ...tag, children: tag.children.map(map) };
  };
  return { ...tree, roots: tree.roots.map(map) };
}

/**
 * Build the clamp context for `id` as a child of `hostId` (null = canvas root),
 * using the resolved layout nodes for sibling/parent rects.
 */
function clampContextFor(
  tree: TagTree,
  nodes: PositionedTag[],
  id: string,
  hostId: string | null,
  opts: LayoutOptions,
  min: { w: number; h: number },
): ClampContext {
  const canvas: TagRect = { x: 0, y: 0, w: tree.width, h: tree.height };

  let parentContent: TagRect | null = null;
  let siblingIds: string[];
  if (hostId === null) {
    siblingIds = tree.roots.map((root) => root.id).filter((sid) => sid !== id);
  } else {
    const host = positioned(nodes, hostId);
    parentContent = host ? contentBox(host.rect, opts) : null;
    const hostTag = findTag(tree, hostId);
    siblingIds = (hostTag?.children ?? [])
      .map((child) => child.id)
      .filter((sid) => sid !== id);
  }

  const siblings = siblingIds
    .map((sid) => positioned(nodes, sid)?.rect)
    .filter((rect): rect is TagRect => rect !== undefined);

  const self = findTag(tree, id);
  const childRects = (self?.children ?? [])
    .map((child) => positioned(nodes, child.id)?.rect)
    .filter((rect): rect is TagRect => rect !== undefined);
  const childrenBBox = bbox(childRects);

  return { parentContent, canvas, siblings, childrenBBox, min };
}

/** Resolve the rect a node currently occupies in the (transient) tree. */
function resolveRect(nodes: PositionedTag[], id: string): TagRect | null {
  return positioned(nodes, id)?.rect ?? null;
}

export function reduce(
  state: EditState,
  event: EditEvent,
  tree: TagTree,
  opts: EditOptions,
): ReduceResult {
  const layoutOpts: LayoutOptions = {
    ...DEFAULT_LAYOUT_OPTIONS,
    ...opts.layout,
  };
  const min = opts.min ?? DEFAULT_MIN;

  if (event.kind === 'cancel') {
    return { state: initialState, tree };
  }

  if (event.kind === 'down') {
    const { nodes } = layout(tree, layoutOpts);
    const rect = resolveRect(nodes, event.id);
    if (!rect) return { state, tree };

    if (event.mode === 'move') {
      const hostId = findParentId(tree, event.id);
      return {
        state: {
          kind: 'moving',
          id: event.id,
          grabDX: event.point.x - rect.x,
          grabDY: event.point.y - rect.y,
          origin: { ...rect },
          hostId,
          armedHostId: hostId,
          lastPoint: event.point,
        },
        tree,
      };
    }

    return {
      state: {
        kind: 'resizing',
        id: event.id,
        edge: event.edge,
        origin: { ...rect },
        lastPoint: event.point,
      },
      tree,
    };
  }

  if (event.kind === 'move') {
    if (state.kind === 'moving') {
      const { nodes } = layout(tree, layoutOpts);
      // Innermost host under the pointer that is not the dragged subtree itself.
      let armedHostId = state.armedHostId;
      const under = hitTest(nodes, event.point);
      const candidateId =
        under && !isSelfOrDescendant(tree, state.id, under.tag.id)
          ? under.tag.id
          : null;

      // Re-parent arming with hysteresis: arm a different host only when the
      // pointer is at least `hysteresis` past that host's border on every side
      // it shares (i.e. comfortably inside, not grazing the edge).
      if (candidateId !== null && candidateId !== armedHostId) {
        const hostRect = positioned(nodes, candidateId)?.rect;
        if (hostRect) {
          const insetFromBorder = Math.min(
            event.point.x - hostRect.x,
            hostRect.x + hostRect.w - event.point.x,
            event.point.y - hostRect.y,
            hostRect.y + hostRect.h - event.point.y,
          );
          if (insetFromBorder >= opts.hysteresis) {
            armedHostId = candidateId;
          }
        }
      } else if (candidateId === null && armedHostId !== state.hostId) {
        // Pointer left every container into open canvas: re-arm to canvas root
        // only after clearing the old armed host's border past hysteresis.
        const armedRect =
          armedHostId !== null ? positioned(nodes, armedHostId)?.rect : null;
        if (armedRect) {
          const outsideBy = Math.max(
            armedRect.x - event.point.x,
            event.point.x - (armedRect.x + armedRect.w),
            armedRect.y - event.point.y,
            event.point.y - (armedRect.y + armedRect.h),
          );
          if (outsideBy >= opts.hysteresis) armedHostId = null;
        }
      }

      return { state: { ...state, armedHostId, lastPoint: event.point }, tree };
    }

    if (state.kind === 'resizing') {
      // No model change until up; track the pointer for the commit clamp.
      return { state: { ...state, lastPoint: event.point }, tree };
    }

    return { state, tree };
  }

  // event.kind === 'up'  => commit.
  if (state.kind === 'moving') {
    const { nodes } = layout(tree, layoutOpts);

    const targetHost = state.armedHostId;
    const reParenting = targetHost !== state.hostId;

    // Proposed top-left follows the pointer: origin size, moved by the pointer
    // minus the captured grab offset.
    const proposed = moveRect(
      state.origin,
      state.grabDX,
      state.grabDY,
      state.lastPoint,
    );

    const ctx = clampContextFor(
      tree,
      nodes,
      state.id,
      targetHost,
      layoutOpts,
      min,
    );
    // Fallback = the pre-drag rect under the OLD host, so a rejected re-parent
    // snaps back cleanly.
    const fallback = { ...state.origin };
    const clamped = clampRect(proposed, ctx, fallback);

    if (!reParenting) {
      return { state: initialState, tree: setRect(tree, state.id, clamped) };
    }

    // Re-parent: detach, re-insert under the new host with the clamped rect.
    // If clamp rejected (returned the old-host fallback), snap back by leaving
    // the model parent unchanged.
    if (clamped === fallback) {
      return { state: initialState, tree: setRect(tree, state.id, fallback) };
    }

    const detached = removeTag(tree, state.id);
    if (!detached.removed) return { state: initialState, tree };
    const moved: Tag = { ...detached.removed, rect: clamped };
    const next = insertChild(detached.tree, targetHost, moved);
    return { state: initialState, tree: next };
  }

  if (state.kind === 'resizing') {
    const { nodes } = layout(tree, layoutOpts);
    const hostId = findParentId(tree, state.id);
    const ctx = clampContextFor(tree, nodes, state.id, hostId, layoutOpts, min);
    const proposed = resizeRect(state.origin, state.edge, state.lastPoint);
    const fallback = { ...state.origin };
    const clamped = clampRect(proposed, ctx, fallback);
    return { state: initialState, tree: setRect(tree, state.id, clamped) };
  }

  return { state: initialState, tree };
}

/**
 * Compute the proposed rect for a move given the grab offset and the current
 * pointer, in grid units. The component applies this to the tree transiently;
 * the reducer's commit then clamps it. Exposed for the component and tests.
 */
export function moveRect(
  origin: TagRect,
  grabDX: number,
  grabDY: number,
  point: Point,
): TagRect {
  return {
    x: point.x - grabDX,
    y: point.y - grabDY,
    w: origin.w,
    h: origin.h,
  };
}

/**
 * Compute the proposed rect for a resize given the origin rect, the grabbed
 * edge, and the current pointer, in grid units. Keeps the opposite corner
 * fixed. The reducer's commit clamps the result.
 */
export function resizeRect(
  origin: TagRect,
  edge: ResizeEdge,
  point: Point,
): TagRect {
  let { x, y, w, h } = origin;
  const right = origin.x + origin.w;
  const bottom = origin.y + origin.h;

  // Each compass letter moves its own edge; corners (two letters) move both.
  if (edge.includes('e')) w = point.x - origin.x;
  if (edge.includes('s')) h = point.y - origin.y;
  if (edge.includes('w')) {
    x = point.x;
    w = right - point.x;
  }
  if (edge.includes('n')) {
    y = point.y;
    h = bottom - point.y;
  }

  return { x, y, w, h };
}
