import React from 'react';
import { render } from '@testing-library/react';
import { FlowMap } from '../FlowMap';

describe('FlowMap collector chain', () => {
  it('draws collector.next inside the collector group, before the fan-out', () => {
    const { container, getByText } = render(
      <FlowMap
        collectorTransformers={{
          validate: { label: 'Validate', next: 'dedupe' },
          dedupe: { label: 'Dedupe' },
        }}
        postTransformers={{ redactor: { label: 'Redactor' } }}
        destinations={{
          ga4: { label: 'GA4', before: 'redactor' },
          bigquery: { label: 'BigQuery' },
        }}
      />,
    );

    const group = container.querySelector('.elb-flow-map__collector-chain');
    expect(group).not.toBeNull();
    expect(getByText('Validate')).toBeTruthy();
    expect(getByText('Dedupe')).toBeTruthy();

    // Collector, the two chain boxes and the redactor all sit left of the
    // destinations column: the chain is drawn before the fan-out.
    const width = Number(group?.getAttribute('width'));
    const x = Number(group?.getAttribute('x'));
    expect(width).toBeGreaterThan(3 * 120);
    expect(x).toBeGreaterThan(0);
  });

  it('draws no collector group without collectorTransformers', () => {
    const { container } = render(
      <FlowMap postTransformers={{ redactor: { label: 'Redactor' } }} />,
    );
    expect(
      container.querySelector('.elb-flow-map__collector-chain'),
    ).toBeNull();
  });
});
