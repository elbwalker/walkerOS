/**
 * Shared model for the unified tag visualization. One recursive `Tag` atom
 * (like a DOM element) drives both auto-layout skeletons and overlay editors.
 * Later building blocks (renderers, overlay editor) consume these types.
 */

/** The kind of a tag. Drives color and layout role. */
export type TagType = 'global' | 'context' | 'entity' | 'action' | 'property';

/** Position and size in the tree's coordinate space. */
export interface TagRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * A single tag node. Recursive: a tag may nest children, mirroring how a
 * tagged DOM element wraps its descendants.
 */
export interface Tag {
  /** Required, stable id: drives selection, diffing, React keys, drag identity. */
  id: string;
  type: TagType;
  /** Tab label. */
  name: string;
  /** Resolved value; absent means shape-only (the data is not decided yet). */
  value?: string;
  /** Optional freeform caption. */
  label?: string;
  /** Present => explicit/overlay position; absent => auto-computed by layout. */
  rect?: TagRect;
  /** For type 'context': depth rank where the closest context is 0. */
  contextIndex?: number;
  children?: Tag[];
}

/**
 * A full tag tree. The coordinate space is grid units for auto layout, or
 * image-natural pixels when overlaying a screenshot.
 */
export interface TagTree {
  width: number;
  height: number;
  /** Optional background screenshot, used in overlay mode. */
  src?: string;
  roots: Tag[];
}

/**
 * Build a stable tag id from a seed and an index, e.g. `product-0`. Pure: no
 * randomness, no clock. Use during tree construction to give every tag a
 * deterministic identity.
 */
export function makeTagId(seed: string, index: number): string {
  return `${seed}-${index}`;
}
