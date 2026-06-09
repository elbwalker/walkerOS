import React from 'react';
import { TagCanvas } from './TagCanvas';
import { makeTagId, type Tag, type TagTree } from './types';
import type { TagSkeletonDetail } from './box-primitive';

export type { TagSkeletonDetail };

/**
 * One tagged entity, rendered as a rectangle. Mirrors walkerOS data-elb
 * tagging: `entity` is the `data-elb` name, `properties` are the
 * `data-elb-<entity>` values, `actions` are the `data-elbaction` triggers,
 * `context` is the `data-elbcontext` scope wrapping this box, and `children`
 * are nested `data-elb` entities drawn as boxes inside this one.
 */
export interface TagSkeletonNode {
  /**
   * Stable identity. Optional today (falls back to a path-based key); the
   * overlay editor uses it to select and diff boxes while dragging.
   */
  id?: string;
  entity: string;
  /** Optional freeform caption, centered inside the box. */
  label?: string;
  properties?: TagSkeletonDetail[];
  /** Trigger:action pairs, e.g. "click:add", "load:view". */
  actions?: string[];
  /** data-elbcontext entries wrapping this box. */
  context?: TagSkeletonDetail[];
  children?: TagSkeletonNode[];
}

export interface TagSkeletonProps {
  /** Root entities. Each renders as a top-level rectangle. */
  nodes: TagSkeletonNode[];
  /** data-elbglobals — page-wide scope drawn as the outermost box. */
  globals?: TagSkeletonDetail[];
  className?: string;
}

/** Stable key for a node, falling back to its entity name and index. */
function nodeKey(node: TagSkeletonNode, index: number): string {
  return node.id ?? makeTagId(node.entity, index);
}

/** A property detail (key:value) becomes a property leaf Tag. */
function propertyTag(
  detail: TagSkeletonDetail,
  seed: string,
  index: number,
): Tag {
  return {
    id: makeTagId(`${seed}-prop`, index),
    type: 'property',
    name: detail.key,
    value: detail.value,
  };
}

/** A global detail (key:value) becomes a global leaf Tag, a small marker. */
function globalTag(detail: TagSkeletonDetail, index: number): Tag {
  return {
    id: makeTagId('global', index),
    type: 'global',
    name: detail.key,
    value: detail.value,
  };
}

/**
 * A "trigger:action" string becomes an action leaf Tag whose name is the action
 * verb (after the last ':') and value is the trigger (before it). With no ':'
 * the whole string is the name and the value is undefined. So "click:add" =>
 * name "add", value "click".
 */
function actionTag(action: string, seed: string, index: number): Tag {
  const sep = action.lastIndexOf(':');
  const name = sep === -1 ? action : action.slice(sep + 1);
  const value = sep === -1 ? undefined : action.slice(0, sep);
  return {
    id: makeTagId(`${seed}-action`, index),
    type: 'action',
    name,
    ...(value !== undefined ? { value } : {}),
  };
}

/**
 * Convert one skeleton node into an entity Tag, wrapped by its context entries.
 * Each context entry becomes a `context` container titled by its key (value =
 * its value) that wraps the entity. Multiple entries nest (each wraps the next,
 * the innermost wraps the entity); authored order is preserved outermost-first.
 */
function toEntityTag(node: TagSkeletonNode, index: number): Tag {
  const seed = nodeKey(node, index);
  const children: Tag[] = [
    ...(node.properties ?? []).map((detail, i) => propertyTag(detail, seed, i)),
    ...(node.actions ?? []).map((action, i) => actionTag(action, seed, i)),
    ...(node.children ?? []).map((child, i) => toEntityTag(child, i)),
  ];

  const entity: Tag = {
    id: seed,
    type: 'entity',
    name: node.entity,
    label: node.label,
    children,
  };

  const context = node.context ?? [];
  if (context.length === 0) return entity;

  // Wrap the entity from the innermost context entry outward, so the first
  // authored entry ends up as the outermost box.
  let wrapped = entity;
  for (let i = context.length - 1; i >= 0; i -= 1) {
    const entry = context[i];
    if (!entry) continue;
    wrapped = {
      id: makeTagId(`${seed}-context`, i),
      type: 'context',
      name: entry.key,
      value: entry.value,
      children: [wrapped],
    };
  }
  return wrapped;
}

/**
 * Build a `TagTree` from the skeleton props (no src => auto layout). Globals are
 * small leaf markers placed before the entities as top-level roots; they no
 * longer wrap everything.
 */
function toTree(
  nodes: TagSkeletonNode[],
  globals?: TagSkeletonDetail[],
): TagTree {
  const entityTags = nodes.map((node, index) => toEntityTag(node, index));
  const globalTags = (globals ?? []).map((detail, i) => globalTag(detail, i));
  return { width: 0, height: 0, roots: [...globalTags, ...entityTags] };
}

/**
 * Renders a walkerOS tagging skeleton: nested rectangles built from data-elb
 * semantics (auto layout, content-driven, document nesting). Purely
 * presentational. Superseded by `TagCanvas`; kept as a thin back-compat wrapper
 * that adapts `{nodes, globals}` into a `TagTree`. For drawing rectangles onto a
 * screenshot, see `TagSkeletonOverlay`. All styling lives in theme CSS
 * variables.
 */
export function TagSkeleton({
  nodes,
  globals,
  className,
}: TagSkeletonProps): React.ReactElement {
  const tree = React.useMemo(() => toTree(nodes, globals), [nodes, globals]);
  return <TagCanvas tree={tree} className={className} />;
}
