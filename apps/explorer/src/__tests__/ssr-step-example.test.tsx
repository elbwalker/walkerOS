import React from 'react';
import { renderToString } from 'react-dom/server';
import type { Flow } from '@walkeros/core';
import { StepExample } from '../components/molecules/step-example';

// The website's Markdown export reads this DOM back: one labelled box per
// part, each with exactly one `pre > code`, in Event, [Mapping], Out order.
const labels = (html: string) =>
  [...html.matchAll(/class="elb-explorer-label">([^<]*)</g)].map((m) => m[1]);

it.each<[string, Flow.StepExample, string[]]>([
  [
    'with mapping',
    {
      in: { name: 'product add' },
      mapping: { name: 'add_to_cart' },
      out: [['gtag', 'event', 'add_to_cart', { value: 420 }]],
    },
    ['Event', 'Mapping', 'Out'],
  ],
  [
    'without mapping',
    { in: { name: 'page view' }, out: [['gtag', 'event', 'page_view']] },
    ['Event', 'Out'],
  ],
])(
  'renders one labelled code block per part server-side (%s)',
  (_, example, expected) => {
    const html = renderToString(<StepExample example={example} />);

    expect(labels(html)).toEqual(expected);
    expect(html.match(/<pre[^>]*class="[^"]*shiki/g)).toHaveLength(
      expected.length,
    );
    expect(html).not.toContain('Loading');
  },
);
