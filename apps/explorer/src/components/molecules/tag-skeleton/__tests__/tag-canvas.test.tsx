import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TagCanvas } from '../TagCanvas';
import type { TagTree } from '../types';

/** A small explicit-rect tree so positions are deterministic and assertable. */
function fixtureTree(src?: string): TagTree {
  return {
    width: 200,
    height: 100,
    src,
    roots: [
      {
        id: 'parent-0',
        type: 'entity',
        name: 'parent',
        rect: { x: 0, y: 0, w: 200, h: 100 },
        children: [
          {
            id: 'child-0',
            type: 'property',
            name: 'child',
            rect: { x: 20, y: 30, w: 40, h: 20 },
          },
        ],
      },
    ],
  };
}

describe('TagCanvas', () => {
  it('renders a single anchor frame', () => {
    const { container } = render(<TagCanvas tree={fixtureTree()} />);
    const frames = container.querySelectorAll('.elb-tag-skeleton__frame');
    expect(frames).toHaveLength(1);
    expect(frames[0]).toHaveClass('elb-tag-skeleton');
  });

  it('omits the image when no src is set', () => {
    const { container } = render(<TagCanvas tree={fixtureTree()} />);
    expect(
      container.querySelector('.elb-tag-skeleton__frame-image'),
    ).toBeNull();
  });

  it('renders an img when src is set', () => {
    const { container } = render(
      <TagCanvas tree={fixtureTree('shot.png')} alt="a screenshot" />,
    );
    const img = container.querySelector('img.elb-tag-skeleton__frame-image');
    expect(img).not.toBeNull();
    expect(img).toHaveAttribute('src', 'shot.png');
    expect(img).toHaveAttribute('alt', 'a screenshot');
  });

  it('positions each node with percentage left/top/width/height', () => {
    const { container } = render(<TagCanvas tree={fixtureTree()} />);
    const boxes = container.querySelectorAll<HTMLElement>(
      '.elb-tag-skeleton__box',
    );
    expect(boxes).toHaveLength(2);

    const parent = container.querySelector<HTMLElement>('[data-name="parent"]');
    const child = container.querySelector<HTMLElement>('[data-name="child"]');
    expect(parent).not.toBeNull();
    expect(child).not.toBeNull();

    // parent rect {0,0,200,100} on a 200x100 canvas => 0% 0% 100% 100%
    expect(parent).toHaveStyle({
      left: '0%',
      top: '0%',
      width: '100%',
      height: '100%',
    });
    // child rect {20,30,40,20} => 10% 30% 20% 20%
    expect(child).toHaveStyle({
      left: '10%',
      top: '30%',
      width: '20%',
      height: '20%',
    });
  });

  it('renders nodes in paint order: parents before children', () => {
    const { container } = render(<TagCanvas tree={fixtureTree()} />);
    const boxes = Array.from(
      container.querySelectorAll<HTMLElement>('.elb-tag-skeleton__box'),
    );
    const names = boxes.map((box) => box.getAttribute('data-name'));
    expect(names.indexOf('parent')).toBeLessThan(names.indexOf('child'));
  });

  it('marks the selected node with the selected modifier', () => {
    const { container } = render(
      <TagCanvas tree={fixtureTree()} selectedId="child-0" />,
    );
    const child = container.querySelector('[data-name="child"]');
    const parent = container.querySelector('[data-name="parent"]');
    expect(child).toHaveClass('elb-tag-skeleton__box--selected');
    expect(parent).not.toHaveClass('elb-tag-skeleton__box--selected');
  });

  it('marks the dragging node with the dragging modifier', () => {
    const { container } = render(
      <TagCanvas tree={fixtureTree()} draggingId="parent-0" />,
    );
    const parent = container.querySelector('[data-name="parent"]');
    expect(parent).toHaveClass('elb-tag-skeleton__box--dragging');
  });

  it('applies the overlay fill class to boxes when a src is set', () => {
    const { container } = render(<TagCanvas tree={fixtureTree('shot.png')} />);
    const parent = container.querySelector('[data-name="parent"]');
    expect(parent).toHaveClass('elb-tag-skeleton__box--overlay');
  });

  it('shows every tab by default (captions="always")', () => {
    const { container } = render(<TagCanvas tree={fixtureTree()} />);
    const hidden = container.querySelectorAll(
      '.elb-tag-skeleton__box--no-caption',
    );
    expect(hidden).toHaveLength(0);
  });

  it('hides every tab initially in captions="hover" mode', () => {
    const { container } = render(
      <TagCanvas tree={fixtureTree()} captions="hover" />,
    );
    const boxes = container.querySelectorAll('.elb-tag-skeleton__box');
    const hidden = container.querySelectorAll(
      '.elb-tag-skeleton__box--no-caption',
    );
    // No pointer has entered yet, so all tabs are hidden.
    expect(hidden).toHaveLength(boxes.length);
  });

  it('reveals the containing chain under the pointer in hover mode', () => {
    const { container } = render(
      <TagCanvas tree={fixtureTree()} size={200} captions="hover" />,
    );
    const frame = container.querySelector<HTMLElement>(
      '.elb-tag-skeleton__frame',
    );
    expect(frame).not.toBeNull();
    if (!frame) return;

    // jsdom has no real layout: stub the frame box to the canvas size so grid
    // coords map 1:1 (canvas is 200x100, fixture child rect is {20,30,40,20}).
    frame.getBoundingClientRect = () =>
      ({
        left: 0,
        top: 0,
        width: 200,
        height: 100,
        right: 200,
        bottom: 100,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect;

    // A point inside the child rect (and so inside the parent too).
    fireEvent.mouseMove(frame, { clientX: 30, clientY: 40 });

    const parent = container.querySelector('[data-name="parent"]');
    const child = container.querySelector('[data-name="child"]');
    // Both ancestors in the containing chain are revealed.
    expect(parent).not.toHaveClass('elb-tag-skeleton__box--no-caption');
    expect(child).not.toHaveClass('elb-tag-skeleton__box--no-caption');

    // Leaving the frame hides every tab again.
    fireEvent.mouseLeave(frame);
    expect(parent).toHaveClass('elb-tag-skeleton__box--no-caption');
    expect(child).toHaveClass('elb-tag-skeleton__box--no-caption');
  });

  it('uses the size prop as the frame width', () => {
    const { container } = render(<TagCanvas tree={fixtureTree()} size={640} />);
    const frame = container.querySelector<HTMLElement>(
      '.elb-tag-skeleton__frame',
    );
    expect(frame).toHaveStyle({ width: '640px' });
  });
});
