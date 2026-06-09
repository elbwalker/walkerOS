// Back-compat wrappers (superseded by TagCanvas, kept so existing imports work).
export { TagSkeleton } from './TagSkeleton';
export type {
  TagSkeletonProps,
  TagSkeletonNode,
  TagSkeletonDetail,
} from './TagSkeleton';
export { TagSkeletonOverlay } from './TagSkeletonOverlay';
export type {
  TagSkeletonOverlayProps,
  TagGrid,
  TagOverlayBox,
  TagOverlayRect,
} from './TagSkeletonOverlay';

// Unified model: the recursive `Tag` atom (value) and the `Tag` model type
// share one name. TypeScript merges a value and a type under the same symbol
// only when they are declared together, so re-merge them locally here.
import { Tag as TagAtom } from './tag-atom';
import type { Tag as TagModel } from './types';
export const Tag = TagAtom;
export type Tag = TagModel;
export type { TagProps } from './tag-atom';

// Renderer and controlled editor.
export { TagCanvas } from './TagCanvas';
export type { TagCanvasProps } from './TagCanvas';
export { TagTreeEditor } from './TagTreeEditor';
export type { TagTreeEditorProps } from './TagTreeEditor';

// Pure positioning and containment.
export { layout } from './layout';
export type { PositionedTag, LayoutResult, LayoutOptions } from './layout';
export { clampRect } from './clamp';

// Model types.
export { makeTagId } from './types';
export type { TagTree, TagType, TagRect } from './types';

// Walker-backed adapter: a live data-elb DOM scope into a TagTree, reusing the
// browser source's own resolution (the FAITHFUL path).
export { scopeToTagTree } from './walker-tree';
