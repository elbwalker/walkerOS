import React from 'react';
import { TagCanvas } from './TagCanvas';
import { layout, type PositionedTag } from './layout';
import {
  reduce,
  moveRect,
  resizeRect,
  initialState,
  findParentId,
  type EditState,
  type EditEvent,
  type EditOptions,
  type ResizeEdge,
  type Point,
} from './edit-machine';
import type { Tag, TagRect, TagTree } from './types';

export interface TagTreeEditorProps {
  /** The model tree (controlled). The editor never holds model state. */
  tree: TagTree;
  /** Called with a new tree on every commit (move/resize/keyboard). */
  onChange: (tree: TagTree) => void;
  /** Display width of the anchor frame. Number = px; string = any CSS width. */
  size?: number | string;
  className?: string;
  /** Hysteresis margin in grid units for re-parent arming. */
  hysteresis?: number;
  /** Tab visibility forwarded to the inner canvas. Defaults to 'always'. */
  captions?: 'always' | 'hover';
}

// Edges first, corners last, so corner squares paint over the bar ends.
const RESIZE_EDGES: ResizeEdge[] = ['n', 's', 'e', 'w', 'nw', 'ne', 'sw', 'se'];

/** Thin dimension (CSS px) of an edge resize bar, and the corner square size. */
const HANDLE_BAR = 8;
const HANDLE_CORNER = 11;

/** Immutably set a tag's rect by id, returning a new tree (transient preview). */
function withRect(tree: TagTree, id: string, rect: TagRect): TagTree {
  const map = (tag: Tag): Tag => {
    if (tag.id === id) return { ...tag, rect };
    if (!tag.children) return tag;
    return { ...tag, children: tag.children.map(map) };
  };
  return { ...tree, roots: tree.roots.map(map) };
}

/** Nudge a rect by a grid step in the given direction. */
function nudge(rect: TagRect, dx: number, dy: number): TagRect {
  return { ...rect, x: rect.x + dx, y: rect.y + dy };
}

/**
 * Controlled drag/resize editor for a `TagTree`. Owns no model state: it renders
 * the prop `tree` through `TagCanvas`, holds only transient interaction state in
 * the pure reducer, and emits a new tree via `onChange` on every commit. Pointer
 * pixels are converted to the tree's grid-unit space via one measured `scale`
 * (frame rendered width / tree.width) tracked with a ResizeObserver. Appearance
 * lives in the atom/SCSS; this component is interaction-only.
 */
export function TagTreeEditor({
  tree,
  onChange,
  size = '100%',
  className,
  hysteresis = 16,
  captions = 'always',
}: TagTreeEditorProps): React.ReactElement {
  const frameRef = React.useRef<HTMLDivElement>(null);
  const [scale, setScale] = React.useState(1);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [machine, setMachine] = React.useState<EditState>(initialState);

  const opts: EditOptions = React.useMemo(() => ({ hysteresis }), [hysteresis]);

  // Track the rendered scale: grid units * scale = device pixels.
  React.useEffect(() => {
    const frame = frameRef.current;
    if (!frame || tree.width === 0) return;
    const update = (): void => {
      const rendered = frame.getBoundingClientRect().width;
      if (rendered > 0) setScale(rendered / tree.width);
    };
    update();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(update);
    observer.observe(frame);
    return () => observer.disconnect();
  }, [tree.width]);

  const layoutResult = React.useMemo(() => layout(tree), [tree]);

  /** Convert a pointer event's client position to grid units. */
  const toGrid = React.useCallback(
    (clientX: number, clientY: number): Point => {
      const frame = frameRef.current;
      if (!frame || scale === 0) return { x: 0, y: 0 };
      const box = frame.getBoundingClientRect();
      return {
        x: (clientX - box.left) / scale,
        y: (clientY - box.top) / scale,
      };
    },
    [scale],
  );

  const dispatch = React.useCallback(
    (event: EditEvent) => {
      const result = reduce(machine, event, tree, opts);
      setMachine(result.state);
      if (result.tree !== tree) onChange(result.tree);
    },
    [machine, tree, opts, onChange],
  );

  // Transient preview: while moving/resizing, show the dragged rect following
  // the pointer without mutating the model. The reducer commits on pointerup.
  const previewTree = React.useMemo(() => {
    if (machine.kind === 'moving') {
      const rect = moveRect(
        machine.origin,
        machine.grabDX,
        machine.grabDY,
        machine.lastPoint,
      );
      return withRect(tree, machine.id, rect);
    }
    if (machine.kind === 'resizing') {
      const rect = resizeRect(machine.origin, machine.edge, machine.lastPoint);
      return withRect(tree, machine.id, rect);
    }
    return tree;
  }, [machine, tree]);

  const draggingId =
    machine.kind === 'moving' || machine.kind === 'resizing'
      ? machine.id
      : undefined;

  const handleBoxPointerDown = (
    event: React.PointerEvent,
    node: PositionedTag,
  ): void => {
    event.stopPropagation();
    setSelectedId(node.tag.id);
    const point = toGrid(event.clientX, event.clientY);
    dispatch({ kind: 'down', mode: 'move', id: node.tag.id, point });
    (event.target as Element).setPointerCapture?.(event.pointerId);
  };

  const handleHandlePointerDown = (
    event: React.PointerEvent,
    id: string,
    edge: ResizeEdge,
  ): void => {
    event.stopPropagation();
    const point = toGrid(event.clientX, event.clientY);
    dispatch({ kind: 'down', mode: 'resize', id, edge, point });
    (event.target as Element).setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent): void => {
    if (machine.kind === 'idle') return;
    dispatch({ kind: 'move', point: toGrid(event.clientX, event.clientY) });
  };

  const handlePointerUp = (): void => {
    if (machine.kind === 'idle') return;
    dispatch({ kind: 'up' });
  };

  // Keyboard: arrows move focus across siblings; modifier+arrow nudges the rect;
  // Tab/Shift+Tab re-parent through the same commit path.
  const handleKeyDown = (event: React.KeyboardEvent): void => {
    if (!selectedId) return;
    const node = layoutResult.nodes.find((n) => n.tag.id === selectedId);
    if (!node) return;
    const step = 8;
    const modifier = event.shiftKey || event.metaKey || event.ctrlKey;

    if (event.key === 'Tab') {
      // Re-parent: Tab demotes under the previous sibling (becomes its child);
      // Shift+Tab promotes to the grandparent. Same clamp/commit path.
      event.preventDefault();
      const parentId = findParentId(tree, selectedId);
      if (event.shiftKey) {
        if (parentId === null) return; // already a root
        const grandparentId = findParentId(tree, parentId);
        onChange(reduceReparent(tree, selectedId, grandparentId, opts));
        return;
      }
      const siblings = layoutResult.nodes.filter(
        (n) => findParentId(tree, n.tag.id) === parentId,
      );
      const index = siblings.findIndex((n) => n.tag.id === selectedId);
      const prev = index > 0 ? siblings[index - 1] : undefined;
      if (prev) onChange(reduceReparent(tree, selectedId, prev.tag.id, opts));
      return;
    }

    if (
      event.key === 'ArrowLeft' ||
      event.key === 'ArrowRight' ||
      event.key === 'ArrowUp' ||
      event.key === 'ArrowDown'
    ) {
      if (modifier) {
        event.preventDefault();
        const dx =
          event.key === 'ArrowLeft'
            ? -step
            : event.key === 'ArrowRight'
              ? step
              : 0;
        const dy =
          event.key === 'ArrowUp'
            ? -step
            : event.key === 'ArrowDown'
              ? step
              : 0;
        // Set the nudged rect transiently, then commit through the clamp path so
        // the emitted tree stays laminar.
        const next = withRect(tree, selectedId, nudge(node.rect, dx, dy));
        onChange(reduceCommitMove(next, selectedId, opts));
        return;
      }
      // Move focus to the next/prev sibling.
      event.preventDefault();
      const parentId = findParentId(tree, selectedId);
      const siblings = layoutResult.nodes.filter(
        (n) => findParentId(tree, n.tag.id) === parentId,
      );
      const index = siblings.findIndex((n) => n.tag.id === selectedId);
      const forward = event.key === 'ArrowRight' || event.key === 'ArrowDown';
      const nextIndex = forward ? index + 1 : index - 1;
      const target =
        siblings[Math.max(0, Math.min(siblings.length - 1, nextIndex))];
      if (target) setSelectedId(target.tag.id);
    }
  };

  const renderTreeItems = (tags: Tag[]): React.ReactNode =>
    tags.map((tag) => (
      <li
        key={tag.id}
        role="treeitem"
        aria-selected={tag.id === selectedId}
        aria-label={`${tag.type} ${tag.name}${tag.value !== undefined ? `: ${tag.value}` : ''}`}
        tabIndex={tag.id === selectedId ? 0 : -1}
        onFocus={() => setSelectedId(tag.id)}
      >
        {tag.children && tag.children.length > 0 && (
          <ul role="group">{renderTreeItems(tag.children)}</ul>
        )}
      </li>
    ));

  const selectedNode =
    previewTree && selectedId
      ? layout(previewTree).nodes.find((n) => n.tag.id === selectedId)
      : undefined;

  const { width, height } = layoutResult;

  return (
    <div
      className={['elb-tag-tree-editor', className].filter(Boolean).join(' ')}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onKeyDown={handleKeyDown}
    >
      <div
        ref={frameRef}
        style={{
          position: 'relative',
          width: typeof size === 'number' ? `${size}px` : size,
        }}
      >
        <TagCanvas
          tree={previewTree}
          size="100%"
          captions={captions}
          selectedId={selectedId ?? undefined}
          draggingId={draggingId}
        />
        {/* Pointer-capture overlay for each box, plus resize handles on the
            selected box. Positioned as a percentage of the same frame. */}
        <div aria-hidden="true" style={{ position: 'absolute', inset: 0 }}>
          {layout(previewTree).nodes.map((node) => (
            <div
              key={node.tag.id}
              className="elb-tag-tree-editor__hit"
              onPointerDown={(event) => handleBoxPointerDown(event, node)}
              style={{
                position: 'absolute',
                left: pct(node.rect.x, width),
                top: pct(node.rect.y, height),
                width: pct(node.rect.w, width),
                height: pct(node.rect.h, height),
                cursor: 'grab',
              }}
            />
          ))}
          {selectedNode &&
            RESIZE_EDGES.map((edge) => (
              <div
                key={edge}
                className={`elb-tag-tree-editor__handle elb-tag-tree-editor__handle--${edge}`}
                onPointerDown={(event) =>
                  handleHandlePointerDown(event, selectedNode.tag.id, edge)
                }
                style={handleStyle(selectedNode.rect, edge, width, height)}
              />
            ))}
        </div>
      </div>
      {/* Accessible mirror of the model hierarchy. */}
      <ul
        role="tree"
        aria-label="Tag tree"
        className="elb-tag-tree-editor__a11y"
      >
        {renderTreeItems(tree.roots)}
      </ul>
    </div>
  );
}

/** A coordinate as a percentage of the given total, for the anchor frame. */
function pct(value: number, total: number): string {
  return `${total === 0 ? 0 : (value / total) * 100}%`;
}

/**
 * Absolute style for a resize handle. Corners (two-letter edges) are small
 * squares centered on the corner; edges (n/s/e/w) are thin bars laid along the
 * line they drag, spanning that side of the box.
 */
function handleStyle(
  rect: TagRect,
  edge: ResizeEdge,
  width: number,
  height: number,
): React.CSSProperties {
  const right = rect.x + rect.w;
  const bottom = rect.y + rect.h;

  if (edge.length === 2) {
    const cornerX = edge.includes('w') ? rect.x : right;
    const cornerY = edge.includes('n') ? rect.y : bottom;
    return {
      position: 'absolute',
      left: pct(cornerX, width),
      top: pct(cornerY, height),
      width: `${HANDLE_CORNER}px`,
      height: `${HANDLE_CORNER}px`,
      transform: 'translate(-50%, -50%)',
      cursor: edge === 'nw' || edge === 'se' ? 'nwse-resize' : 'nesw-resize',
    };
  }

  if (edge === 'n' || edge === 's') {
    return {
      position: 'absolute',
      left: pct(rect.x, width),
      top: pct(edge === 'n' ? rect.y : bottom, height),
      width: pct(rect.w, width),
      height: `${HANDLE_BAR}px`,
      transform: 'translateY(-50%)',
      cursor: 'ns-resize',
    };
  }

  return {
    position: 'absolute',
    left: pct(edge === 'w' ? rect.x : right, width),
    top: pct(rect.y, height),
    width: `${HANDLE_BAR}px`,
    height: pct(rect.h, height),
    transform: 'translateX(-50%)',
    cursor: 'ew-resize',
  };
}

/**
 * Commit a keyboard nudge (rect already set transiently on `tree`) through the
 * pure clamp path so the emitted tree stays laminar. Builds a fresh move state
 * grabbed at the tag's current position with the pointer at the nudged origin.
 */
function reduceCommitMove(
  tree: TagTree,
  id: string,
  opts: EditOptions,
): TagTree {
  const node = layout(tree).nodes.find((n) => n.tag.id === id);
  if (!node) return tree;
  const point: Point = { x: node.rect.x, y: node.rect.y };
  const down = reduce(
    initialState,
    { kind: 'down', mode: 'move', id, point },
    tree,
    opts,
  );
  const up = reduce(down.state, { kind: 'up' }, tree, opts);
  return up.tree;
}

/**
 * Commit a keyboard re-parent: build a `moving` state grabbed at the tag's
 * current origin with `armedHostId` set to the target host, then commit through
 * the reducer so the clamp/laminar rules apply (snap-back on rejection).
 */
function reduceReparent(
  tree: TagTree,
  id: string,
  targetHostId: string | null,
  opts: EditOptions,
): TagTree {
  const node = layout(tree).nodes.find((n) => n.tag.id === id);
  if (!node) return tree;
  const hostId = findParentId(tree, id);
  const state: EditState = {
    kind: 'moving',
    id,
    grabDX: 0,
    grabDY: 0,
    origin: { ...node.rect },
    hostId,
    armedHostId: targetHostId,
    lastPoint: { x: node.rect.x, y: node.rect.y },
  };
  return reduce(state, { kind: 'up' }, tree, opts).tree;
}
