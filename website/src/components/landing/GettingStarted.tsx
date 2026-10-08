import Link from '@docusaurus/Link';
import {
  QuickstartSteps,
  Section,
  SectionHeading,
  TextLink,
} from '@walkeros/explorer/design/components';
import { ROUTES, SECTION_ID } from './links';
import { actionTags, sectionTags } from './tags';

const STEPS = [
  {
    title: 'Install the script',
    text: 'Add one script tag to every page, below your GTM snippet.',
  },
  {
    title: 'Tag your components',
    text: 'Name the entities, add their data, and say which actions count.',
  },
  {
    title: 'Get rich dataLayer pushes',
    text: 'Every interaction becomes one structured push, ready for GTM triggers.',
  },
];

export default function GettingStartedSection() {
  return (
    <Section {...sectionTags('quickstart')} id={SECTION_ID.gettingStarted}>
      <SectionHeading
        eyebrow="Quickstart"
        title="From script tag to structured events in minutes."
        lead="No config, no build step. Works next to your existing Google Tag Manager setup."
      />
      <QuickstartSteps steps={STEPS}>
        <TextLink
          {...actionTags('guide')}
          href={ROUTES.walkerjs}
          arrow
          linkComponent={Link}
        >
          Read full quickstart guide
        </TextLink>
      </QuickstartSteps>
    </Section>
  );
}
