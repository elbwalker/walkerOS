import React from 'react';
import { renderToString } from 'react-dom/server';
import { Grid } from '../grid';
import { Box } from '../box';
import { LiveCode } from '../../organisms/live-code';

// Only LiveCode's column choice is under test, so its Monaco editors are
// replaced by a plain labelled box.
jest.mock('../../molecules/code-box', () => {
  // require inside the factory: jest hoists jest.mock above imports.
  const ReactLocal = require('react');
  return {
    CodeBox: ({ label }: { label?: string }) =>
      ReactLocal.createElement('div', null, label),
  };
});

const boxes = (n: number) =>
  Array.from({ length: n }, (_, i) => <Box key={i} header={`Box ${i}`} />);

// The grid element's columns-mode class and --grid-columns value, if any.
const gridColumns = (html: string) => {
  const grid = html.match(/<div class="(elb-explorer-grid[^"]*)"[^>]*>/);
  return {
    mode: grid?.[1].includes('elb-explorer-grid--columns') ?? false,
    value: grid?.[0].match(/--grid-columns:(\d+)/)?.[1],
  };
};

// `columns` comes from the prop, never from counting React children: boxes
// passed inside a Fragment (as stories and MDX do) count as one child.
it.each<[string, number | undefined, React.ReactNode, string | undefined]>([
  ['no columns: one row of all boxes', undefined, boxes(3), undefined],
  ['boxes inside a Fragment', 3, <>{boxes(3)}</>, '3'],
  ['fewer columns than boxes wraps the rest', 2, boxes(4), '2'],
])('%s', (_, columns, children, expected) => {
  const html = renderToString(<Grid columns={columns}>{children}</Grid>);

  expect(gridColumns(html)).toEqual({
    mode: expected !== undefined,
    value: expected,
  });
});

// LiveCode renders its config box only with a config, so it must ask for as
// many columns as it renders boxes, or the row keeps an empty column.
it.each<[string, unknown, string]>([
  ['with config', { name: 'demo' }, '3'],
  ['without config', undefined, '2'],
])('LiveCode asks for one column per box (%s)', (_, config, expected) => {
  const html = renderToString(
    <LiveCode input={{ name: 'page view' }} config={config} />,
  );

  expect(gridColumns(html).value).toBe(expected);
});
