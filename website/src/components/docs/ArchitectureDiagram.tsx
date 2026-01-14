import React from 'react';
import { Icon } from '@walkeros/explorer';

function ItemRow({
  icon,
  label,
  iconStyle,
}: {
  icon: string;
  label: string;
  iconStyle?: React.CSSProperties;
}) {
  return (
    <div
      className="flex items-center gap-3"
      style={{ color: 'var(--color-base-content)' }}
    >
      <Icon icon={icon} className="w-5 h-5" style={iconStyle} />
      <span className="text-base whitespace-nowrap">{label}</span>
    </div>
  );
}

function SourceDestBox({
  items,
}: {
  items: { icon: string; label: string; iconStyle?: React.CSSProperties }[];
}) {
  return (
    <div
      className="rounded-xl border border-gray-200 dark:border-gray-600 p-4"
      style={{ backgroundColor: 'var(--ifm-background-color)' }}
    >
      <div className="flex flex-col gap-2">
        {items.map((item, i) => (
          <ItemRow
            key={i}
            icon={item.icon}
            label={item.label}
            iconStyle={item.iconStyle}
          />
        ))}
      </div>
    </div>
  );
}

function CollectorWithFeatures({ features }: { features: string[] }) {
  return (
    <div className="flex flex-col items-center">
      <span
        className="text-base font-semibold uppercase tracking-wide text-center mb-4"
        style={{ color: 'var(--color-gray-400)' }}
      >
        Collector
      </span>
      <img
        src="/img/walkerOS_logo_new.svg"
        alt="walkerOS"
        className="w-20 h-20"
      />
      <ul
        className="text-xs list-none p-0 m-0 mt-2 text-center"
        style={{ color: 'var(--color-gray-500)' }}
      >
        {features.map((f, i) => (
          <li key={i}>{f}</li>
        ))}
      </ul>
    </div>
  );
}

function Arrow() {
  return (
    <>
      <div className="hidden md:flex items-center text-elbwalker">
        <Icon icon="mdi:arrow-right" className="w-8 h-8" />
      </div>
      <div className="md:hidden text-elbwalker">
        <Icon icon="mdi:arrow-down" className="w-8 h-8" />
      </div>
    </>
  );
}

function FlowSection({
  title,
  sources,
  destinations,
  collectorFeatures,
  sourcesLabel,
  destinationsLabel,
}: {
  title: string;
  sources: { icon: string; label: string; iconStyle?: React.CSSProperties }[];
  destinations: {
    icon: string;
    label: string;
    iconStyle?: React.CSSProperties;
  }[];
  collectorFeatures: string[];
  sourcesLabel?: string;
  destinationsLabel?: string;
}) {
  return (
    <div className="flex-1">
      <div
        className="text-center text-sm font-medium italic mb-6"
        style={{ color: 'var(--color-gray-400)' }}
      >
        {title}
      </div>
      <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-6">
        {/* Sources */}
        <div className="flex flex-col items-center">
          <span
            className="text-base font-semibold uppercase tracking-wide text-center mb-4"
            style={{ color: 'var(--color-gray-400)' }}
          >
            {sourcesLabel ?? 'Sources'}
          </span>
          <SourceDestBox items={sources} />
        </div>

        <Arrow />

        {/* Collector */}
        <CollectorWithFeatures features={collectorFeatures} />

        <Arrow />

        {/* Destinations */}
        <div className="flex flex-col items-center">
          <span
            className="text-base font-semibold uppercase tracking-wide text-center mb-4"
            style={{ color: 'var(--color-gray-400)' }}
          >
            {destinationsLabel ?? 'Destinations'}
          </span>
          <SourceDestBox items={destinations} />
        </div>
      </div>
    </div>
  );
}

export default function ArchitectureDiagram() {
  return (
    <div className="my-8 overflow-x-auto">
      <div className="flex flex-col xl:flex-row gap-12 xl:gap-16 min-w-fit px-4">
        {/* Client-side */}
        <FlowSection
          title="client-side"
          sources={[
            { icon: 'mdi:web', label: 'Browser' },
            { icon: 'mdi:layers-outline', label: 'dataLayer' },
          ]}
          destinations={[
            { icon: 'mdi:api', label: 'API' },
            { icon: 'logos:google-analytics', label: 'GA4' },
            { icon: 'logos:google-ads', label: 'Google Ads' },
            { icon: 'logos:meta-icon', label: 'Meta Pixel' },
          ]}
          collectorFeatures={[
            'Event processing',
            'Consent management',
            'Mapping',
          ]}
        />

        {/* Divider */}
        <div className="hidden xl:block w-px bg-gray-200 dark:bg-gray-700" />
        <div className="xl:hidden h-px bg-gray-200 dark:bg-gray-700" />

        {/* Server-side */}
        <FlowSection
          title="server-side"
          sourcesLabel="Server Sources"
          sources={[
            { icon: 'logos:google-cloud', label: 'GCP Function' },
            { icon: 'mdi:cloud-sync', label: 'GCP Pub/Sub' },
            { icon: 'simple-icons:express', label: 'Express' },
          ]}
          destinationsLabel="Node Destinations"
          destinations={[
            { icon: 'logos:google-cloud', label: 'BigQuery' },
            { icon: 'logos:meta-icon', label: 'Meta CAPI' },
            { icon: 'logos:aws', label: 'AWS Firehose' },
            { icon: 'mdi:cloud-sync', label: 'GCP Pub/Sub' },
          ]}
          collectorFeatures={['Event processing', 'Enrichment', 'Routing']}
        />
      </div>
    </div>
  );
}
