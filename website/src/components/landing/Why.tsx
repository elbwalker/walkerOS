import {
  CardGrid,
  ProblemCard,
  Section,
  SectionHeading,
} from '@walkeros/explorer/design/components';
import { SECTION_ID } from './links';
import { sectionTags } from './tags';

export default function WhySection() {
  return (
    <Section {...sectionTags('why')} id={SECTION_ID.why} tone="alt">
      <SectionHeading
        eyebrow="Because event instrumentation is real engineering effort"
        title="Hand-written tracking doesn't scale."
        lead="Three ways the usual setup costs you, release after release."
      />
      <CardGrid min={280}>
        <ProblemCard number="01" title="Every feature needs a tracking ticket">
          A tracking spec, a Jira ticket, and a dev hand-writing the push.
          Tracking always comes after shipping, and a missing event looks
          exactly like a quiet afternoon.
        </ProblemCard>
        <ProblemCard
          number="02"
          title="Your code speaks your vendor's language"
        >
          Tracking calls are written in GA4's or Amplitude's exact shape.
          Switching vendors means rewriting every call site, so nobody switches.
        </ProblemCard>
        <ProblemCard number="03" title="Events without structure">
          Ten teams, ten ways to name a click: "click_btn_new2", "teaser-click",
          "TeaserClick_v3". No shared syntax, so the tag manager fills up with
          workarounds just to make the data usable, and every new report starts
          with cleanup.
        </ProblemCard>
      </CardGrid>
    </Section>
  );
}
