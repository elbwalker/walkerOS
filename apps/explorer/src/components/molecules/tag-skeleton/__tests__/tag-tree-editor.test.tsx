import React from 'react';
import { render, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TagTreeEditor } from '../TagTreeEditor';
import { layout, laminarViolations } from '../layout';
import type { Tag, TagTree } from '../types';

function twoEntityTree(): TagTree {
  const left: Tag = {
    id: 'left-0',
    type: 'entity',
    name: 'left',
    rect: { x: 0, y: 0, w: 300, h: 300 },
    children: [
      {
        id: 'prop-0',
        type: 'property',
        name: 'price',
        value: '9',
        rect: { x: 20, y: 40, w: 80, h: 40 },
      },
    ],
  };
  const right: Tag = {
    id: 'right-0',
    type: 'entity',
    name: 'right',
    rect: { x: 400, y: 0, w: 300, h: 300 },
    children: [],
  };
  return { width: 800, height: 400, src: 'shot.png', roots: [left, right] };
}

describe('TagTreeEditor', () => {
  it('renders the canvas and an accessible tree mirror', () => {
    const { container } = render(
      <TagTreeEditor tree={twoEntityTree()} onChange={() => undefined} />,
    );
    const scoped = within(container);
    expect(scoped.getByRole('tree', { name: 'Tag tree' })).toBeInTheDocument();
    // 2 roots + 1 nested property = 3 items.
    expect(scoped.getAllByRole('treeitem')).toHaveLength(3);
  });

  it('labels treeitems as "{type} {name}: {value}"', () => {
    const { container } = render(
      <TagTreeEditor tree={twoEntityTree()} onChange={() => undefined} />,
    );
    const scoped = within(container);
    expect(
      scoped.getByRole('treeitem', { name: 'property price: 9' }),
    ).toBeInTheDocument();
    expect(
      scoped.getByRole('treeitem', { name: 'entity left' }),
    ).toBeInTheDocument();
  });

  it('is controlled: it does not mutate the tree without an onChange commit', () => {
    const tree = twoEntityTree();
    const snapshot = JSON.stringify(tree);
    render(<TagTreeEditor tree={tree} onChange={() => undefined} />);
    expect(JSON.stringify(tree)).toBe(snapshot);
  });

  it('renders one hit target per positioned node', () => {
    const { container } = render(
      <TagTreeEditor tree={twoEntityTree()} onChange={() => undefined} />,
    );
    const hits = container.querySelectorAll('.elb-tag-tree-editor__hit');
    // left, prop, right.
    expect(hits).toHaveLength(3);
  });

  it('keeps the initial render layout laminar', () => {
    const tree = twoEntityTree();
    expect(laminarViolations(layout(tree).nodes)).toEqual([]);
  });
});
