import {
  CardGrid,
  CaseCard,
  Icon,
  Section,
  SectionHeading,
} from '@walkeros/explorer/design/components';
import { SECTION_ID } from './links';
import { sectionTags } from './tags';

export default function ProofSection() {
  return (
    <Section {...sectionTags('proof')} id={SECTION_ID.proof} tone="alt">
      <SectionHeading title="How teams use it in production." />
      <CardGrid min={440}>
        <CaseCard
          label="Media"
          title="One design system. ~50 components. No hand-written tracking code."
          stats={[
            { value: '~50', label: 'components tagged once' },
            { value: 'Day 1', label: 'tracking on every new feature' },
            {
              value: <Icon name="check" size={32} />,
              label: 'Next vendor switch is a config change, not a project',
            },
          ]}
        >
          A major German media platform spent too much dev time hand-coding
          tracking around a single analytics vendor. They tagged their component
          library once, and now every product team ships tracking by default,
          reviewed in Storybook next to the component itself.
        </CaseCard>
        <CaseCard
          label="Energy"
          title="From GTM workarounds to structured events."
          stats={[
            { value: '1', label: 'event syntax across every page' },
            { value: '0', label: 'cleanup workarounds in GTM' },
            {
              value: <Icon name="check" size={32} />,
              label: 'Data the analytics team can trust',
            },
          ]}
        >
          A German energy provider ran a GTM container full of inconsistent
          event names and hand-written workarounds just to make the data usable.
          walkerOS now generates structured entity action events straight from
          the markup, with the same syntax everywhere, no cleanup scripts, and
          GTM back to just firing tags.
        </CaseCard>
      </CardGrid>
    </Section>
  );
}
