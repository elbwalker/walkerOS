import type { Meta, StoryObj } from '@storybook/react-vite';
import { FlowMap } from './FlowMap';

const meta: Meta<typeof FlowMap> = {
  title: 'Molecules/FlowMap',
  component: FlowMap,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div
        className="elb-explorer"
        data-theme="dark"
        style={{ padding: '20px', background: '#1f2937' }}
      >
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof FlowMap>;

/**
 * Default state - Soft Pastels palette (mint → sky → lavender)
 */
export const Default: Story = {
  args: {},
};

/**
 * With custom labels and text
 */
export const WithLabels: Story = {
  args: {
    sources: { default: { label: 'Website', text: 'walker.js' } },
    collector: { label: 'walkerOS', text: 'Node' },
    destinations: { default: { label: 'GA4', text: 'Analytics' } },
  },
};

/**
 * Markers with legend - shows markers and legend text below diagram
 */
export const MarkersWithLegend: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h3 style={{ color: '#9ca3af', marginBottom: '8px', fontSize: '14px' }}>
          Markers with legend descriptions
        </h3>
        <div
          className="elb-explorer"
          data-theme="dark"
          style={{
            background: '#1f2937',
            padding: '12px',
            borderRadius: '8px',
          }}
        >
          <FlowMap
            sources={{ default: { label: 'Source', text: 'walker.js' } }}
            collector={{ label: 'Collector', text: 'Node' }}
            destinations={{ default: { label: 'Destination', text: 'GA4' } }}
            markers={[
              {
                position: 'source',
                id: '1',
                text: 'Events are tracked on user interactions',
              },
              {
                position: 'source-collector',
                id: '2',
                text: 'Data is validated and sent to the collector server',
              },
              {
                position: 'collector',
                id: '3',
                text: 'Events are processed, enriched, and transformed',
              },
              {
                position: 'destination',
                id: '4',
                text: 'Analytics platform receives the processed data',
              },
            ]}
          />
        </div>
      </div>

      <div>
        <h3 style={{ color: '#9ca3af', marginBottom: '8px', fontSize: '14px' }}>
          Mixed markers (some with legend, some without)
        </h3>
        <div
          className="elb-explorer"
          data-theme="dark"
          style={{
            background: '#1f2937',
            padding: '12px',
            borderRadius: '8px',
          }}
        >
          <FlowMap
            sources={{ default: { label: 'Source', text: 'walker.js' } }}
            collector={{ label: 'Collector', text: 'Node' }}
            destinations={{ default: { label: 'Destination', text: 'GA4' } }}
            markers={[
              { position: 'incoming', id: 'A', text: 'Page view event' },
              { position: 'source' }, // No legend entry, auto-numbered
              {
                position: 'collector',
                id: 'B',
                text: 'Validation & enrichment',
              },
              { position: 'outgoing' }, // No legend entry, auto-numbered
            ]}
          />
        </div>
      </div>
    </div>
  ),
  decorators: [
    (Story) => (
      <div style={{ padding: '20px', background: '#111827' }}>
        <Story />
      </div>
    ),
  ],
};

/**
 * Theme comparison - Dark and Light mode side by side
 */
export const ThemeComparison: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div data-theme="dark">
        <h3 style={{ color: '#9ca3af', marginBottom: '8px', fontSize: '14px' }}>
          Dark Mode
        </h3>
        <div
          className="elb-explorer"
          style={{
            background: '#1f2937',
            padding: '12px',
            borderRadius: '8px',
          }}
        >
          <FlowMap
            sources={{ default: { label: 'Source', text: 'walker.js' } }}
            collector={{ label: 'Collector', text: 'Node' }}
            destinations={{ default: { label: 'Destination', text: 'GA4' } }}
            markers={[
              {
                position: 'source',
                id: '1',
                text: 'Events are tracked on user interactions',
              },
              {
                position: 'source-collector',
                id: '2',
                text: 'Data is validated and sent to the collector server',
              },
              {
                position: 'collector',
                id: '3',
                text: 'Events are processed, enriched, and transformed',
              },
              {
                position: 'destination',
                id: '4',
                text: 'Analytics platform receives the processed data',
              },
            ]}
          />
        </div>
      </div>

      <div data-theme="light">
        <h3 style={{ color: '#6b7280', marginBottom: '8px', fontSize: '14px' }}>
          Light Mode
        </h3>
        <div
          className="elb-explorer"
          style={{
            background: '#ffffff',
            padding: '12px',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
          }}
        >
          <FlowMap
            sources={{ default: { label: 'Source', text: 'walker.js' } }}
            collector={{ label: 'Collector', text: 'Node' }}
            destinations={{ default: { label: 'Destination', text: 'GA4' } }}
            markers={[
              {
                position: 'source',
                id: '1',
                text: 'Events are tracked on user interactions',
              },
              {
                position: 'source-collector',
                id: '2',
                text: 'Data is validated and sent to the collector server',
              },
              {
                position: 'collector',
                id: '3',
                text: 'Events are processed, enriched, and transformed',
              },
              {
                position: 'destination',
                id: '4',
                text: 'Analytics platform receives the processed data',
              },
            ]}
          />
        </div>
      </div>
    </div>
  ),
  decorators: [
    (Story) => (
      <div style={{ padding: '20px', background: '#111827' }}>
        <Story />
      </div>
    ),
  ],
};

/**
 * Context Stages - Shows optional stageBefore and stageAfter
 * These stages act as visual boundaries (no edge arrows extend beyond them)
 */
export const ContextStages: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div>
        <h3 style={{ color: '#9ca3af', marginBottom: '8px', fontSize: '14px' }}>
          Basic Usage
        </h3>
        <FlowMap
          stageBefore={{ label: 'Browser', text: 'Click event' }}
          sources={{ default: { text: 'web' } }}
          collector={{ text: 'walkerjs' }}
          destinations={{ default: { text: 'API' } }}
          stageAfter={{ label: 'gtag', text: 'GA4' }}
        />
      </div>

      <div>
        <h3 style={{ color: '#9ca3af', marginBottom: '8px', fontSize: '14px' }}>
          Available Marker Positions
        </h3>
        <FlowMap
          stageBefore={{ label: 'Browser', text: 'Click event' }}
          sources={{ default: { text: 'web' } }}
          collector={{ text: 'walkerjs' }}
          destinations={{ default: { text: 'API' } }}
          stageAfter={{ label: 'gtag', text: 'GA4' }}
          markers={[
            { position: 'stage-before', id: '1', text: 'stage-before' },
            { position: 'before-source', id: '2', text: 'before-source' },
            { position: 'stage-after-left', id: '3', text: 'stage-after-left' },
            {
              position: 'destination-after',
              id: '4',
              text: 'destination-after',
            },
          ]}
        />
      </div>
    </div>
  ),
};

/**
 * Typical flow with back-and-forth arrows (withReturn).
 * Shows two parallel arrows per connection - one forward, one return.
 */
export const TypicalFlowWithReturn: Story = {
  render: () => (
    <FlowMap
      sources={{ default: { label: 'Website', text: 'walker.js' } }}
      collector={{ label: 'walkerOS', text: 'Node' }}
      destinations={{ default: { label: 'BigQuery', text: 'Warehouse' } }}
      withReturn
    />
  ),
};

/**
 * 3x3 Mesh: Multiple sources to multiple destinations.
 * All arrows point forward (no return arrows).
 */
export const MeshLayout: Story = {
  render: () => (
    <FlowMap
      sources={{
        web: { label: 'Web' },
        app: { label: 'App' },
        server: { label: 'Server' },
      }}
      collector={{ label: 'walkerOS' }}
      destinations={{
        ga4: { label: 'GA4' },
        bigquery: { label: 'BigQuery' },
        segment: { label: 'Segment' },
      }}
    />
  ),
};

/**
 * Icons - Display Iconify icons before labels in boxes
 */
export const WithIcons: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div>
        <h3 style={{ color: '#9ca3af', marginBottom: '8px', fontSize: '14px' }}>
          Icons on all stages
        </h3>
        <FlowMap
          sources={{
            default: {
              icon: 'mdi:web',
              label: 'Website',
              text: 'walker.js',
            },
          }}
          collector={{
            icon: 'mdi:server',
            label: 'walkerOS',
            text: 'Node',
          }}
          destinations={{
            default: {
              icon: 'simple-icons:googleanalytics',
              label: 'GA4',
              text: 'Analytics',
            },
          }}
        />
      </div>

      <div>
        <h3 style={{ color: '#9ca3af', marginBottom: '8px', fontSize: '14px' }}>
          Multiple sources and destinations with icons
        </h3>
        <FlowMap
          sources={{
            web: {
              icon: 'mdi:web',
              label: 'Web',
              text: 'Browser SDK',
            },
            app: {
              icon: 'mdi:cellphone',
              label: 'App',
              text: 'Mobile SDK',
            },
          }}
          collector={{
            icon: 'mdi:cog',
            label: 'Collector',
          }}
          destinations={{
            ga4: {
              icon: 'simple-icons:googleanalytics',
              label: 'GA4',
            },
            bigquery: {
              icon: 'simple-icons:googlebigquery',
              label: 'BigQuery',
            },
            meta: {
              icon: 'simple-icons:meta',
              label: 'Meta',
            },
          }}
        />
      </div>

      <div>
        <h3 style={{ color: '#9ca3af', marginBottom: '8px', fontSize: '14px' }}>
          Mixed: some stages with icons, some without
        </h3>
        <FlowMap
          sources={{
            default: {
              icon: 'mdi:web',
              label: 'Website',
              text: 'walker.js',
            },
          }}
          collector={{
            label: 'walkerOS',
            text: 'Node',
          }}
          destinations={{
            default: {
              icon: 'simple-icons:googleanalytics',
              label: 'GA4',
            },
          }}
        />
      </div>

      <div>
        <h3 style={{ color: '#9ca3af', marginBottom: '8px', fontSize: '14px' }}>
          With context stages and icons
        </h3>
        <FlowMap
          stageBefore={{
            icon: 'mdi:cursor-default-click',
            label: 'Browser',
            text: 'Click event',
          }}
          sources={{
            default: {
              icon: 'mdi:web',
              text: 'web',
            },
          }}
          collector={{
            icon: 'mdi:cog',
            text: 'walkerjs',
          }}
          destinations={{
            default: {
              icon: 'mdi:api',
              text: 'API',
            },
          }}
          stageAfter={{
            icon: 'simple-icons:googleanalytics',
            label: 'gtag',
            text: 'GA4',
          }}
        />
      </div>
    </div>
  ),
};

/**
 * walkerOS Architecture - Shows two complete data flows:
 * 1. Browser sources with validation and selective redaction
 * 2. Server source with user identification and validation
 */
export const Architecture: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
      {/* Flow 1: Browser sources */}
      <FlowMap
        title="walkerOS Architecture"
        sources={{
          walkerjs: {
            icon: 'mdi:web',
            label: 'Source',
            text: 'walker.js',
            next: 'validate',
          },
          session: {
            icon: 'mdi:identification-card',
            label: 'Source',
            text: 'Session detection',
            next: 'validate',
          },
          datalayer: {
            icon: 'simple-icons:googletagmanager',
            label: 'Source',
            text: 'dataLayer',
            next: 'validate',
          },
          mediaplayer: {
            icon: 'mdi:play-circle',
            label: 'Source',
            text: 'CMP',
            next: 'validate',
          },
        }}
        preTransformers={{
          validate: {
            label: 'Transformer',
            text: 'validate',
          },
        }}
        collector={{
          label: 'Collector',
        }}
        postTransformers={{
          redact: {
            label: 'Transformer',
            text: 'redact',
          },
        }}
        destinations={{
          ga4: {
            icon: 'simple-icons:googleanalytics',
            label: 'Destination',
            text: 'GA4',
            before: 'redact',
          },
          meta: {
            icon: 'simple-icons:meta',
            label: 'Destination',
            text: 'Meta Pixel',
            before: 'redact',
          },
          api: {
            icon: 'mdi:api',
            label: 'Destination',
            text: 'API',
          },
        }}
      />

      {/* Flow 2: Server source */}
      <FlowMap
        title="server-side flow"
        sources={{
          express: {
            icon: 'simple-icons:express',
            label: 'Source',
            text: 'Express',
            next: 'userIdentification',
          },
        }}
        preTransformers={{
          userIdentification: {
            label: 'Transformer',
            text: 'user identification',
            next: 'validate',
          },
          validate: {
            label: 'Transformer',
            text: 'validate',
          },
        }}
        collector={{
          label: 'Collector',
        }}
        destinations={{
          bigquery: {
            icon: 'simple-icons:googlebigquery',
            label: 'Destination',
            text: 'BigQuery',
          },
          datamanager: {
            icon: 'mdi:api',
            label: 'Destination',
            text: 'Data Manager API',
          },
          more: {
            icon: 'mdi:plus-circle-outline',
            label: 'Destination',
            text: 'many more...',
          },
        }}
      />
    </div>
  ),
};
