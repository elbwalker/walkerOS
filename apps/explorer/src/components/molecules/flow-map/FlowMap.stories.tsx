import type { Meta, StoryObj } from '@storybook/react-vite';
import { FlowMap } from './FlowMap';

const meta: Meta<typeof FlowMap> = {
  title: 'Molecules/FlowMap',
  component: FlowMap,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof FlowMap>;

/**
 * Source, collector and destination with custom labels and text, as the
 * event model docs show the mapping step.
 */
export const WithLabels: Story = {
  args: {
    sources: { default: { label: 'walkerOS', text: 'Event' } },
    collector: { label: 'Mapping' },
    destinations: { default: { label: 'Destination', text: 'Format' } },
  },
};

/**
 * Numbered markers with a legend below the diagram, all stages without
 * highlight, as the mapping docs introduce source and destination mapping.
 */
export const MarkersWithLegend: Story = {
  args: {
    sources: { default: { highlight: false } },
    collector: { highlight: false },
    destinations: { default: { highlight: false } },
    markers: [
      {
        position: 'source-collector',
        id: '1',
        text: 'Source mapping: clean, filter, normalize incoming data',
      },
      {
        position: 'collector-destination',
        id: '2',
        text: 'Destination mapping: transform to tool-specific formats',
      },
    ],
  },
};

/**
 * Iconify icons on every stage, a context stage before the source and several
 * destinations, as the website integrations section shows a client flow.
 */
export const WithIcons: Story = {
  args: {
    stageBefore: {
      icon: 'mdi:code-tags',
      label: 'HTML Tagging',
      link: '/docs/sources/web/browser/tagging/',
    },
    sources: {
      browser: {
        icon: 'mdi:web',
        label: 'Browser',
        link: '/docs/sources/web/browser/',
      },
    },
    collector: {
      label: 'Collector',
      link: '/docs/collector',
    },
    destinations: {
      ga4: {
        icon: 'simple-icons:googleanalytics',
        label: 'GA4',
        link: '/docs/destinations/web/gtag/ga4',
      },
      meta: {
        icon: 'simple-icons:meta',
        label: 'Meta Pixel',
        link: '/docs/destinations/web/meta-pixel',
      },
      api: {
        icon: 'mdi:api',
        label: 'API',
        link: '/docs/destinations/api/web',
      },
    },
  },
};
