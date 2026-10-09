import Link from '@docusaurus/Link';
import {
  CardGrid,
  PlanCard,
  Section,
  SectionHeading,
} from '@walkeros/explorer/design/components';
import { EXTERNAL, ROUTES, SECTION_ID } from './links';
import { actionTags, cardTags, sectionTags } from './tags';

export default function PlansSection() {
  return (
    <Section {...sectionTags('plans')} id={SECTION_ID.plans} tone="alt">
      <SectionHeading
        eyebrow="Beyond the repo"
        title="Run it yourself, or bring us in."
        lead="The software stays MIT licensed and self-hostable either way."
      />
      <CardGrid min={300}>
        <PlanCard
          {...cardTags('plan', 'plan', 'community')}
          label="Community"
          title="Open-source"
          features={[
            'MIT licensed, no seat limits',
            'All sources, destinations and transformers',
            'Community support',
          ]}
          cta={{
            label: 'Start free',
            href: ROUTES.docs,
            attributes: actionTags('select'),
          }}
          linkComponent={Link}
        >
          Everything on this page. Clone it, read it, run it. Support via GitHub
          Discussions.
        </PlanCard>
        <PlanCard
          {...cardTags('plan', 'plan', 'implementation')}
          label="Fixed scope"
          title="Implementation"
          features={[
            'Business questions mapped to events',
            'Design system tagging and Storybook setup',
            'Migration off dataLayer and GTM-based tracking',
            'Custom source or destination builds',
          ]}
          cta={{
            label: 'Scope a project',
            href: EXTERNAL.contact,
            attributes: actionTags('select'),
          }}
          linkComponent={Link}
        >
          We tag your design system with your team. We define the entity action
          event model, wire up the components and mappings, and hand over
          tracking your engineers own from day one.
        </PlanCard>
        <PlanCard
          {...cardTags('plan', 'plan', 'support')}
          label="SLA"
          title="Support"
          highlight
          features={[
            'Guaranteed response times, direct access to the people who build walkerOS',
            'Priority fixes and security patches',
            'Upgrade guidance for production setups',
          ]}
          cta={{
            label: 'Talk to us',
            href: EXTERNAL.talk,
            attributes: actionTags('select'),
          }}
          linkComponent={Link}
        >
          A contract on top of the open-source project, for teams whose tracking
          drives revenue reporting or ad spend.
        </PlanCard>
      </CardGrid>
    </Section>
  );
}
