import React from 'react';
import { TagCanvas } from './TagCanvas';
import { makeTagId, type Tag, type TagTree, type TagType } from './types';
import type { BoxKind, TagSkeletonDetail } from './box-primitive';

/** A rectangle in the grid's coordinate space (image pixels). */
export interface TagOverlayRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** One rectangle drawn onto the screenshot. Positioning is flat: every box
 * anchors to the frame, not to a parent. `kind` only drives color. */
export interface TagOverlayBox {
  id?: string;
  /** Defaults to "entity". */
  kind?: BoxKind;
  /** Tab label. */
  name: string;
  rect: TagOverlayRect;
  label?: string;
  actions?: string[];
  properties?: TagSkeletonDetail[];
}

/**
 * The grid: its own coordinate space (match the screenshot's dimensions) plus
 * the boxes placed within it. Rects are authored in these units; the frame
 * renders them as percentages, so any display `size` stays aligned.
 */
export interface TagGrid {
  width: number;
  height: number;
  boxes: TagOverlayBox[];
}

export interface TagSkeletonOverlayProps {
  /** Background screenshot. */
  src: string;
  grid: TagGrid;
  /** Display width of the frame. Number = pixels; string = any CSS width.
   * Image and grid scale together. Defaults to "100%". */
  size?: number | string;
  alt?: string;
  className?: string;
}

/** Map a box `kind` to the unified `TagType` ("globals" => "global"). */
function kindToType(kind: BoxKind | undefined): TagType {
  if (kind === 'globals') return 'global';
  if (kind === 'context') return 'context';
  return 'entity';
}

/** Convert one overlay box into a Tag carrying its explicit rect. Properties
 * and actions become flat child leaf Tags so they stay logically grouped. */
function boxToTag(box: TagOverlayBox, index: number): Tag {
  const seed = box.id ?? makeTagId(box.name, index);
  const children: Tag[] = [
    ...(box.properties ?? []).map((detail, i) => ({
      id: makeTagId(`${seed}-prop`, i),
      type: 'property' as const,
      name: detail.key,
      value: detail.value,
    })),
    ...(box.actions ?? []).map((action, i) => ({
      id: makeTagId(`${seed}-action`, i),
      type: 'action' as const,
      name: action,
    })),
  ];

  return {
    id: seed,
    type: kindToType(box.kind),
    name: box.name,
    label: box.label,
    rect: {
      x: box.rect.x,
      y: box.rect.y,
      w: box.rect.width,
      h: box.rect.height,
    },
    ...(children.length > 0 ? { children } : {}),
  };
}

/** Build an overlay `TagTree` from `{src, grid}`. Flat: every box is a root with
 * its own explicit rect (logical nesting drives color, not position). */
function toTree(src: string, grid: TagGrid): TagTree {
  return {
    width: grid.width,
    height: grid.height,
    src,
    roots: grid.boxes.map((box, index) => boxToTag(box, index)),
  };
}

/**
 * Draws a tagging skeleton onto a screenshot. One relative anchor frame sized
 * to `src`; every box is positioned absolutely as a percentage of that frame,
 * so changing `size` scales image and grid together. Superseded by `TagCanvas`;
 * kept as a thin back-compat wrapper that adapts `{src, grid}` into a `TagTree`
 * with explicit rects. Positioning is flat (logical nesting drives color, not
 * position). Purely presentational; drag/resize is a separate controlled editor
 * on top. All styling lives in theme CSS variables.
 */
export function TagSkeletonOverlay({
  src,
  grid,
  size = '100%',
  alt = '',
  className,
}: TagSkeletonOverlayProps): React.ReactElement {
  const tree = React.useMemo(() => toTree(src, grid), [src, grid]);
  return <TagCanvas tree={tree} size={size} alt={alt} className={className} />;
}
