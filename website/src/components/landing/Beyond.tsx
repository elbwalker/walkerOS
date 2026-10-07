import Link from '@docusaurus/Link';
import {
  CardGrid,
  HighlightCard,
  Section,
  SectionHeading,
} from '@walkeros/explorer/design/components';
import { ROUTES, SECTION_ID } from './links';
import { actionTags, sectionTags } from './tags';

export default function BeyondSection() {
  return (
    <Section {...sectionTags('beyond')} id={SECTION_ID.beyond}>
      <SectionHeading
        title="Beyond the browser."
        lead="Once your events are structured, they can go further. Same event model, no re-instrumentation."
      />
      <CardGrid min={420}>
        <HighlightCard
          label="Server-side pipeline"
          title="Replace server-side GTM."
          cta={{
            label: 'Explore server-side',
            href: ROUTES.server,
            attributes: actionTags('server'),
          }}
          linkComponent={Link}
        >
          Run the same events through your own server pipeline on Express, AWS
          Lambda or GCP Functions. Validate, enrich and redact PII before
          anything reaches a vendor, and send conversions to Meta, Google Ads or
          TikTok server-to-server. No tags, triggers and variables to maintain
          per vendor, just one flow in your repo.
        </HighlightCard>
        <HighlightCard
          label="Raw data"
          title="Own your analytics data."
          cta={{
            label: 'Explore warehouse destinations',
            href: ROUTES.warehouse,
            attributes: actionTags('warehouse'),
          }}
          linkComponent={Link}
        >
          Send every event raw and structured straight into your warehouse, like
          BigQuery or ClickHouse. No sampling, no vendor-defined schema, no
          export limits. Query your own data directly, and use an analytics
          vendor only where you actually need one, or not at all.
        </HighlightCard>
      </CardGrid>
    </Section>
  );
}
