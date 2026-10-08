import Link from '@docusaurus/Link';
import {
  Button,
  CardGrid,
  Cluster,
  HighlightCard,
  InstallCommand,
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
        >
          Run the same events through your own server pipeline on Express, AWS
          Lambda or GCP Functions. Validate, enrich and redact PII before
          anything reaches a vendor, and send conversions to Meta, Google Ads or
          TikTok server-to-server. No tags, triggers and variables to maintain
          per vendor, just one flow in your repo.
        </HighlightCard>
        <HighlightCard label="Raw data" title="Own your analytics data.">
          Send every event raw and structured straight into your warehouse, like
          BigQuery or ClickHouse. No sampling, no vendor-defined schema, no
          export limits. Query your own data directly, and use an analytics
          vendor only where you actually need one, or not at all.
        </HighlightCard>
      </CardGrid>
      <Cluster align="center" separated>
        <Button
          {...actionTags('setup')}
          href={ROUTES.mcpQuickStart}
          arrow
          linkComponent={Link}
        >
          Set up with your agent
        </Button>
        <InstallCommand {...actionTags('copy')} />
      </Cluster>
    </Section>
  );
}
