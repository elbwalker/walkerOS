import React from 'react';
import { render } from '@testing-library/react';
import { EventLegend, type EventLegendProps } from '../EventLegend';

// Event hues only show on dark grounds, so the legend is a dark island in both
// themes, and it always lists the parts in event order.
it.each<[EventLegendProps['parts'], string[]]>([
  [undefined, ['entity', 'action', 'property', 'context', 'globals']],
  [
    ['globals', 'entity'],
    ['entity', 'globals'],
  ],
])('parts %j: a dark island listing %j', (parts, expected) => {
  const { container } = render(<EventLegend parts={parts} />);
  const root = container.firstElementChild;
  expect(root?.getAttribute('data-theme')).toBe('dark');
  expect(Array.from(root?.children ?? [], (item) => item.textContent)).toEqual(
    expected,
  );
});
