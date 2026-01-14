import React from 'react';
import { Icon } from '@walkeros/explorer';
import Link from '@docusaurus/Link';

interface Integration {
  name: string;
  icon: string;
  link: string;
  iconColor?: string;
}

const clientSources: Integration[] = [
  { name: 'Browser', icon: 'mdi:web', link: '/docs/sources/web/browser/' },
  {
    name: 'dataLayer',
    icon: 'mdi:layers-outline',
    link: '/docs/sources/web/dataLayer/',
  },
];

const serverSources: Integration[] = [
  {
    name: 'Express',
    icon: 'simple-icons:express',
    link: '/docs/sources/server/express',
  },
  { name: 'Fetch', icon: 'mdi:api', link: '/docs/sources/server/fetch' },
  {
    name: 'AWS Lambda',
    icon: 'logos:aws-lambda',
    link: '/docs/sources/server/aws',
  },
  {
    name: 'GCP Functions',
    icon: 'logos:google-cloud-functions',
    link: '/docs/sources/server/gcp',
  },
];

const clientDestinations: Integration[] = [
  {
    name: 'GA4',
    icon: 'logos:google-analytics',
    link: '/docs/destinations/web/gtag/ga4',
  },
  {
    name: 'Google Ads',
    icon: 'logos:google-ads',
    link: '/docs/destinations/web/gtag/ads',
  },
  {
    name: 'GTM',
    icon: 'logos:google-tag-manager',
    link: '/docs/destinations/web/gtag/gtm',
  },
  {
    name: 'Meta Pixel',
    icon: 'logos:meta-icon',
    link: '/docs/destinations/web/meta-pixel',
  },
  {
    name: 'Plausible',
    icon: 'simple-icons:plausibleanalytics',
    link: '/docs/destinations/web/plausible',
    iconColor: '#5850EC',
  },
  {
    name: 'Piwik PRO',
    icon: 'simple-icons:piwikpro',
    link: '/docs/destinations/web/piwikpro',
  },
  {
    name: 'API',
    icon: 'simple-icons:api',
    link: '/docs/destinations/api/web',
  },
];

const serverDestinations: Integration[] = [
  { name: 'AWS', icon: 'logos:aws', link: '/docs/destinations/server/aws' },
  {
    name: 'BigQuery',
    icon: 'logos:google-bigquery',
    link: '/docs/destinations/server/gcp',
  },
  {
    name: 'Meta CAPI',
    icon: 'logos:meta-icon',
    link: '/docs/destinations/server/meta-capi',
  },
];

function IntegrationItem({ integration }: { integration: Integration }) {
  return (
    <Link
      to={integration.link}
      className="flex items-center gap-2 px-3 py-2 rounded-lg hover:text-elbwalker transition-colors no-underline"
    >
      <Icon
        icon={integration.icon}
        className="w-6 h-6"
        style={
          integration.iconColor ? { color: integration.iconColor } : undefined
        }
      />
      <span
        className="text-sm font-medium"
        style={{ color: 'var(--color-base-content)' }}
      >
        {integration.name}
      </span>
    </Link>
  );
}

function CategoryBox({
  title,
  items,
}: {
  title: string;
  items: Integration[];
}) {
  return (
    <div className="rounded-xl border-2 border-white dark:border-gray-600 bg-transparent p-4">
      <h4
        className="text-sm font-semibold mb-3 text-center"
        style={{ color: 'var(--color-gray-500)' }}
      >
        {title}
      </h4>
      <div className="flex flex-col gap-1">
        {items.map((item) => (
          <IntegrationItem key={item.name} integration={item} />
        ))}
      </div>
    </div>
  );
}

export default function Integrations() {
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

        <div className="flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-8">
          {/* Sources Column */}
          <div className="flex flex-col items-center">
            <h3
              className="text-lg font-semibold mb-4"
              style={{ color: 'var(--color-gray-500)' }}
            >
              Sources
            </h3>
            <div className="flex flex-col gap-4">
              <CategoryBox title="Client-side" items={clientSources} />
              <CategoryBox title="Server-side" items={serverSources} />
            </div>
          </div>

          {/* Arrow */}
          <div className="hidden lg:flex items-center text-elbwalker">
            <Icon icon="mdi:arrow-right" className="w-12 h-12" />
          </div>
          <div className="lg:hidden text-elbwalker">
            <Icon icon="mdi:arrow-down" className="w-12 h-12" />
          </div>

          {/* Collector (Center) */}
          <div className="flex flex-col items-center px-8">
            <h3
              className="text-lg font-semibold mb-4"
              style={{ color: 'var(--color-gray-500)' }}
            >
              Collector
            </h3>
            <Link
              to="/docs/collector"
              className="p-6 rounded-xl border-2 border-elbwalker bg-transparent hover:border-elbwalker-dark transition-colors no-underline"
            >
              <img
                src="/img/walkerOS_logo_new.svg"
                alt="walkerOS"
                className="w-24 h-24"
              />
            </Link>
            {/* Mobile only: spacer and feature list */}
            <div className="md:hidden">
              <div className="h-8" />
              <ul
                className="text-sm space-y-2 list-disc pl-5"
                style={{ color: 'var(--color-base-content)' }}
              >
                <li>Event processing</li>
                <li>Consent management</li>
                <li>Data enrichment</li>
                <li>Destination routing</li>
              </ul>
            </div>
          </div>

          {/* Arrow */}
          <div className="hidden lg:flex items-center text-elbwalker">
            <Icon icon="mdi:arrow-right" className="w-12 h-12" />
          </div>
          <div className="lg:hidden text-elbwalker">
            <Icon icon="mdi:arrow-down" className="w-12 h-12" />
          </div>

          {/* Destinations Column */}
          <div className="flex flex-col items-center">
            <h3
              className="text-lg font-semibold mb-4"
              style={{ color: 'var(--color-gray-500)' }}
            >
              Destinations
            </h3>
            <div className="flex flex-col gap-4">
              <CategoryBox title="Client-side" items={clientDestinations} />
              <CategoryBox title="Server-side" items={serverDestinations} />
            </div>
          </div>
        </div>

        <p
          className="text-center mt-12 text-lg"
          style={{ color: 'var(--color-gray-500)' }}
        >
          More to come...
        </p>
      </div>
    </section>
  );
}
