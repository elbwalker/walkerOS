import React, { useState } from 'react';
import { Box, FlowMap } from '@walkeros/explorer';

type Mode = 'client' | 'server';
type View = 'overview' | 'detailed';

// FlowMap configurations for each mode/view combination
const configs = {
  'client-overview': {
    sources: {
      browser: {
        icon: 'mdi:web',
        label: 'Browser',
        link: '/docs/sources/web/browser/',
      },
    },
    collector: {
      label: 'walker.js',
      link: '/docs/collector',
    },
    destinations: {
      ga4: {
        icon: 'logos:google-analytics',
        label: 'GA4',
        link: '/docs/destinations/web/gtag/ga4',
      },
      meta: {
        icon: 'logos:meta-icon',
        label: 'Meta Pixel',
        link: '/docs/destinations/web/meta-pixel',
      },
      gtm: {
        icon: 'logos:google-tag-manager',
        label: 'GTM',
        link: '/docs/destinations/web/gtag/gtm',
      },
      api: {
        icon: 'mdi:api',
        label: 'API',
        link: '/docs/destinations/api/web',
      },
    },
  },
  'client-detailed': {
    stageBefore: {
      icon: 'mdi:web',
      label: 'Browser',
      link: false,
    },
    sources: {
      source: {
        label: 'Source',
        text: 'Capture',
        link: '/docs/sources',
      },
    },
    preTransformers: {
      transform: {
        label: 'Transformer',
        text: 'Enrich',
        link: '/docs/transformers',
      },
    },
    collector: {
      label: 'walker.js',
      text: 'Process',
      link: '/docs/collector',
    },
    destinations: {
      ga4: {
        icon: 'logos:google-analytics',
        label: 'GA4',
        link: '/docs/destinations/web/gtag/ga4',
      },
      meta: {
        icon: 'logos:meta-icon',
        label: 'Meta',
        link: '/docs/destinations/web/meta-pixel',
      },
    },
  },
  'server-overview': {
    sources: {
      express: {
        icon: 'simple-icons:express',
        label: 'Express',
        link: '/docs/sources/server/express',
      },
      lambda: {
        icon: 'logos:aws-lambda',
        label: 'Lambda',
        link: '/docs/sources/server/aws',
      },
    },
    collector: {
      label: 'Node',
      link: '/docs/collector',
    },
    destinations: {
      bigquery: {
        icon: 'logos:google-bigquery',
        label: 'BigQuery',
        link: '/docs/destinations/server/gcp',
      },
      aws: {
        icon: 'logos:aws',
        label: 'AWS',
        link: '/docs/destinations/server/aws',
      },
      meta: {
        icon: 'logos:meta-icon',
        label: 'Meta CAPI',
        link: '/docs/destinations/server/meta-capi',
      },
    },
  },
  'server-detailed': {
    stageBefore: {
      icon: 'mdi:api',
      label: 'API Request',
      link: false,
    },
    sources: {
      source: {
        label: 'Source',
        text: 'Ingest',
        link: '/docs/sources',
      },
    },
    preTransformers: {
      transform: {
        label: 'Transformer',
        text: 'Validate',
        link: '/docs/transformers',
      },
    },
    collector: {
      label: 'Node',
      text: 'Route',
      link: '/docs/collector',
    },
    destinations: {
      bigquery: {
        icon: 'logos:google-bigquery',
        label: 'BigQuery',
        link: '/docs/destinations/server/gcp',
      },
      aws: {
        icon: 'logos:aws',
        label: 'AWS',
        link: '/docs/destinations/server/aws',
      },
    },
  },
};

function PillButtons({
  mode,
  onChange,
}: {
  mode: Mode;
  onChange: (mode: Mode) => void;
}) {
  return (
    <div className="flex gap-4 mb-8 justify-center">
      <button
        onClick={() => onChange('client')}
        className={`px-6 py-2 rounded-full font-semibold transition-colors ${
          mode === 'client'
            ? 'bg-[#01b5e2] text-white'
            : 'bg-transparent border border-gray-400 hover:border-[#01b5e2]'
        }`}
        style={
          mode !== 'client' ? { color: 'var(--color-base-content)' } : undefined
        }
      >
        Client
      </button>
      <button
        onClick={() => onChange('server')}
        className={`px-6 py-2 rounded-full font-semibold transition-colors ${
          mode === 'server'
            ? 'bg-[#01b5e2] text-white'
            : 'bg-transparent border border-gray-400 hover:border-[#01b5e2]'
        }`}
        style={
          mode !== 'server' ? { color: 'var(--color-base-content)' } : undefined
        }
      >
        Server
      </button>
    </div>
  );
}

export default function Integrations() {
  const [mode, setMode] = useState<Mode>('client');
  const [view, setView] = useState<View>('overview');

  const configKey = `${mode}-${view}` as keyof typeof configs;
  const currentConfig = configs[configKey];

  return (
    <section
      className="py-16 sm:py-24"
      style={{ backgroundColor: 'var(--ifm-background-color)' }}
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2
            className="text-3xl font-semibold tracking-tight sm:text-4xl"
            style={{ color: 'var(--color-base-content)' }}
          >
            Pre-built integrations for{' '}
            <span className="text-elbwalker">client-side</span> and{' '}
            <span className="text-elbwalker">server-side</span> data collection
          </h2>
        </div>

        <PillButtons mode={mode} onChange={setMode} />

        <Box
          tabs={[
            { id: 'overview', label: 'Overview' },
            { id: 'detailed', label: 'Detailed' },
          ]}
          activeTab={view}
          onTabChange={(id) => setView(id as View)}
          className="mx-auto"
          style={{ maxWidth: '700px', height: 'auto' }}
        >
          <div
            className="p-6 flex justify-center items-center"
            style={{ height: '320px' }}
          >
            <FlowMap {...currentConfig} />
          </div>
        </Box>
      </div>
    </section>
  );
}
