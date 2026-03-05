import React, { useEffect, useRef } from 'react';
import rough from 'roughjs';
import { Icon } from '@iconify/react';

// ============================================
// Helper Components for rough.js SVG rendering
// ============================================

interface RoughRectProps {
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  stroke: string;
}

/**
 * RoughRect - Renders a hand-drawn rectangle using rough.js SVG mode
 * Uses a rounded rectangle path for softer corners
 */
function RoughRect({
  x,
  y,
  width,
  height,
  fill,
  stroke,
}: RoughRectProps): React.ReactElement {
  const ref = useRef<SVGGElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const svg = ref.current.ownerSVGElement;
    if (!svg) return;

    // Clear previous content
    ref.current.replaceChildren();

    const rs = rough.svg(svg);
    const r = 8; // corner radius

    // Create rounded rectangle path
    const path = `M ${x + r} ${y}
      L ${x + width - r} ${y}
      Q ${x + width} ${y} ${x + width} ${y + r}
      L ${x + width} ${y + height - r}
      Q ${x + width} ${y + height} ${x + width - r} ${y + height}
      L ${x + r} ${y + height}
      Q ${x} ${y + height} ${x} ${y + height - r}
      L ${x} ${y + r}
      Q ${x} ${y} ${x + r} ${y}
      Z`;

    // Draw main rectangle
    const rectNode = rs.path(path, {
      fill,
      fillStyle: 'solid',
      stroke,
      strokeWidth: 1.5,
      roughness: 1.2,
      bowing: 1,
    });
    ref.current.appendChild(rectNode);

    return () => {
      ref.current?.replaceChildren();
    };
  }, [x, y, width, height, fill, stroke]);

  return <g ref={ref} />;
}

interface RoughCircleProps {
  cx: number;
  cy: number;
  diameter: number;
  fill: string;
  stroke: string;
}

/**
 * RoughCircle - Renders a hand-drawn circle using rough.js SVG mode
 */
function RoughCircle({
  cx,
  cy,
  diameter,
  fill,
  stroke,
}: RoughCircleProps): React.ReactElement {
  const ref = useRef<SVGGElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const svg = ref.current.ownerSVGElement;
    if (!svg) return;

    ref.current.replaceChildren();

    const rs = rough.svg(svg);
    const circleNode = rs.circle(cx, cy, diameter, {
      fill,
      fillStyle: 'solid',
      stroke,
      strokeWidth: 1.5,
      roughness: 0.8,
    });
    ref.current.appendChild(circleNode);

    return () => {
      ref.current?.replaceChildren();
    };
  }, [cx, cy, diameter, fill, stroke]);

  return <g ref={ref} />;
}

interface MarkerProps {
  x: number;
  y: number;
  text: string;
}

/**
 * Marker - Red circle with number/text inside
 */
function Marker({ x, y, text }: MarkerProps): React.ReactElement {
  return (
    <g>
      <RoughCircle
        cx={x}
        cy={y}
        diameter={MARKER_SIZE}
        fill="var(--flow-marker-fill, #dc2626)"
        stroke="var(--flow-marker-stroke, #991b1b)"
      />
      <text
        x={x}
        y={y}
        textAnchor="middle"
        dominantBaseline="central"
        fill="var(--flow-marker-text, #ffffff)"
        fontSize={10}
        fontWeight={600}
        fontFamily="system-ui, -apple-system, sans-serif"
      >
        {text}
      </text>
    </g>
  );
}

interface RoughArrowProps {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  stroke: string;
  arrowSize?: number;
  centerY?: number;
}

/**
 * RoughArrow - Renders a hand-drawn curved arrow using rough.js SVG mode
 * Uses quadratic bezier curves for an organic feel.
 * Includes arrowhead that follows the curve's final angle.
 */
function RoughArrow({
  fromX,
  fromY,
  toX,
  toY,
  stroke,
  arrowSize = 8,
  centerY,
}: RoughArrowProps): React.ReactElement {
  const ref = useRef<SVGGElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const svg = ref.current.ownerSVGElement;
    if (!svg) return;

    // Clear previous content
    ref.current.replaceChildren();

    const rs = rough.svg(svg);
    const strokeWidth = 1.5;
    const color = stroke;

    const dx = toX - fromX;
    const dy = toY - fromY;
    const length = Math.sqrt(dx * dx + dy * dy);

    // Calculate control point for quadratic bezier curve
    // For horizontal lines: slight upward curve
    // For diagonal lines: curve that exits horizontally then bends to target
    const midX = (fromX + toX) / 2;
    const midY = (fromY + toY) / 2;

    let controlX: number;
    let controlY: number;

    if (Math.abs(dy) < 2) {
      // Nearly horizontal: subtle upward curve
      controlX = midX;
      controlY = midY - Math.min(length * 0.08, 12);
    } else if (centerY !== undefined) {
      // Curve towards whichever endpoint is farther from center
      // This creates natural spreading for fan-in and fan-out
      const fromDistFromCenter = Math.abs(fromY - centerY);
      const toDistFromCenter = Math.abs(toY - centerY);

      controlX = fromX + dx * 0.5;

      if (fromDistFromCenter >= toDistFromCenter) {
        // Source is farther from center → curve towards source's side
        controlY =
          fromY < centerY
            ? midY - Math.abs(dy) * 0.3 // Source above center → curve UP
            : midY + Math.abs(dy) * 0.3; // Source below center → curve DOWN
      } else {
        // Target is farther from center → curve towards target's side
        controlY =
          toY < centerY
            ? midY - Math.abs(dy) * 0.3 // Target above center → curve UP
            : midY + Math.abs(dy) * 0.3; // Target below center → curve DOWN
      }
    } else {
      // Fallback when centerY not provided: simple direction-based curve
      controlX = fromX + dx * 0.5;
      controlY =
        dy > 0 ? fromY - Math.abs(dy) * 0.3 : fromY + Math.abs(dy) * 0.3;
    }

    // Calculate the angle at the end of the curve (tangent at t=1)
    // For quadratic bezier: tangent = 2(1-t)(P1-P0) + 2t(P2-P1) at t=1 = 2(P2-P1)
    const tangentX = toX - controlX;
    const tangentY = toY - controlY;
    const endAngle = Math.atan2(tangentY, tangentX);

    // Calculate where the curve should stop (before the arrowhead)
    const curveEndX = toX - Math.cos(endAngle) * arrowSize;
    const curveEndY = toY - Math.sin(endAngle) * arrowSize;

    // Draw curved line using SVG path with quadratic bezier
    const curvePath = `M ${fromX} ${fromY} Q ${controlX} ${controlY} ${curveEndX} ${curveEndY}`;
    const curveNode = rs.path(curvePath, {
      stroke: color,
      strokeWidth,
      roughness: 0.8,
      fill: 'none',
    });
    ref.current.appendChild(curveNode);

    // Draw arrowhead (two lines at angles from curve's end tangent)
    const arrowAngle = Math.PI / 6; // 30 degrees
    const arrowLength = 8;

    // Arrow head line 1 (upper)
    const arrow1EndX =
      curveEndX - Math.cos(endAngle - arrowAngle) * arrowLength;
    const arrow1EndY =
      curveEndY - Math.sin(endAngle - arrowAngle) * arrowLength;
    const arrowHead1 = rs.line(curveEndX, curveEndY, arrow1EndX, arrow1EndY, {
      stroke: color,
      strokeWidth,
      roughness: 0.5,
    });
    ref.current.appendChild(arrowHead1);

    // Arrow head line 2 (lower)
    const arrow2EndX =
      curveEndX - Math.cos(endAngle + arrowAngle) * arrowLength;
    const arrow2EndY =
      curveEndY - Math.sin(endAngle + arrowAngle) * arrowLength;
    const arrowHead2 = rs.line(curveEndX, curveEndY, arrow2EndX, arrow2EndY, {
      stroke: color,
      strokeWidth,
      roughness: 0.5,
    });
    ref.current.appendChild(arrowHead2);

    return () => {
      ref.current?.replaceChildren();
    };
  }, [fromX, fromY, toX, toY, stroke, arrowSize, centerY]);

  return <g ref={ref} />;
}

export type FlowMarkerPosition =
  // Stages (default = top-right, left/right variants)
  | 'source'
  | 'source-left'
  | 'source-right'
  | 'collector'
  | 'collector-left'
  | 'collector-right'
  | 'destination'
  | 'destination-left'
  | 'destination-right'
  // Named stages: source-{name}, destination-{name}
  | `source-${string}`
  | `source-${string}-left`
  | `source-${string}-right`
  | `destination-${string}`
  | `destination-${string}-left`
  | `destination-${string}-right`
  // Transformer positions: pre-{name}, post-{name}
  | `pre-${string}`
  | `pre-${string}-left`
  | `pre-${string}-right`
  | `post-${string}`
  | `post-${string}-left`
  | `post-${string}-right`
  // Context stages
  | 'stage-before'
  | 'stage-before-right'
  | 'stage-after'
  | 'stage-after-left'
  // Arrows (single position each)
  | 'incoming'
  | 'outgoing'
  | 'source-collector'
  | 'collector-destination'
  // Named source arrows: source-{name}-pre, source-{name}-collector
  | `source-${string}-pre`
  | `source-${string}-collector`
  // Pre-transformer chain arrows: pre-{name}-next, pre-collector
  | `pre-${string}-next`
  | 'pre-collector'
  // Post-transformer chain arrows: collector-post, post-{name}-next
  | 'collector-post'
  | `post-${string}-next`
  // Destination arrows: post-destination-{name}
  | `post-destination-${string}`
  // Context stage arrows
  | 'before-source'
  | 'destination-after';

export interface FlowMarker {
  position: FlowMarkerPosition;
  /** ID displayed inside the marker dot. Default: array index + 1 */
  id?: string;
  /** Legend text. If provided, marker appears in legend below diagram */
  text?: string;
}

export interface FlowStageConfig {
  /** Iconify icon name to display before the label (e.g., 'simple-icons:google-analytics') */
  icon?: string;
  label?: string;
  text?: React.ReactNode; // Supports rich content (text, links, JSX)
  description?: React.ReactNode; // Supports rich content (text, links, JSX)
  highlight?: boolean;
  /** Makes box clickable. undefined = default URL, false = not clickable, string = custom URL */
  link?: false | string;
}

export interface FlowSourceConfig extends FlowStageConfig {
  /** Name of pre-transformer to connect to. Omit to connect directly to collector. */
  next?: string;
}

export interface FlowTransformerConfig extends FlowStageConfig {
  /** Name of next transformer in chain. Omit to connect to collector (pre) or destination (post). */
  next?: string;
}

export interface FlowDestinationConfig extends FlowStageConfig {
  /** Name of post-transformer to receive from. Omit to receive directly from collector. */
  before?: string;
  /** Optional: stage after this destination (e.g., external platform). Overrides shared stageAfter. */
  after?: FlowStageConfig;
}

export interface FlowLayoutConfig {
  labelSize: number;
  labelWeight: string;
  textSize: number;
  textWeight: string;
  boxHeight: number;
  descriptionSize: number;
}

// Default layout configuration
export const defaultLayout: FlowLayoutConfig = {
  labelSize: 13,
  labelWeight: '600',
  textSize: 12,
  textWeight: 'normal',
  boxHeight: 50,
  descriptionSize: 13,
};

export interface FlowMapProps {
  /** Optional: stage before source (e.g., "Browser") */
  stageBefore?: FlowStageConfig;
  /** Sources with named keys. Each source can specify `next` to connect to a pre-transformer. */
  sources?: Record<string, FlowSourceConfig>;
  /** Pre-transformers between sources and collector. Chain via `next` property. */
  preTransformers?: Record<string, FlowTransformerConfig>;
  /** Optional: customize collector stage */
  collector?: FlowStageConfig;
  /** Post-transformers between collector and destinations. */
  postTransformers?: Record<string, FlowTransformerConfig>;
  /** Destinations with named keys. Each destination can specify `before` to receive from a post-transformer. */
  destinations?: Record<string, FlowDestinationConfig>;
  /** Optional: stage after destination (e.g., "gtag") */
  stageAfter?: FlowStageConfig;
  /** Optional: title above diagram */
  title?: string;
  /** Optional: layout configuration */
  layout?: FlowLayoutConfig;
  /** Optional: height of stage boxes (default: 50) */
  boxHeight?: number;
  /** Optional: height of description area below boxes (default: 30) */
  descriptionHeight?: number;
  /** Optional: additional CSS class */
  className?: string;
  /** Optional: array of markers to display */
  markers?: FlowMarker[];
  /** Optional: show two arrows per connection (forward → and return ←) with parallel offset */
  withReturn?: boolean;
}

// Layout constants
const STAGE_WIDTH = 120;
const STAGE_HEIGHT = 50;
const STAGE_GAP = 50; // Horizontal gap between stages
const VERTICAL_GAP = 12; // Vertical gap between stacked sources/destinations
const PADDING_X = 8;
const PADDING_Y = 8;
const EDGE_ARROW_LENGTH = 25; // Space for incoming/outgoing arrows
const TITLE_HEIGHT = 30;
const ARROW_SIZE = 8;
const ARROW_OFFSET = 6; // Vertical offset for parallel return arrows

// Resolved transformer with its name
interface ResolvedTransformer {
  name: string;
  config: FlowTransformerConfig;
}

/**
 * Resolves a transformer chain by following `next` references.
 * Returns an ordered array of transformers from the starting key to the end.
 * Throws if a reference is invalid or circular.
 */
function resolveTransformerChain(
  transformers: Record<string, FlowTransformerConfig> | undefined,
  startKey: string | undefined,
): ResolvedTransformer[] {
  if (!transformers || !startKey) return [];

  const result: ResolvedTransformer[] = [];
  const visited = new Set<string>();
  let currentKey: string | undefined = startKey;

  while (currentKey) {
    if (visited.has(currentKey)) {
      throw new Error(
        `FlowMap: Circular reference detected in transformer chain at "${currentKey}"`,
      );
    }

    const config: FlowTransformerConfig | undefined = transformers[currentKey];
    if (!config) {
      throw new Error(
        `FlowMap: Invalid transformer reference "${currentKey}". Available transformers: ${Object.keys(transformers).join(', ') || 'none'}`,
      );
    }

    visited.add(currentKey);
    result.push({ name: currentKey, config });
    currentKey = config.next;
  }

  return result;
}

/**
 * Collects all unique transformers that are reachable from sources (pre) or destinations (post).
 * Returns them in chain order based on `next` references.
 * Finds the chain head (transformer not referenced by any other's `next`) and walks from there.
 */
function collectReachableTransformers(
  transformers: Record<string, FlowTransformerConfig> | undefined,
  entryPoints: (string | undefined)[],
): ResolvedTransformer[] {
  if (!transformers) return [];

  // Find all unique transformer names referenced by walking each entry point's chain
  const referencedNames = new Set<string>();
  for (const entry of entryPoints) {
    if (!entry || !transformers[entry]) continue;
    const chain = resolveTransformerChain(transformers, entry);
    chain.forEach((p) => referencedNames.add(p.name));
  }

  if (referencedNames.size === 0) return [];

  // Find chain head: transformer in our set that's not anyone's `next`
  const nextTargets = new Set<string>();
  for (const name of referencedNames) {
    const next = transformers[name]?.next;
    if (next && referencedNames.has(next)) {
      nextTargets.add(next);
    }
  }

  // Chain head = in referencedNames but not in nextTargets
  let chainHead: string | undefined;
  for (const name of referencedNames) {
    if (!nextTargets.has(name)) {
      chainHead = name;
      break;
    }
  }

  // Walk from chain head
  if (!chainHead) chainHead = [...referencedNames][0];
  return resolveTransformerChain(transformers, chainHead);
}

/**
 * Gets the index of a transformer in the transformer list.
 * Returns transformerList.length if not found (= connects directly to collector).
 */
function getTransformerIndex(
  transformerName: string | undefined,
  transformerList: ResolvedTransformer[],
): number {
  if (!transformerName) return transformerList.length;
  const idx = transformerList.findIndex((p) => p.name === transformerName);
  return idx >= 0 ? idx : transformerList.length;
}

// Dynamic width calculation function
function calculateTotalWidth(
  stageCount: number,
  hasStageBefore: boolean,
  hasStageAfter: boolean,
): number {
  const leftEdge = hasStageBefore ? 0 : EDGE_ARROW_LENGTH;
  const rightEdge = hasStageAfter ? 0 : EDGE_ARROW_LENGTH;
  return (
    leftEdge +
    STAGE_WIDTH * stageCount +
    STAGE_GAP * (stageCount - 1) +
    rightEdge
  );
}

interface StagePosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

const MARKER_SIZE = 16;
const MARKER_OFFSET = 4; // Offset from box edge

function getMarkerPosition(
  position: FlowMarkerPosition,
  stages: { [key: string]: StagePosition },
  centerY: number,
  totalWidth: number,
): { x: number; y: number } | null {
  const sourcePos = stages.source;
  const collectorPos = stages.collector;
  const destPos = stages.destination;
  const beforePos = stages.before;
  const afterPos = stages.after;

  // Helper to get box marker position (top corners)
  const getBoxMarker = (
    pos: StagePosition | undefined,
    variant?: string,
  ): { x: number; y: number } | null => {
    if (!pos) return null;
    if (variant === '-left') {
      return { x: pos.x + MARKER_OFFSET, y: pos.y - MARKER_OFFSET };
    }
    // Default and -right: top-right corner
    return {
      x: pos.x + pos.width - MARKER_OFFSET,
      y: pos.y - MARKER_OFFSET,
    };
  };

  // Helper to get arrow marker position (between stages)
  const getArrowMarker = (
    fromPos: StagePosition | undefined,
  ): { x: number; y: number } | null => {
    if (!fromPos) return null;
    const fromCenterY = fromPos.y + fromPos.height / 2;
    return {
      x: fromPos.x + fromPos.width + STAGE_GAP / 2 - 6,
      y: fromCenterY + MARKER_SIZE / 2 + 4,
    };
  };

  switch (position) {
    // Stage-before (only right side, no left)
    case 'stage-before':
    case 'stage-before-right':
      return getBoxMarker(beforePos);

    // Source stage (above box, top corners) - first source
    case 'source':
    case 'source-right':
      return getBoxMarker(sourcePos);
    case 'source-left':
      return getBoxMarker(sourcePos, '-left');

    // Collector stage (above box, top corners)
    case 'collector':
    case 'collector-right':
      return getBoxMarker(collectorPos);
    case 'collector-left':
      return getBoxMarker(collectorPos, '-left');

    // Destination stage (above box, top corners) - first destination
    case 'destination':
    case 'destination-right':
      return getBoxMarker(destPos);
    case 'destination-left':
      return getBoxMarker(destPos, '-left');

    // Stage-after (only left side, no right)
    case 'stage-after':
    case 'stage-after-left':
      return getBoxMarker(afterPos, '-left');

    // Edge arrows (in/out)
    case 'incoming':
      return { x: EDGE_ARROW_LENGTH / 2, y: centerY + MARKER_SIZE / 2 + 8 };
    case 'outgoing':
      return {
        x: totalWidth - EDGE_ARROW_LENGTH / 2,
        y: centerY + MARKER_SIZE / 2 + 8,
      };

    // Arrow between before and source
    case 'before-source':
      return getArrowMarker(beforePos);

    // Between-stage arrows (for simple flows without transformers)
    case 'source-collector':
      return getArrowMarker(sourcePos);
    case 'collector-destination':
      return getArrowMarker(collectorPos);

    // Arrow between destination and after
    case 'destination-after':
      return getArrowMarker(destPos);

    // Pre-transformer to collector arrow
    case 'pre-collector':
      // Find the last pre-transformer position
      const preKeys = Object.keys(stages).filter((k) => k.startsWith('pre-'));
      if (preKeys.length === 0) return null;
      const lastPrePos = stages[preKeys[preKeys.length - 1]];
      return getArrowMarker(lastPrePos);

    // Collector to post-transformer arrow
    case 'collector-post':
      return getArrowMarker(collectorPos);

    default: {
      // Handle named source markers: source-{name}, source-{name}-left, source-{name}-right
      const sourceNameMatch = position.match(/^source-([^-]+)(-left|-right)?$/);
      if (sourceNameMatch) {
        const name = sourceNameMatch[1];
        const variant = sourceNameMatch[2];
        const pos = stages[`source-${name}`];
        return getBoxMarker(pos, variant);
      }

      // Handle named destination markers: destination-{name}, destination-{name}-left, destination-{name}-right
      const destNameMatch = position.match(
        /^destination-([^-]+)(-left|-right)?$/,
      );
      if (destNameMatch) {
        const name = destNameMatch[1];
        const variant = destNameMatch[2];
        const pos = stages[`destination-${name}`];
        return getBoxMarker(pos, variant);
      }

      // Handle pre-transformer markers: pre-{name}, pre-{name}-left, pre-{name}-right
      const preMatch = position.match(/^pre-([^-]+)(-left|-right)?$/);
      if (preMatch) {
        const name = preMatch[1];
        const variant = preMatch[2];
        // Skip if this looks like a -next pattern
        if (name === 'collector') return null;
        const pos = stages[`pre-${name}`];
        return getBoxMarker(pos, variant);
      }

      // Handle post-transformer markers: post-{name}, post-{name}-left, post-{name}-right
      const postMatch = position.match(/^post-([^-]+)(-left|-right)?$/);
      if (postMatch) {
        const name = postMatch[1];
        const variant = postMatch[2];
        const pos = stages[`post-${name}`];
        return getBoxMarker(pos, variant);
      }

      // Handle source to pre-transformer arrow: source-{name}-pre
      const sourcePreMatch = position.match(/^source-([^-]+)-pre$/);
      if (sourcePreMatch) {
        const name = sourcePreMatch[1];
        const pos = stages[`source-${name}`];
        return getArrowMarker(pos);
      }

      // Handle source to collector arrow: source-{name}-collector
      const sourceCollectorMatch = position.match(/^source-([^-]+)-collector$/);
      if (sourceCollectorMatch) {
        const name = sourceCollectorMatch[1];
        const pos = stages[`source-${name}`];
        return getArrowMarker(pos);
      }

      // Handle pre-transformer chain arrow: pre-{name}-next
      const preNextMatch = position.match(/^pre-([^-]+)-next$/);
      if (preNextMatch) {
        const name = preNextMatch[1];
        const pos = stages[`pre-${name}`];
        return getArrowMarker(pos);
      }

      // Handle post-transformer chain arrow: post-{name}-next
      const postNextMatch = position.match(/^post-([^-]+)-next$/);
      if (postNextMatch) {
        const name = postNextMatch[1];
        const pos = stages[`post-${name}`];
        return getArrowMarker(pos);
      }

      // Handle post to destination arrow: post-destination-{name}
      const postDestMatch = position.match(/^post-destination-([^-]+)$/);
      if (postDestMatch) {
        const name = postDestMatch[1];
        // Find the last post-transformer position before this destination
        const postKeys = Object.keys(stages).filter((k) =>
          k.startsWith('post-'),
        );
        if (postKeys.length === 0) return getArrowMarker(collectorPos);
        const lastPostPos = stages[postKeys[postKeys.length - 1]];
        return getArrowMarker(lastPostPos);
      }

      return null;
    }
  }
}

export function FlowMap({
  stageBefore,
  sources,
  preTransformers,
  collector,
  postTransformers,
  destinations,
  stageAfter,
  title,
  layout = defaultLayout,
  boxHeight: boxHeightProp,
  descriptionHeight: descriptionHeightProp,
  markers,
  className,
  withReturn,
}: FlowMapProps): React.ReactElement {
  // Convert Record-based sources/destinations to arrays with names
  const sourceEntries = Object.entries(sources ?? { default: {} });
  const destinationEntries = Object.entries(destinations ?? { default: {} });

  // Collect pre-transformers reachable from sources
  const sourceNextValues = sourceEntries.map(([, config]) => config.next);
  const preTransformerList = collectReachableTransformers(
    preTransformers,
    sourceNextValues,
  );

  // Collect post-transformers reachable from destinations (via 'before')
  const destBeforeValues = destinationEntries.map(
    ([, config]) => config.before,
  );
  const postTransformerList = collectReachableTransformers(
    postTransformers,
    destBeforeValues,
  );

  // Sort sources by target transformer index to avoid edge crossings
  // Sources connecting to earlier transformers go on top
  const sortedSourceEntries = [...sourceEntries].sort(([, a], [, b]) => {
    const aIdx = getTransformerIndex(a.next, preTransformerList);
    const bIdx = getTransformerIndex(b.next, preTransformerList);
    return aIdx - bIdx;
  });

  // Sort destinations by source transformer index - ASCENDING (earlier transformer = top)
  // This mirrors source sorting behavior for symmetry
  const sortedDestinationEntries = [...destinationEntries].sort(
    ([, a], [, b]) => {
      const aIdx = getTransformerIndex(a.before, postTransformerList);
      const bIdx = getTransformerIndex(b.before, postTransformerList);
      return aIdx - bIdx; // ASCENDING: earlier transformer at top (mirrors sources)
    },
  );

  const containerRef = useRef<HTMLDivElement>(null);

  // Check if any stage has a description or link
  const hasDescription =
    stageBefore?.description ||
    sourceEntries.some(([, s]) => s.description) ||
    preTransformerList.some((p) => p.config.description) ||
    collector?.description ||
    postTransformerList.some((p) => p.config.description) ||
    destinationEntries.some(([, d]) => d.description) ||
    stageAfter?.description ||
    destinationEntries.some(([, d]) => d.after?.description);
  const hasLink =
    stageBefore?.link !== false ||
    sourceEntries.some(([, s]) => s.link !== false) ||
    preTransformerList.some((p) => p.config.link !== false) ||
    collector?.link !== false ||
    postTransformerList.some((p) => p.config.link !== false) ||
    destinationEntries.some(([, d]) => d.link !== false) ||
    stageAfter?.link !== false ||
    destinationEntries.some(([, d]) => d.after?.link !== false);

  // Check if markers need extra padding (top for stage markers, bottom for arrow markers)
  const stageMarkerPositions = [
    'stage-before',
    'stage-before-right',
    'source',
    'source-left',
    'source-right',
    'collector',
    'collector-left',
    'collector-right',
    'destination',
    'destination-left',
    'destination-right',
    'stage-after',
    'stage-after-left',
  ];
  // Helper to check if a position is a stage marker (including named stages and transformers)
  const isStageMarker = (pos: string): boolean => {
    if (stageMarkerPositions.includes(pos)) return true;
    // Check patterns: source-{name}, destination-{name}, pre-{name}, post-{name}
    return /^(source|destination|pre|post)-[^-]+(-left|-right)?$/.test(pos);
  };
  const hasTopMarkers =
    markers?.some((m) => isStageMarker(m.position)) ?? false;
  const markerTopPadding = hasTopMarkers ? MARKER_SIZE / 2 + MARKER_OFFSET : 0;

  // Filter markers that have legend text
  const legendItems = markers?.filter((m) => m.text) ?? [];
  // Estimate total text length to determine how many lines we need
  const totalTextLength = legendItems.reduce(
    (sum, item) => sum + (item.text?.length ?? 0),
    0,
  );
  // Rough estimate: ~5.5 chars per pixel at 11px font, available width ~450px = ~82 chars per line
  const LEGEND_LINE_HEIGHT = 18;
  const estimatedLines = Math.max(1, Math.ceil(totalTextLength / 70));
  const legendHeight =
    legendItems.length > 0 ? LEGEND_LINE_HEIGHT * estimatedLines + 8 : 0;

  // Use prop values if provided, otherwise use layout defaults
  const boxHeight = boxHeightProp ?? layout.boxHeight;
  const descriptionHeight = descriptionHeightProp ?? 30;
  const belowBoxHeight = hasDescription || hasLink ? descriptionHeight + 10 : 0; // Space for description/link content

  // Calculate max rows for multi-source/destination layout
  const maxRows = Math.max(sourceEntries.length, destinationEntries.length, 1);
  const stackedHeight = boxHeight * maxRows + VERTICAL_GAP * (maxRows - 1);

  // Check if any destination has an after stage or if shared stageAfter exists
  const hasAnyAfterStage =
    stageAfter || destinationEntries.some(([, d]) => d.after);

  // Calculate stage count and total width dynamically
  // Stages: stageBefore? + sources(1) + preTransformers + collector(1) + postTransformers + destinations(1) + afterStages?
  const stageCount =
    (stageBefore ? 1 : 0) +
    1 + // sources column
    preTransformerList.length +
    1 + // collector
    postTransformerList.length +
    1 + // destinations column
    (hasAnyAfterStage ? 1 : 0);
  const totalWidth = calculateTotalWidth(
    stageCount,
    !!stageBefore,
    !!hasAnyAfterStage,
  );

  const baseHeight =
    PADDING_Y * 2 +
    stackedHeight +
    belowBoxHeight +
    markerTopPadding +
    legendHeight;
  const totalHeight = title ? baseHeight + TITLE_HEIGHT : baseHeight;

  // Calculate positions (declarative, no useEffect)
  const baseY = (title ? TITLE_HEIGHT : 0) + PADDING_Y + markerTopPadding;

  // Calculate the vertical center of the stacked area (for collector positioning)
  const stackedCenterY = baseY + stackedHeight / 2;

  // Helper to calculate Y positions for stacked items centered around stackedCenterY
  const getStackedY = (index: number, count: number): number => {
    const totalStackHeight = boxHeight * count + VERTICAL_GAP * (count - 1);
    const startY = stackedCenterY - totalStackHeight / 2;
    return startY + index * (boxHeight + VERTICAL_GAP);
  };

  // Build stage positions dynamically based on which stages are active
  // Start at 0 if stageBefore exists (no left edge arrow), otherwise leave space for arrow
  let currentX = stageBefore ? 0 : EDGE_ARROW_LENGTH;
  const stages: { [key: string]: StagePosition } = {};

  // Arrays to hold named source/destination positions
  const sourcePositions: Array<{ name: string; pos: StagePosition }> = [];
  const destinationPositions: Array<{ name: string; pos: StagePosition }> = [];

  if (stageBefore) {
    stages.before = {
      x: currentX,
      y: stackedCenterY - boxHeight / 2, // Center vertically
      width: STAGE_WIDTH,
      height: boxHeight,
    };
    currentX += STAGE_WIDTH + STAGE_GAP;
  }

  // Position ALL sources in the source column (stacked vertically)
  const sourceX = currentX;
  sortedSourceEntries.forEach(([name], index) => {
    const pos: StagePosition = {
      x: sourceX,
      y: getStackedY(index, sortedSourceEntries.length),
      width: STAGE_WIDTH,
      height: boxHeight,
    };
    sourcePositions.push({ name, pos });
    stages[`source-${name}`] = pos;
  });
  // Keep 'source' alias pointing to first source for backward compatibility
  if (sourcePositions.length > 0) {
    stages.source = sourcePositions[0].pos;
  }
  currentX += STAGE_WIDTH + STAGE_GAP;

  // Pre-transformer positions
  // Strategy: position at source Y if only ONE source connects, otherwise center
  // This keeps transformers aligned with their sources when there's no branching
  const preTransformerPositions: Array<{ name: string; pos: StagePosition }> =
    [];

  // Build map: transformer name → list of sources that connect to it (directly or via chain)
  const transformerIncomingSources = new Map<string, string[]>();
  sortedSourceEntries.forEach(([sourceName, config]) => {
    const targetTransformer = config.next;
    if (targetTransformer) {
      const existing = transformerIncomingSources.get(targetTransformer) ?? [];
      existing.push(sourceName);
      transformerIncomingSources.set(targetTransformer, existing);
    }
  });
  // Also track chain connections (transformer A → transformer B means B receives from A's sources too)
  preTransformerList.forEach(({ name, config }) => {
    if (config.next) {
      // This transformer's output goes to config.next
      // So config.next receives from all sources that this transformer receives from
      const mySources = transformerIncomingSources.get(name) ?? [];
      const nextSources = transformerIncomingSources.get(config.next) ?? [];
      // Mark that the next transformer receives from chain (we'll use this for positioning)
      transformerIncomingSources.set(config.next, [
        ...new Set([...nextSources, `chain:${name}`]),
      ]);
    }
  });

  preTransformerList.forEach(({ name }) => {
    const incomingSources = transformerIncomingSources.get(name) ?? [];
    // Filter to only direct sources (not chain connections)
    const directSources = incomingSources.filter(
      (s) => !s.startsWith('chain:'),
    );
    const hasChainInput = incomingSources.some((s) => s.startsWith('chain:'));

    let y: number;
    if (directSources.length === 1 && !hasChainInput) {
      // Only ONE direct source, no chain input → align with that source
      const sourcePos = stages[`source-${directSources[0]}`];
      y = sourcePos ? sourcePos.y : stackedCenterY - boxHeight / 2;
    } else {
      // Multiple sources or has chain input → center
      y = stackedCenterY - boxHeight / 2;
    }

    const pos: StagePosition = {
      x: currentX,
      y,
      width: STAGE_WIDTH,
      height: boxHeight,
    };
    preTransformerPositions.push({ name, pos });
    stages[`pre-${name}`] = pos;
    currentX += STAGE_WIDTH + STAGE_GAP;
  });

  // Collector position (single, centered)
  stages.collector = {
    x: currentX,
    y: stackedCenterY - boxHeight / 2,
    width: STAGE_WIDTH,
    height: boxHeight,
  };
  currentX += STAGE_WIDTH + STAGE_GAP;

  // Post-transformer positions
  // Strategy: position at destination Y if only ONE destination connects, otherwise center
  // This mirrors pre-transformer behavior for symmetry
  const postTransformerPositions: Array<{ name: string; pos: StagePosition }> =
    [];

  // Build map: transformer name → list of destinations that receive from it (directly or via chain)
  const transformerOutgoingDests = new Map<string, string[]>();
  sortedDestinationEntries.forEach(([destName, config]) => {
    const sourceTransformer = config.before;
    if (sourceTransformer) {
      const existing = transformerOutgoingDests.get(sourceTransformer) ?? [];
      existing.push(destName);
      transformerOutgoingDests.set(sourceTransformer, existing);
    }
  });
  // Also track chain connections (transformer A → transformer B means A sends to all of B's destinations)
  // Walk backwards through chain to propagate destination info
  for (let i = postTransformerList.length - 1; i >= 0; i--) {
    const { name, config } = postTransformerList[i];
    if (config.next) {
      // This transformer sends to config.next, so it indirectly sends to config.next's destinations
      const nextDests = transformerOutgoingDests.get(config.next) ?? [];
      const myDests = transformerOutgoingDests.get(name) ?? [];
      // Mark chain connection
      transformerOutgoingDests.set(name, [
        ...new Set([...myDests, `chain:${config.next}`]),
      ]);
    }
  }

  // First position destinations (we need their positions for smart post-transformer positioning)
  const destinationX =
    currentX + postTransformerList.length * (STAGE_WIDTH + STAGE_GAP);
  sortedDestinationEntries.forEach(([name], index) => {
    const pos: StagePosition = {
      x: destinationX,
      y: getStackedY(index, sortedDestinationEntries.length),
      width: STAGE_WIDTH,
      height: boxHeight,
    };
    destinationPositions.push({ name, pos });
    stages[`destination-${name}`] = pos;
  });
  // Keep 'destination' alias pointing to first destination for backward compatibility
  if (destinationPositions.length > 0) {
    stages.destination = destinationPositions[0].pos;
  }

  // Now position post-transformers with smart Y-positioning (can now reference destination positions)
  postTransformerList.forEach(({ name }) => {
    const outgoingDests = transformerOutgoingDests.get(name) ?? [];
    // Filter to only direct destinations (not chain connections)
    const directDests = outgoingDests.filter((d) => !d.startsWith('chain:'));
    const hasChainOutput = outgoingDests.some((d) => d.startsWith('chain:'));

    let y: number;
    if (directDests.length === 1 && !hasChainOutput) {
      // Only ONE direct destination, no chain output → align with that destination
      const destPos = stages[`destination-${directDests[0]}`];
      y = destPos ? destPos.y : stackedCenterY - boxHeight / 2;
    } else if (directDests.length > 1 && !hasChainOutput) {
      // Multiple direct destinations → center between them (average of their Y positions)
      const destYPositions = directDests
        .map((d) => stages[`destination-${d}`]?.y)
        .filter((pos): pos is number => pos !== undefined);
      if (destYPositions.length > 0) {
        const avgY =
          destYPositions.reduce((sum, pos) => sum + pos, 0) /
          destYPositions.length;
        y = avgY;
      } else {
        y = stackedCenterY - boxHeight / 2;
      }
    } else {
      // Has chain output or no direct destinations → center
      y = stackedCenterY - boxHeight / 2;
    }

    const pos: StagePosition = {
      x: currentX,
      y,
      width: STAGE_WIDTH,
      height: boxHeight,
    };
    postTransformerPositions.push({ name, pos });
    stages[`post-${name}`] = pos;
    currentX += STAGE_WIDTH + STAGE_GAP;
  });

  // Position after stages (per-destination or shared)
  // Each destination with `after` or falling back to shared `stageAfter` gets its own box
  const afterPositions: Array<{
    name: string;
    pos: StagePosition;
    config: FlowStageConfig;
  }> = [];

  if (hasAnyAfterStage) {
    const afterX = currentX + STAGE_WIDTH + STAGE_GAP;

    sortedDestinationEntries.forEach(([destName, destConfig], index) => {
      // Use destination's after config, or fall back to shared stageAfter
      const afterConfig = destConfig.after ?? stageAfter;
      if (afterConfig) {
        const pos: StagePosition = {
          x: afterX,
          y: getStackedY(index, sortedDestinationEntries.length), // Same Y as destination
          width: STAGE_WIDTH,
          height: boxHeight,
        };
        afterPositions.push({ name: destName, pos, config: afterConfig });
        stages[`after-${destName}`] = pos;
      }
    });

    // Keep 'after' alias pointing to first after position for backward compatibility
    if (afterPositions.length > 0) {
      stages.after = afterPositions[0].pos;
    }
  }

  // Calculate center Y for arrows (collector's center)
  const centerY = stackedCenterY;

  // Stage configurations with colors and default links
  const stageConfigs = [
    ...(stageBefore
      ? [
          {
            key: 'before',
            config: stageBefore,
            fillVar: '--flow-before-fill',
            strokeVar: '--flow-before-stroke',
            defaultLabel: 'Before',
            defaultLink: undefined as string | undefined,
          },
        ]
      : []),
    // Sources (named, sorted by target transformer)
    ...sortedSourceEntries.map(([name, sourceConfig]) => ({
      key: `source-${name}`,
      config: sourceConfig,
      fillVar: '--flow-source-fill',
      strokeVar: '--flow-source-stroke',
      defaultLabel: 'Source',
      defaultLink: '/docs/sources' as string | undefined,
    })),
    // Pre-transformers
    ...preTransformerList.map(({ name, config }) => ({
      key: `pre-${name}`,
      config,
      fillVar: '--flow-transformer-fill',
      strokeVar: '--flow-transformer-stroke',
      defaultLabel: name.charAt(0).toUpperCase() + name.slice(1),
      defaultLink: '/docs/transformers' as string | undefined,
    })),
    {
      key: 'collector',
      config: collector,
      fillVar: '--flow-collector-fill',
      strokeVar: '--flow-collector-stroke',
      defaultLabel: 'Collector',
      defaultLink: '/docs/collectors' as string | undefined,
    },
    // Post-transformers
    ...postTransformerList.map(({ name, config }) => ({
      key: `post-${name}`,
      config,
      fillVar: '--flow-transformer-fill',
      strokeVar: '--flow-transformer-stroke',
      defaultLabel: name.charAt(0).toUpperCase() + name.slice(1),
      defaultLink: '/docs/transformers' as string | undefined,
    })),
    // Destinations (named, sorted by source transformer)
    ...sortedDestinationEntries.map(([name, destConfig]) => ({
      key: `destination-${name}`,
      config: destConfig,
      fillVar: '--flow-destination-fill',
      strokeVar: '--flow-destination-stroke',
      defaultLabel: 'Destination',
      defaultLink: '/docs/destinations' as string | undefined,
    })),
    // After stages (per-destination)
    ...afterPositions.map(({ name: destName, config: afterConfig }) => ({
      key: `after-${destName}`,
      config: afterConfig,
      fillVar: '--flow-after-fill',
      strokeVar: '--flow-after-stroke',
      defaultLabel: 'External',
      defaultLink: undefined as string | undefined,
    })),
  ];

  return (
    <div
      ref={containerRef}
      className={`elb-explorer elb-flow-map ${className || ''}`}
      style={{
        width: '100%',
        maxWidth: totalWidth,
      }}
    >
      <svg
        viewBox={`0 0 ${totalWidth} ${totalHeight}`}
        style={{
          width: '100%',
          height: 'auto',
          display: 'block',
        }}
      >
        {/* Title */}
        {title && (
          <text
            x={totalWidth / 2}
            y={18}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="var(--color-text, #f3f4f6)"
            fontSize={14}
            fontWeight={600}
            fontFamily="system-ui, -apple-system, sans-serif"
          >
            {title}
          </text>
        )}

        {/* Arrows (rendered first so boxes appear on top) */}
        {(() => {
          const collectorPos = stages.collector;
          const collectorCenterY = collectorPos.y + boxHeight / 2;

          // Helper to spread connection points vertically on an edge
          const getSpreadY = (
            idx: number,
            count: number,
            baseY: number,
          ): number => {
            if (count <= 1) return baseY;
            const spread = Math.min(boxHeight * 0.6, (count - 1) * 12);
            const step = spread / (count - 1);
            return baseY - spread / 2 + idx * step;
          };

          // Find target position for a source (either pre-transformer or collector)
          const getSourceTarget = (
            sourceName: string,
            sourceConfig: FlowSourceConfig,
          ): StagePosition => {
            if (sourceConfig.next && preTransformers?.[sourceConfig.next]) {
              return stages[`pre-${sourceConfig.next}`];
            }
            // No pre-transformer, connect to first pre-transformer or collector
            if (preTransformerList.length > 0) {
              return stages[`pre-${preTransformerList[0].name}`];
            }
            return collectorPos;
          };

          // Find source position for a destination (either post-transformer or collector)
          const getDestinationSource = (
            destName: string,
            destConfig: FlowDestinationConfig,
          ): StagePosition => {
            if (destConfig.before && postTransformers?.[destConfig.before]) {
              return stages[`post-${destConfig.before}`];
            }
            // No 'before' specified - connect directly from collector
            return collectorPos;
          };

          return (
            <>
              {/* Incoming arrow - only show if no stageBefore and single source */}
              {!stageBefore && sourceEntries.length === 1 && (
                <RoughArrow
                  fromX={0}
                  fromY={centerY}
                  toX={stages.source.x}
                  toY={centerY}
                  stroke="var(--flow-edge-stroke, #9ca3af)"
                  centerY={centerY}
                />
              )}

              {/* Before -> first source arrow (only if stageBefore exists) */}
              {stageBefore && (
                <RoughArrow
                  fromX={stages.before.x + STAGE_WIDTH}
                  fromY={centerY}
                  toX={stages.source.x}
                  toY={stages.source.y + boxHeight / 2}
                  stroke="var(--flow-edge-stroke, #9ca3af)"
                  centerY={centerY}
                />
              )}

              {/* Source -> PreTransformer/Collector arrows */}
              {/* Group sources by target to apply spread only for same-target connections */}
              {(() => {
                // Build map: targetKey -> list of sources connecting to it
                const sourcesByTarget = new Map<
                  string,
                  Array<{ name: string; pos: StagePosition; sortIndex: number }>
                >();
                sourcePositions.forEach(({ name, pos }, sortIndex) => {
                  const sourceConfig = sources?.[name] ?? {};
                  const targetKey = sourceConfig.next
                    ? `pre-${sourceConfig.next}`
                    : preTransformerList.length > 0
                      ? `pre-${preTransformerList[0].name}`
                      : 'collector';

                  const existing = sourcesByTarget.get(targetKey) ?? [];
                  existing.push({ name, pos, sortIndex });
                  sourcesByTarget.set(targetKey, existing);
                });

                return sourcePositions.map(({ name, pos: sourcePos }) => {
                  const sourceConfig = sources?.[name] ?? {};
                  const targetPos = getSourceTarget(name, sourceConfig);
                  const sourceCenterY = sourcePos.y + boxHeight / 2;
                  const targetCenterY = targetPos.y + boxHeight / 2;

                  // Find sources connecting to the same target
                  const targetKey = sourceConfig.next
                    ? `pre-${sourceConfig.next}`
                    : preTransformerList.length > 0
                      ? `pre-${preTransformerList[0].name}`
                      : 'collector';
                  const sourcesToSameTarget =
                    sourcesByTarget.get(targetKey) ?? [];
                  const indexWithinTarget = sourcesToSameTarget.findIndex(
                    (s) => s.name === name,
                  );

                  // Only spread if multiple sources connect to same target
                  const spreadY = getSpreadY(
                    indexWithinTarget,
                    sourcesToSameTarget.length,
                    targetCenterY,
                  );

                  const offset = withReturn ? ARROW_OFFSET : 0;

                  return (
                    <React.Fragment key={`source-${name}-arrows`}>
                      <RoughArrow
                        fromX={sourcePos.x + STAGE_WIDTH}
                        fromY={sourceCenterY - offset}
                        toX={targetPos.x}
                        toY={spreadY - offset}
                        stroke="var(--flow-edge-stroke, #9ca3af)"
                        centerY={centerY}
                      />
                      {withReturn && (
                        <RoughArrow
                          fromX={targetPos.x}
                          fromY={spreadY + offset}
                          toX={sourcePos.x + STAGE_WIDTH}
                          toY={sourceCenterY + offset}
                          stroke="var(--flow-edge-stroke, #9ca3af)"
                          centerY={centerY}
                        />
                      )}
                    </React.Fragment>
                  );
                });
              })()}

              {/* Pre-transformer chain arrows */}
              {preTransformerPositions.map(({ name, pos }, index) => {
                const procConfig = preTransformers?.[name] ?? {};
                // Find next target: next transformer in chain, or collector
                let targetPos: StagePosition;
                if (procConfig.next && preTransformers?.[procConfig.next]) {
                  targetPos = stages[`pre-${procConfig.next}`];
                } else {
                  targetPos = collectorPos;
                }

                const fromY = pos.y + boxHeight / 2;
                const toY = targetPos.y + boxHeight / 2;
                const offset = withReturn ? ARROW_OFFSET : 0;

                return (
                  <React.Fragment key={`pre-${name}-chain`}>
                    <RoughArrow
                      fromX={pos.x + STAGE_WIDTH}
                      fromY={fromY - offset}
                      toX={targetPos.x}
                      toY={toY - offset}
                      stroke="var(--flow-edge-stroke, #9ca3af)"
                      centerY={centerY}
                    />
                    {withReturn && (
                      <RoughArrow
                        fromX={targetPos.x}
                        fromY={toY + offset}
                        toX={pos.x + STAGE_WIDTH}
                        toY={fromY + offset}
                        stroke="var(--flow-edge-stroke, #9ca3af)"
                        centerY={centerY}
                      />
                    )}
                  </React.Fragment>
                );
              })}

              {/* PostTransformer/Collector -> Destination arrows */}
              {destinationPositions.map(({ name, pos: destPos }) => {
                const destConfig = destinations?.[name] ?? {};
                const sourcePos = getDestinationSource(name, destConfig);
                const destCenterY = destPos.y + boxHeight / 2;
                const sourceCenterY = sourcePos.y + boxHeight / 2;

                // Draw straight horizontal arrow (post-transformers are already at destination Y)
                const offset = withReturn ? ARROW_OFFSET : 0;

                return (
                  <React.Fragment key={`destination-${name}-arrows`}>
                    <RoughArrow
                      fromX={sourcePos.x + STAGE_WIDTH}
                      fromY={sourceCenterY - offset}
                      toX={destPos.x}
                      toY={destCenterY - offset}
                      stroke="var(--flow-edge-stroke, #9ca3af)"
                      centerY={centerY}
                    />
                    {withReturn && (
                      <RoughArrow
                        fromX={destPos.x}
                        fromY={destCenterY + offset}
                        toX={sourcePos.x + STAGE_WIDTH}
                        toY={sourceCenterY + offset}
                        stroke="var(--flow-edge-stroke, #9ca3af)"
                        centerY={centerY}
                      />
                    )}
                  </React.Fragment>
                );
              })}

              {/* Post-transformer chain arrows (between post-transformers only) */}
              {postTransformerPositions
                .slice(0, -1)
                .map(({ name, pos }, index) => {
                  const procConfig = postTransformers?.[name] ?? {};
                  // Find next target: next transformer in chain
                  const nextProc = postTransformerPositions[index + 1];
                  if (!nextProc) return null;

                  const targetPos = nextProc.pos;
                  const fromY = pos.y + boxHeight / 2;
                  const toY = targetPos.y + boxHeight / 2;
                  const offset = withReturn ? ARROW_OFFSET : 0;

                  return (
                    <React.Fragment key={`post-${name}-chain`}>
                      <RoughArrow
                        fromX={pos.x + STAGE_WIDTH}
                        fromY={fromY - offset}
                        toX={targetPos.x}
                        toY={toY - offset}
                        stroke="var(--flow-edge-stroke, #9ca3af)"
                        centerY={centerY}
                      />
                      {withReturn && (
                        <RoughArrow
                          fromX={targetPos.x}
                          fromY={toY + offset}
                          toX={pos.x + STAGE_WIDTH}
                          toY={fromY + offset}
                          stroke="var(--flow-edge-stroke, #9ca3af)"
                          centerY={centerY}
                        />
                      )}
                    </React.Fragment>
                  );
                })}

              {/* Collector -> first PostTransformer arrow (if post-transformers exist) */}
              {postTransformerList.length > 0 &&
                (() => {
                  const firstPostPos =
                    stages[`post-${postTransformerList[0].name}`];
                  const fromY = collectorCenterY;
                  const toY = firstPostPos.y + boxHeight / 2;
                  const offset = withReturn ? ARROW_OFFSET : 0;

                  return (
                    <>
                      <RoughArrow
                        fromX={collectorPos.x + STAGE_WIDTH}
                        fromY={fromY - offset}
                        toX={firstPostPos.x}
                        toY={toY - offset}
                        stroke="var(--flow-edge-stroke, #9ca3af)"
                        centerY={centerY}
                      />
                      {withReturn && (
                        <RoughArrow
                          fromX={firstPostPos.x}
                          fromY={toY + offset}
                          toX={collectorPos.x + STAGE_WIDTH}
                          toY={fromY + offset}
                          stroke="var(--flow-edge-stroke, #9ca3af)"
                          centerY={centerY}
                        />
                      )}
                    </>
                  );
                })()}

              {/* Destination -> After arrows (per-destination) */}
              {afterPositions.map(({ name: destName, pos: afterPos }) => {
                const destPos = stages[`destination-${destName}`];
                if (!destPos) return null;
                const destCenterY = destPos.y + boxHeight / 2;
                const afterCenterY = afterPos.y + boxHeight / 2;

                return (
                  <RoughArrow
                    key={`dest-${destName}-after`}
                    fromX={destPos.x + STAGE_WIDTH}
                    fromY={destCenterY}
                    toX={afterPos.x}
                    toY={afterCenterY}
                    stroke="var(--flow-edge-stroke, #9ca3af)"
                    centerY={centerY}
                  />
                );
              })}

              {/* Outgoing arrow - only show if no after stages and single destination */}
              {!hasAnyAfterStage && destinationEntries.length === 1 && (
                <RoughArrow
                  fromX={stages.destination.x + STAGE_WIDTH}
                  fromY={centerY}
                  toX={totalWidth}
                  toY={centerY}
                  stroke="var(--flow-edge-stroke, #9ca3af)"
                  centerY={centerY}
                />
              )}
            </>
          );
        })()}

        {/* Stages */}
        {stageConfigs.map(
          ({ key, config, fillVar, strokeVar, defaultLabel, defaultLink }) => {
            const pos = stages[key];
            const icon = config?.icon;
            const label = config?.label || defaultLabel;
            const text = config?.text;
            const description = config?.description;
            const link = config?.link;
            const stageHighlight = config?.highlight !== false;

            // Calculate label Y position
            // When text exists: label at ~25% from top, text fills remaining space centered
            const labelY = text
              ? pos.y + pos.height * 0.28
              : pos.y + pos.height / 2;

            // Resolve link URL: undefined = default, false = none, string = custom
            const linkUrl =
              link === false
                ? null
                : typeof link === 'string'
                  ? link
                  : defaultLink;

            // Content to render (box, label, text, description)
            const stageContent = (
              <>
                {/* Box */}
                <RoughRect
                  x={pos.x}
                  y={pos.y}
                  width={pos.width}
                  height={pos.height}
                  fill={`var(${fillVar}, #6b7280)`}
                  stroke={
                    stageHighlight
                      ? `var(${strokeVar}, #6b7280)`
                      : 'var(--flow-edge-stroke, #9ca3af)'
                  }
                />

                {/* Label (with optional icon) */}
                <foreignObject
                  x={pos.x + 4}
                  y={labelY - layout.labelSize / 2 - 2}
                  width={pos.width - 8}
                  height={layout.labelSize + 4}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      height: '100%',
                      fontSize: layout.labelSize,
                      fontWeight: layout.labelWeight,
                      fontFamily: 'system-ui, -apple-system, sans-serif',
                      color: 'var(--color-text)',
                    }}
                  >
                    {icon && <Icon icon={icon} width={14} height={14} />}
                    <span>{label}</span>
                  </div>
                </foreignObject>

                {/* Text (inside box, below label - supports ReactNode) */}
                {text && (
                  <foreignObject
                    x={pos.x + 4}
                    y={pos.y + pos.height * 0.34}
                    width={pos.width - 8}
                    height={pos.height * 0.62}
                  >
                    <div
                      style={{
                        fontSize: layout.textSize,
                        fontWeight: layout.textWeight,
                        color: 'var(--color-text)',
                        textAlign: 'center',
                        fontFamily: 'system-ui, -apple-system, sans-serif',
                        lineHeight: 1.3,
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {text}
                    </div>
                  </foreignObject>
                )}

                {/* Description (below box, using foreignObject for rich content) */}
                {description && (
                  <foreignObject
                    x={pos.x}
                    y={pos.y + pos.height + 8}
                    width={STAGE_WIDTH}
                    height={descriptionHeight}
                  >
                    <div
                      style={{
                        fontSize: layout.descriptionSize,
                        color: 'var(--color-text-muted)',
                        textAlign: 'center',
                        fontFamily: 'system-ui, -apple-system, sans-serif',
                        lineHeight: 1.3,
                      }}
                    >
                      {description}
                    </div>
                  </foreignObject>
                )}
              </>
            );

            // Wrap in link if URL is set
            return linkUrl ? (
              <a
                key={key}
                href={linkUrl}
                style={{ cursor: 'pointer', textDecoration: 'none' }}
              >
                {stageContent}
              </a>
            ) : (
              <g key={key}>{stageContent}</g>
            );
          },
        )}

        {/* Markers */}
        {markers?.map((marker, index) => {
          const pos = getMarkerPosition(
            marker.position,
            stages,
            centerY,
            totalWidth,
          );
          // Skip markers for stages that don't exist
          if (!pos) return null;
          const id = marker.id ?? String(index + 1);
          return (
            <Marker key={`marker-${index}`} x={pos.x} y={pos.y} text={id} />
          );
        })}

        {/* Legend */}
        {legendItems.length > 0 && (
          <foreignObject
            x={PADDING_X}
            y={baseY + stackedHeight + belowBoxHeight + 4}
            width={totalWidth - PADDING_X * 2}
            height={LEGEND_LINE_HEIGHT * estimatedLines}
          >
            <div
              style={{
                fontSize: 11,
                fontFamily: 'system-ui, -apple-system, sans-serif',
                color: 'var(--color-text-muted)',
                lineHeight: 1.6,
              }}
            >
              {legendItems.map((item, index) => {
                const id =
                  item.id ?? String((markers?.indexOf(item) ?? index) + 1);
                return (
                  <span key={`legend-${index}`}>
                    <span
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        background: 'var(--flow-marker-fill, #dc2626)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 8,
                        fontWeight: 600,
                        color: 'var(--flow-marker-text, #ffffff)',
                        verticalAlign: 'middle',
                        marginRight: 4,
                        position: 'relative',
                        top: -1,
                      }}
                    >
                      {id}
                    </span>
                    <span style={{ marginRight: 10 }}>{item.text}</span>
                  </span>
                );
              })}
            </div>
          </foreignObject>
        )}
      </svg>
    </div>
  );
}
