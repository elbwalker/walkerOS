/**
 * Pure auto-layout for a `TagTree`. Turns a recursive tag tree into a flat list
 * of absolutely positioned rectangles in the tree's grid-unit coordinate space.
 *
 * Laminar by construction: any two emitted rects are fully nested or fully
 * disjoint, never partially overlapping. Geometry mirrors hierarchy (a property
 * inside an entity is drawn inside it), exactly like DOM nesting.
 *
 * Pure: no React, no DOM, no randomness, no clock. Given the same tree and
 * options it always returns the same result.
 */

import type { Tag, TagRect, TagTree } from './types';

/** One tag with its resolved absolute position and tree placement. */
export interface PositionedTag {
  tag: Tag;
  rect: TagRect;
  depth: number;
  parentId: string | null;
}

/** Flattened layout. `nodes` are ordered parents-before-children (paint order). */
export interface LayoutResult {
  width: number;
  height: number;
  nodes: PositionedTag[];
}

/** Tunable geometry, all in grid units. */
export interface LayoutOptions {
  /** Uniform inner padding inside every container. */
  pad: number;
  /** Extra top space reserved for a container's straddling tab. */
  gutter: number;
  /** Spacing between siblings (rows, leaves, stacked containers). */
  gap: number;
  /** Default leaf width before any name-based growth. */
  leafW: number;
  /** Leaf height. */
  leafH: number;
  /** Minimum width a container may collapse to. */
  minContainerW: number;
  /** Minimum height a container may collapse to. */
  minContainerH: number;
}

export const DEFAULT_LAYOUT_OPTIONS: LayoutOptions = {
  pad: 8,
  gutter: 16,
  gap: 8,
  leafW: 96,
  leafH: 32,
  minContainerW: 120,
  minContainerH: 56,
};

/** A tag is a container when its type can hold children that nest visually.
 * Containers are `entity` and `context`; `global`, `action` and `property` are
 * leaf markers. */
function isContainer(type: Tag['type']): boolean {
  return type === 'context' || type === 'entity';
}

/**
 * Geometric leaf width. Grown a little by name length so longer labels get
 * more room, but kept deterministic and text-metric-free: 7 grid units per
 * character beyond a small baseline. Sizing stays geometric; overflow of the
 * actual rendered text is acceptable for v1.
 */
function leafWidth(tag: Tag, opts: LayoutOptions): number {
  const labelLength = Math.max(tag.name.length, (tag.value ?? '').length);
  const baseline = 8;
  const grown = opts.leafW + Math.max(0, labelLength - baseline) * 7;
  return grown;
}

interface Measured {
  tag: Tag;
  w: number;
  h: number;
  /** Children measured in render groups: leaves first (wrapped), then containers. */
  leaves: Measured[];
  containers: Measured[];
  /** Width available inside the content box, used during placement. */
  contentW: number;
}

/** Bottom-up size pass. Returns the measured size of `tag`. */
function measure(tag: Tag, opts: LayoutOptions): Measured {
  // Explicit rect: size is honored verbatim, but children are still measured
  // and classified so they can flow inside the rect's content box.
  if (tag.rect) {
    const leaves: Measured[] = [];
    const containers: Measured[] = [];
    if (isContainer(tag.type)) {
      for (const child of tag.children ?? []) {
        const measured = measure(child, opts);
        if (isContainer(child.type)) containers.push(measured);
        else leaves.push(measured);
      }
    }
    return {
      tag,
      w: tag.rect.w,
      h: tag.rect.h,
      leaves,
      containers,
      contentW: Math.max(0, tag.rect.w - opts.pad * 2),
    };
  }

  if (!isContainer(tag.type)) {
    return {
      tag,
      w: leafWidth(tag, opts),
      h: opts.leafH,
      leaves: [],
      containers: [],
      contentW: 0,
    };
  }

  const children = tag.children ?? [];
  const leaves: Measured[] = [];
  const containers: Measured[] = [];
  for (const child of children) {
    const measured = measure(child, opts);
    if (isContainer(child.type)) containers.push(measured);
    else leaves.push(measured);
  }

  // Decide a content width wide enough for the widest single child and roughly
  // the squared-off shape of the leaf block. The actual wrap happens in place().
  const widestLeaf = leaves.reduce((max, leaf) => Math.max(max, leaf.w), 0);
  const widestContainer = containers.reduce(
    (max, container) => Math.max(max, container.w),
    0,
  );

  // Target a leaf block that wraps near a square: ceil(sqrt(n)) leaves per row.
  const perRow = leaves.length > 0 ? Math.ceil(Math.sqrt(leaves.length)) : 0;
  let leafRowW = 0;
  if (perRow > 0) {
    // Width of `perRow` leaves laid side by side (uniform leaf width = max leaf).
    leafRowW = perRow * widestLeaf + (perRow - 1) * opts.gap;
  }

  const contentW = Math.max(
    leafRowW,
    widestContainer,
    opts.minContainerW - opts.pad * 2,
  );

  // Measure heights by simulating the wrap with the resolved contentW.
  const leafBlockH = measureLeafBlockHeight(leaves, contentW, opts);
  const containerBlockH = containers.reduce(
    (sum, container, index) => sum + container.h + (index > 0 ? opts.gap : 0),
    0,
  );

  let inner = leafBlockH;
  if (leafBlockH > 0 && containerBlockH > 0) inner += opts.gap;
  inner += containerBlockH;

  const w = Math.max(contentW + opts.pad * 2, opts.minContainerW);
  const h = Math.max(opts.gutter + opts.pad * 2 + inner, opts.minContainerH);

  return { tag, w, h, leaves, containers, contentW };
}

/** Height of the wrapped leaf block given a fixed content width. */
function measureLeafBlockHeight(
  leaves: Measured[],
  contentW: number,
  opts: LayoutOptions,
): number {
  if (leaves.length === 0) return 0;
  let rows = 1;
  let cursorX = 0;
  for (let index = 0; index < leaves.length; index += 1) {
    const leaf = leaves[index];
    if (!leaf) continue;
    const needsWrap = index > 0 && cursorX + opts.gap + leaf.w > contentW;
    if (needsWrap) {
      rows += 1;
      cursorX = leaf.w;
    } else {
      cursorX += (index > 0 ? opts.gap : 0) + leaf.w;
    }
  }
  return rows * opts.leafH + (rows - 1) * opts.gap;
}

/**
 * Top-down placement pass. Assigns an absolute rect to `measured` at `(x, y)`,
 * then recurses into its children inside the content box. Appends each node to
 * `out` parent-first.
 */
function place(
  measured: Measured,
  x: number,
  y: number,
  depth: number,
  parentId: string | null,
  opts: LayoutOptions,
  out: PositionedTag[],
): void {
  const { tag } = measured;

  // Explicit rect: use verbatim (overlay / hand-placed). Children, if any, are
  // still placed relative to this rect's content box.
  const rect: TagRect = tag.rect
    ? { ...tag.rect }
    : { x, y, w: measured.w, h: measured.h };

  out.push({ tag, rect, depth, parentId });

  if (!isContainer(tag.type)) return;

  const children = tag.children ?? [];
  if (children.length === 0) return;

  const contentX = rect.x + opts.pad;
  const contentY = rect.y + opts.gutter + opts.pad;
  const contentW = rect.w - opts.pad * 2;

  // Children with explicit rects are placed verbatim; only auto children flow.
  const { leaves, containers } = measured;

  // Lay leaves into wrapped rows.
  let rowX = contentX;
  let rowY = contentY;
  let rowMaxH = 0;
  let placedInRow = 0;
  for (const leaf of leaves) {
    if (leaf.tag.rect) {
      place(leaf, 0, 0, depth + 1, tag.id, opts, out);
      continue;
    }
    const needsWrap =
      placedInRow > 0 && rowX - contentX + opts.gap + leaf.w > contentW;
    if (needsWrap) {
      rowY += rowMaxH + opts.gap;
      rowX = contentX;
      rowMaxH = 0;
      placedInRow = 0;
    }
    const leafX = placedInRow > 0 ? rowX + opts.gap : rowX;
    place(leaf, leafX, rowY, depth + 1, tag.id, opts, out);
    rowX = leafX + leaf.w;
    rowMaxH = Math.max(rowMaxH, leaf.h);
    placedInRow += 1;
  }

  // Stack containers below the leaf block.
  let stackY = contentY;
  if (leaves.length > 0) stackY = rowY + rowMaxH + opts.gap;
  for (const container of containers) {
    if (container.tag.rect) {
      place(container, 0, 0, depth + 1, tag.id, opts, out);
      continue;
    }
    place(container, contentX, stackY, depth + 1, tag.id, opts, out);
    stackY += container.h + opts.gap;
  }
}

/**
 * Lay out a tag tree.
 *
 * Per node: an explicit `tag.rect` is honored verbatim; otherwise the rect is
 * computed (bottom-up measure, top-down place). A tree may freely mix both.
 *
 * Roots stack vertically from the origin. The returned canvas size follows one
 * rule: if the tree carries a `src` (overlay mode) or any root has an explicit
 * rect, the tree's own `width`/`height` are honored as the canvas (so authored
 * coordinates stay aligned to the screenshot). Otherwise the canvas is the
 * computed bounding box of all roots, never smaller than the tree's declared
 * size.
 */
export function layout(
  tree: TagTree,
  opts?: Partial<LayoutOptions>,
): LayoutResult {
  const resolved: LayoutOptions = { ...DEFAULT_LAYOUT_OPTIONS, ...opts };
  const nodes: PositionedTag[] = [];

  let cursorY = 0;
  let maxRight = 0;
  let hasExplicitRoot = false;

  for (const root of tree.roots) {
    if (root.rect) hasExplicitRoot = true;
    const measured = measure(root, resolved);
    const startY = root.rect ? root.rect.y : cursorY;
    place(measured, 0, startY, 0, null, resolved, nodes);

    // Advance the vertical cursor past this root and track the right edge.
    if (root.rect) {
      maxRight = Math.max(maxRight, root.rect.x + root.rect.w);
      cursorY = Math.max(cursorY, root.rect.y + root.rect.h + resolved.gap);
    } else {
      maxRight = Math.max(maxRight, measured.w);
      cursorY += measured.h + resolved.gap;
    }
  }

  const computedHeight = cursorY > 0 ? cursorY - resolved.gap : 0;

  const honorTreeSize = tree.src !== undefined || hasExplicitRoot;

  const width = honorTreeSize ? tree.width : Math.max(tree.width, maxRight);
  const height = honorTreeSize
    ? tree.height
    : Math.max(tree.height, computedHeight);

  return { width, height, nodes };
}

/**
 * Test/diagnostic helper: returns the id pairs of any two nodes whose rects
 * partially overlap (neither disjoint nor fully nested). A laminar layout
 * returns an empty array.
 */
export function laminarViolations(nodes: PositionedTag[]): string[] {
  const violations: string[] = [];
  for (let i = 0; i < nodes.length; i += 1) {
    for (let j = i + 1; j < nodes.length; j += 1) {
      const a = nodes[i];
      const b = nodes[j];
      if (!a || !b) continue;
      if (disjoint(a.rect, b.rect)) continue;
      if (contains(a.rect, b.rect) || contains(b.rect, a.rect)) continue;
      violations.push(`${a.tag.id} <> ${b.tag.id}`);
    }
  }
  return violations;
}

function disjoint(a: TagRect, b: TagRect): boolean {
  return (
    a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y
  );
}

function contains(outer: TagRect, inner: TagRect): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.w <= outer.x + outer.w &&
    inner.y + inner.h <= outer.y + outer.h
  );
}
