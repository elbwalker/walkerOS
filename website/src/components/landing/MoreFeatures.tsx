import Link from '@docusaurus/Link';
import {
  CardGrid,
  FeatureItem,
  Section,
  SectionHeading,
  Split,
} from '@walkeros/explorer/design/components';
import { ROUTES, SECTION_ID } from './links';
import { actionTags, cardTags, sectionTags } from './tags';

const FEATURES = [
  {
    topic: 'consent',
    title: 'Consent handling',
    href: ROUTES.consent,
    text: "Set the consent each destination needs. Until a visitor grants it, that destination's events wait in a queue and nothing is sent to it.",
  },
  {
    topic: 'storybook',
    title: 'Storybook addon',
    href: ROUTES.storybook,
    text: "See and test a component's tracking in isolation, in the same review as its design.",
  },
  {
    topic: 'session',
    title: 'Session detection',
    href: ROUTES.session,
    text: 'Session starts with referrer, UTMs and click IDs. Works without storage, and switches to device IDs once consent is granted.',
  },
  {
    topic: 'datalayer',
    title: 'dataLayer migration',
    href: ROUTES.dataLayer,
    text: 'Existing GTM and GA4 pushes become walkerOS events. Migrate component by component instead of all at once.',
  },
  {
    topic: 'flow',
    title: 'Version controlled',
    href: ROUTES.flow,
    text: 'Tracking config lives in your repo and goes through the same PR review, tests and deploys as your code.',
  },
  {
    topic: 'mcp',
    title: 'AI-readiness',
    href: ROUTES.mcp,
    text: 'Fully typed, plus MCP servers and skills, so your coding agent can tag components and simulate flows.',
  },
];

export default function MoreFeaturesSection() {
  return (
    <Section
      {...sectionTags('features')}
      id={SECTION_ID.moreFeatures}
      tone="alt"
    >
      <Split
        variant="aside"
        start={
          <SectionHeading
            eyebrow="More features"
            title="Everything around the event, built in."
            lead="Same packages, same config."
          />
        }
        end={
          <CardGrid min={300} gap="features">
            {FEATURES.map((feature) => (
              <FeatureItem
                key={feature.topic}
                {...cardTags('feature', 'topic', feature.topic)}
                title={feature.title}
                href={feature.href}
                linkComponent={Link}
                linkAttributes={actionTags('docs')}
              >
                {feature.text}
              </FeatureItem>
            ))}
          </CardGrid>
        }
      />
    </Section>
  );
}
