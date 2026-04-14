import React, { useState } from 'react';
import { Box, FlowMap, FlowMapProps, Icon } from '@walkeros/explorer';
import Link from '@docusaurus/Link';

type Mode = 'client' | 'server';

interface Destination {
  icon: string;
  iconColor?: string;
  label: string;
  link: string;
}

const clientDestinations: Destination[] = [
  {
    icon: 'logos:google-analytics',
    label: 'GA4',
    link: '/docs/destinations/web/gtag/ga4',
  },
  {
    icon: 'logos:google-ads',
    label: 'Google Ads',
    link: '/docs/destinations/web/gtag/ads',
  },
  {
    icon: 'logos:google-tag-manager',
    label: 'GTM',
    link: '/docs/destinations/web/gtag/gtm',
  },
  {
    icon: 'logos:amplitude-icon',
    label: 'Amplitude',
    link: '/docs/destinations/web/amplitude',
  },
  {
    icon: 'logos:mixpanel',
    label: 'Mixpanel',
    link: '/docs/destinations/web/mixpanel',
  },
  {
    icon: 'logos:segment-icon',
    label: 'Segment',
    link: '/docs/destinations/web/segment',
  },
  {
    icon: 'logos:posthog-icon',
    label: 'PostHog',
    link: '/docs/destinations/web/posthog',
  },
  {
    icon: 'logos:meta-icon',
    label: 'Meta Pixel',
    link: '/docs/destinations/web/meta-pixel',
  },
  {
    icon: 'logos:pinterest',
    label: 'Pinterest Tag',
    link: '/docs/destinations/web/pinterest',
  },
  {
    icon: 'logos:tiktok-icon',
    label: 'TikTok Pixel',
    link: '/docs/destinations/web/tiktok',
  },
  {
    icon: 'logos:linkedin-icon',
    label: 'LinkedIn Insight Tag',
    link: '/docs/destinations/web/linkedin',
  },
  {
    icon: 'simple-icons:plausibleanalytics',
    iconColor: '#5850EC',
    label: 'Plausible',
    link: '/docs/destinations/web/plausible',
  },
  {
    icon: 'walkeros:piwik-pro',
    label: 'Piwik PRO',
    link: '/docs/destinations/web/piwikpro',
  },
  {
    icon: 'walkeros:snowplow',
    label: 'Snowplow',
    link: '/docs/destinations/web/snowplow',
  },
];

const serverDestinations: Destination[] = [
  {
    icon: 'logos:amplitude-icon',
    label: 'Amplitude',
    link: '/docs/destinations/server/amplitude',
  },
  {
    icon: 'logos:aws',
    label: 'AWS Firehose',
    link: '/docs/destinations/server/aws',
  },
  {
    icon: 'logos:google-cloud',
    label: 'BigQuery',
    link: '/docs/destinations/server/gcp',
  },
  {
    icon: 'logos:google-cloud',
    label: 'Google Data Manager',
    link: '/docs/destinations/server/datamanager',
  },
  {
    icon: 'logos:linkedin-icon',
    label: 'LinkedIn Conversions API',
    link: '/docs/destinations/server/linkedin',
  },
  {
    icon: 'logos:meta-icon',
    label: 'Meta Conversions API',
    link: '/docs/destinations/server/meta-capi',
  },
  {
    icon: 'logos:mixpanel',
    label: 'Mixpanel',
    link: '/docs/destinations/server/mixpanel',
  },
  {
    icon: 'logos:pinterest',
    label: 'Pinterest Conversions API',
    link: '/docs/destinations/server/pinterest',
  },
  {
    icon: 'logos:posthog-icon',
    label: 'PostHog',
    link: '/docs/destinations/server/posthog',
  },
  {
    icon: 'logos:segment-icon',
    label: 'Segment',
    link: '/docs/destinations/server/segment',
  },
  {
    icon: 'logos:tiktok-icon',
    label: 'TikTok Events API',
    link: '/docs/destinations/server/tiktok',
  },
  {
    icon: 'logos:slack-icon',
    label: 'Slack',
    link: '/docs/destinations/server/slack',
  },
];

// FlowMap configurations for each mode
const configs: Record<Mode, FlowMapProps> = {
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

function DestinationGrid({ destinations }: { destinations: Destination[] }) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 gap-3 mt-10">
      {destinations.map((dest) => (
        <Link
          key={dest.link}
          to={dest.link}
          className="flex flex-col items-center gap-2 p-3 rounded-xl border transition-colors no-underline hover:no-underline"
          style={{
            borderColor: 'rgba(128,128,128,0.2)',
            color: 'var(--color-base-content)',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = '#01b5e2';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor =
              'rgba(128,128,128,0.2)';
          }}
        >
          <span className="w-8 h-8 flex items-center justify-center">
            <Icon
              icon={dest.icon}
              style={{ width: 28, height: 28, color: dest.iconColor }}
            />
          </span>
          <span className="text-xs font-medium text-center leading-tight">
            {dest.label}
          </span>
        </Link>
      ))}
    </div>
  );
}

export default function Integrations() {
  const [mode, setMode] = useState<Mode>('client');

  const currentConfig = configs[mode];
  const destinations =
    mode === 'client' ? clientDestinations : serverDestinations;

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

        <h3
          className="text-xl font-semibold text-center"
          style={{ color: 'var(--color-base-content)', marginTop: '4rem' }}
        >
          Available destinations
        </h3>

        <DestinationGrid destinations={destinations} />
      </div>
    </section>
  );
}
