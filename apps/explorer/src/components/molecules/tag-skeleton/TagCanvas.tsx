import React from 'react';
import { Tag } from './tag-atom';
import { layout } from './layout';
import type { TagTree } from './types';

export interface TagCanvasProps {
  /** The tag tree to render. Rects are honored verbatim; missing rects are
   * auto-computed by `layout()`. */
  tree: TagTree;
  /** Display width of the anchor frame. Number = pixels; string = any CSS
   * width. Image and grid scale together. Defaults to "100%". */
  size?: number | string;
  /** Alt text for the optional background screenshot. */
  alt?: string;
  className?: string;
  /** Id of the selected tag, if any. */
  selectedId?: string;
  /** Id of the tag currently being dragged, if any. */
  draggingId?: string;
  /**
   * Tab visibility. `'always'` (default) shows every straddle tab. `'hover'`
   * hides all tabs and reveals only the laminar containing chain under the
   * pointer, so the structure is read on demand without permanent chrome.
   */
  captions?: 'always' | 'hover';
}

/** A coordinate as a percentage of the given total, for the anchor frame. */
function pct(value: number, total: number): string {
  return `${total === 0 ? 0 : (value / total) * 100}%`;
}

/**
 * The pure renderer that draws a `TagTree`. It runs `layout()` to resolve every
 * tag to an absolute rect (auto for reading mode, verbatim for overlays), then
 * draws one relative anchor frame and positions each `Tag` absolutely as a
 * percentage of that frame. So changing `size` scales image and grid together.
 *
 * When `tree.src` is set the frame shows the screenshot and boxes use the
 * transparent overlay fill. Purely presentational; drag/resize is a separate
 * controlled editor on top. All styling lives in theme CSS variables.
 *
 * With `captions="hover"` the tabs are hidden until the pointer enters a box;
 * the revealed set is the laminar containing chain at the pointer (every node
 * whose rect contains it), computed with an O(n) point-in-rect test per move.
 */
export function TagCanvas({
  tree,
  size,
  alt = '',
  className,
  selectedId,
  draggingId,
  captions = 'always',
}: TagCanvasProps): React.ReactElement {
  const { width, height, nodes } = React.useMemo(() => layout(tree), [tree]);
  const isOverlay = tree.src !== undefined;
  const hoverMode = captions === 'hover';

  const frameRef = React.useRef<HTMLDivElement>(null);
  // The laminar containing chain under the pointer: every node whose rect
  // contains the point. Tracked in BOTH modes. It drives the fill highlight
  // (the whole related path lights up, e.g. entity + its action, not just the
  // box under the pointer) and, in hover mode, caption visibility.
  const [hoveredIds, setHoveredIds] = React.useState<ReadonlySet<string>>(
    () => new Set(),
  );

  // Convert a pointer position to grid coords (measured frame size vs layout
  // size), then collect the ids of every node whose rect contains the point.
  // layout() is memoized above, so a move never recomputes the layout.
  const handleMove = React.useCallback(
    (event: React.MouseEvent): void => {
      const frame = frameRef.current;
      if (!frame || width === 0 || height === 0) return;
      const box = frame.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) return;
      const gx = ((event.clientX - box.left) / box.width) * width;
      const gy = ((event.clientY - box.top) / box.height) * height;
      const next = new Set<string>();
      for (const { tag, rect } of nodes) {
        if (
          gx >= rect.x &&
          gx <= rect.x + rect.w &&
          gy >= rect.y &&
          gy <= rect.y + rect.h
        ) {
          next.add(tag.id);
        }
      }
      setHoveredIds((prev) => (sameSet(prev, next) ? prev : next));
    },
    [width, height, nodes],
  );

  const handleLeave = React.useCallback((): void => {
    setHoveredIds((prev) => (prev.size === 0 ? prev : new Set()));
  }, []);

  const frameWidth =
    size !== undefined
      ? typeof size === 'number'
        ? `${size}px`
        : size
      : isOverlay
        ? '100%'
        : `${width}px`;
  const frameStyle: React.CSSProperties = { width: frameWidth };
  if (!isOverlay && height > 0) {
    frameStyle.aspectRatio = `${width} / ${height}`;
  }

  return (
    <div
      ref={frameRef}
      className={['elb-tag-skeleton', 'elb-tag-skeleton__frame', className]
        .filter(Boolean)
        .join(' ')}
      style={frameStyle}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
    >
      {tree.src !== undefined && (
        <img
          className="elb-tag-skeleton__frame-image"
          src={tree.src}
          alt={alt}
        />
      )}
      {nodes.map(({ tag, rect }) => (
        <Tag
          key={tag.id}
          type={tag.type}
          name={tag.name}
          value={tag.value}
          label={tag.label}
          contextIndex={tag.contextIndex}
          showCaption={hoverMode ? hoveredIds.has(tag.id) : true}
          highlighted={hoveredIds.has(tag.id)}
          className={isOverlay ? 'elb-tag-skeleton__box--overlay' : undefined}
          selected={tag.id === selectedId}
          dragging={tag.id === draggingId}
          style={{
            position: 'absolute',
            left: pct(rect.x, width),
            top: pct(rect.y, height),
            width: pct(rect.w, width),
            height: pct(rect.h, height),
          }}
        />
      ))}
    </div>
  );
}

/** Shallow set equality so identical reveal sets do not trigger a re-render. */
function sameSet(a: ReadonlySet<string>, b: ReadonlySet<string>): boolean {
  if (a.size !== b.size) return false;
  for (const id of a) if (!b.has(id)) return false;
  return true;
}
