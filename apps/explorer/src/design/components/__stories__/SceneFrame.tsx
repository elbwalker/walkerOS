import React, { type CSSProperties, type ReactNode } from 'react';
import type { Decorator } from '@storybook/react-vite';

/**
 * Where a part sits in a scene: `fill` for full-frame parts, `top` and
 * `bottom` for overlays centred on the horizontal axis, `center` for panels.
 */
export type ScenePlacement = 'fill' | 'top' | 'bottom' | 'center';

const ALIGN: Readonly<Record<ScenePlacement, CSSProperties['alignItems']>> = {
  fill: 'stretch',
  top: 'flex-start',
  bottom: 'flex-end',
  center: 'center',
};

// A 16:9 scene at the 1440px logical width every format shares. Its pixel
// sizes are layout, not theme; the ground and the safe area are tokens.
const FRAME: CSSProperties = {
  boxSizing: 'border-box',
  display: 'flex',
  justifyContent: 'center',
  width: 1440,
  height: 810,
  overflow: 'hidden',
  background: 'var(--bg)',
};

/** Shows a part the way a scene places it. Stories only; not in the design entry. */
export function SceneFrame({
  placement,
  maxWidth,
  children,
}: {
  placement: ScenePlacement;
  /** A container token for a panel, such as `var(--container-4xl)`. */
  maxWidth?: string;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        ...FRAME,
        alignItems: ALIGN[placement],
        padding: placement === 'fill' ? 0 : 'var(--section-y)',
      }}
    >
      {maxWidth === undefined ? (
        children
      ) : (
        <div style={{ width: '100%', maxWidth }}>{children}</div>
      )}
    </div>
  );
}

/** The decorator for a story: its part in a scene frame. */
export function sceneFrame(
  placement: ScenePlacement,
  maxWidth?: string,
): Decorator {
  return function SceneDecorator(Story) {
    return (
      <SceneFrame placement={placement} maxWidth={maxWidth}>
        <Story />
      </SceneFrame>
    );
  };
}
