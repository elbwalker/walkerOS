import Link from '@docusaurus/Link';
import {
  Cluster,
  DestinationMappingViz,
  InlineCode,
  Section,
  SectionHeading,
  Split,
  Text,
  TextLink,
} from '@walkeros/explorer/design/components';
import { ROUTES, SECTION_ID } from './links';
import { actionTags, sectionTags } from './tags';

export default function VendorSection() {
  return (
    <Section {...sectionTags('vendor')} id={SECTION_ID.vendor}>
      <Split
        start={
          <SectionHeading
            size="md"
            eyebrow="The vendor becomes a destination"
            title="Add, swap or drop any tool without touching your app."
            lead="Instrument once. Analytics, ads, CRM or warehouse: every tool is a mapping, not a rewrite."
          />
        }
        end={
          <Text size="lg">
            Instead of calling each vendor's SDK in its own shape, your
            components emit one <InlineCode>entity action</InlineCode> event. A
            destination config translates it for GA4, Meta, TikTok, Amplitude or
            30+ others. Swap or add a tool, and the app never changes. The
            instrumentation you build today survives your next vendor decision.
          </Text>
        }
      />
      <DestinationMappingViz />
      <Cluster gap="links">
        <TextLink
          {...actionTags('docs')}
          href={ROUTES.mapping}
          arrow
          linkComponent={Link}
        >
          Learn more about mapping
        </TextLink>
        <TextLink
          {...actionTags('destinations')}
          href={ROUTES.destinations}
          tone="muted"
          arrow
          linkComponent={Link}
        >
          See all destinations
        </TextLink>
      </Cluster>
    </Section>
  );
}
