import type { Meta, StoryObj } from '@storybook/react-vite';
import { FlowMap } from './FlowMap';

const meta: Meta<typeof FlowMap> = {
  title: 'Molecules/FlowMap/Transformers',
  component: FlowMap,
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof FlowMap>;

/**
 * Simple flow with a single pre-transformer between source and collector.
 */
export const SimplePreTransformer: Story = {
  args: {
    sources: {
      web: { label: 'Source', text: 'walker.js', next: 'filter' },
    },
    preTransformers: {
      filter: { label: 'Filter', text: 'Drop bots' },
    },
    collector: { label: 'Collector' },
    destinations: {
      ga4: { label: 'Destination', text: 'GA4' },
    },
  },
};

/**
 * Full flow with both pre-transformers and post-transformers.
 */
export const BothPreAndPostTransformers: Story = {
  args: {
    sources: {
      web: { label: 'Source', text: 'walker.js', next: 'filter' },
    },
    preTransformers: {
      filter: { label: 'Filter', next: 'enricher' },
      enricher: { label: 'Enricher' },
    },
    collector: { label: 'Collector' },
    postTransformers: {
      consent: { label: 'Consent', next: 'redactor' },
      redactor: { label: 'Redactor' },
    },
    destinations: {
      ga4: { label: 'Destination', text: 'GA4', before: 'redactor' },
    },
  },
};

/**
 * Full flow with stageBefore, stageAfter, and transformers.
 */
export const FullFlowWithContext: Story = {
  args: {
    stageBefore: { label: 'Browser', text: 'Click event' },
    sources: {
      web: { label: 'Source', text: 'walker.js', next: 'filter' },
    },
    preTransformers: {
      filter: { label: 'Filter' },
    },
    collector: { label: 'Collector' },
    postTransformers: {
      redactor: { label: 'Redactor' },
    },
    destinations: {
      ga4: { label: 'Destination', text: 'GA4', before: 'redactor' },
    },
    stageAfter: { label: 'gtag', text: 'Reporting' },
  },
};

/**
 * Combined test: skip connections on BOTH left and right sides.
 * Shows all 4 arrow cases: up/down on left, up/down on right.
 * - Left: Web→Filter (down), App→Enricher (up)
 * - Right: Consent→BigQuery (up), Redactor→GA4 (down)
 */
export const AllArrowDirections: Story = {
  args: {
    sources: {
      web: { label: 'Web', text: 'walker.js', next: 'filter' },
      app: { label: 'App', text: 'SDK', next: 'enricher' },
    },
    preTransformers: {
      filter: { label: 'Filter', next: 'enricher' },
      enricher: { label: 'Enricher' },
    },
    collector: { label: 'Collector' },
    postTransformers: {
      consent: { label: 'Consent', next: 'redactor' },
      redactor: { label: 'Redactor' },
    },
    destinations: {
      bigquery: { label: 'BigQuery', before: 'consent' },
      ga4: { label: 'GA4', before: 'redactor' },
    },
  },
};

/**
 * Three pre-transformers in a chain.
 */
export const LongPreTransformerChain: Story = {
  args: {
    sources: {
      web: { label: 'Source', next: 'filter' },
    },
    preTransformers: {
      filter: { label: 'Filter', next: 'enricher' },
      enricher: { label: 'Enricher', next: 'redactor' },
      redactor: { label: 'Redactor' },
    },
    collector: { label: 'Collector' },
    destinations: {
      ga4: { label: 'Destination' },
    },
  },
};
