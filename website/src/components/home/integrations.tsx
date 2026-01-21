import React, { useState } from 'react';
import { Box, FlowMap } from '@walkeros/explorer';

type Mode = 'client' | 'server';

// FlowMap configurations for each mode
const configs = {
  client: {
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
  server: {
    stageBefore: {
      icon: 'mdi:api',
      label: 'API Request',
      link: false,
    },
    sources: {
      express: {
        icon: 'simple-icons:express',
        label: 'Express',
        link: '/docs/sources/server/express',
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
      label: 'Collector',
      link: '/docs/collector',
    },
    destinations: {
      bigquery: {
        icon: 'simple-icons:googlebigquery',
        label: 'BigQuery',
        link: '/docs/destinations/server/gcp',
      },
      aws: {
        icon: 'mdi:aws',
        label: 'AWS',
        link: '/docs/destinations/server/aws',
      },
      meta: {
        icon: 'simple-icons:meta',
        label: 'Meta CAPI',
        link: '/docs/destinations/server/meta-capi',
      },
      datamanager: {
        icon: 'mdi:database',
        label: 'Datamanager',
        link: '/docs/destinations/server/datamanager',
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

  const currentConfig = configs[mode];

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

        <Box className="mx-auto" style={{ maxWidth: '700px', height: 'auto' }}>
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
