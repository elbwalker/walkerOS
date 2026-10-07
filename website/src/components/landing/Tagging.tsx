import Link from '@docusaurus/Link';
import {
  ArticleTeaserTracking,
  Cluster,
  Section,
  SectionHeading,
  Split,
  Text,
  TextLink,
} from '@walkeros/explorer/design/components';
import { EXTERNAL, ROUTES, SECTION_ID } from './links';
import { actionTags, sectionTags } from './tags';

export default function TaggingSection() {
  return (
    <Section {...sectionTags('tagging')} id={SECTION_ID.features}>
      <Split
        start={
          <SectionHeading
            size="md"
            eyebrow="Tracking lives in the component, not a separate step"
            title="Tag the component, not the page."
            lead="Tracking becomes part of your design system's API, just like props and styles."
          />
        }
        end={
          <Text size="lg">
            Instead of a hand-written push or GTM listener for every feature,
            data attributes live in the component markup. Tag it once, and every
            team using it ships structured events by default: entity, action and
            data. Fewer tracking tickets. Structured events by default. Less dev
            time on instrumentation.
          </Text>
        }
      />
      <ArticleTeaserTracking />
      <Cluster gap="links">
        <TextLink
          {...actionTags('docs')}
          href={ROUTES.tagging}
          arrow
          linkComponent={Link}
        >
          Learn more about tagging
        </TextLink>
        <TextLink
          {...actionTags('demo')}
          href={EXTERNAL.storybook}
          tone="muted"
          arrow
          linkComponent={Link}
        >
          See the Storybook demo
        </TextLink>
      </Cluster>
    </Section>
  );
}
