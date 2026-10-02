import React from 'react';
import { renderToString } from 'react-dom/server';
import { CodeView } from '../components/molecules/code-view';
import { Grid } from '../components/atoms/grid';

const view = (props: { height?: number }) => (
  <CodeView label="/flows/web/collector/globals" code="{}" {...props} />
);

// Static code sizes to its content unless a height is given or a Grid sizes
// the row; a fixed-height box around a few lines is the defect this guards.
it.each<[string, React.ReactElement, boolean]>([
  ['standalone', view({}), true],
  ['explicit height', view({ height: 480 }), false],
  ['inside a Grid', <Grid key="grid">{view({})}</Grid>, false],
])('CodeView fits its code: %s', (_, element, fits) => {
  const html = renderToString(element);

  expect(html.includes('elb-code-view--fit')).toBe(fits);
});
