import {
  FaqItem,
  Section,
  SectionHeading,
} from '@walkeros/explorer/design/components';
import { SECTION_ID } from './links';
import { sectionTags } from './tags';

export default function FaqSection() {
  return (
    <Section {...sectionTags('faq')} id={SECTION_ID.faq}>
      <SectionHeading eyebrow="FAQ" title="Questions we actually get." />
      <div>
        <FaqItem question="Do I need a design system to use walkerOS?">
          No. Tagging works on any HTML: templates, CMS pages, plain markup or
          individual components. A design system just multiplies the effect,
          because a component you tag once is tracked everywhere it's used.
          Without one, you still get structured events and vendor-independent
          mapping, and you can migrate existing dataLayer pushes page by page.
        </FaqItem>
        <FaqItem question="We already have a tracking layer in-house. Why switch?">
          You don't have to throw it away. Most in-house setups are a tracking
          spec plus a helper function, and they still need a ticket per event.
          walkerOS gives you the declarative layer as an MIT-licensed, typed
          library you wrap in your own API, with your own prefix and your own
          components. You own the architecture; we maintain the plumbing.
        </FaqItem>
        <FaqItem question="Can't we just keep using Google Tag Manager, and doesn't marketing lose point-and-click tagging?">
          {[
            "Yes, as a destination. GTM is good at firing tags, but it can't track anything until a developer hand-writes a push with structured data, and that's the ticket loop. walkerOS removes that step and can still feed GTM.",
            "No. GTM keeps working for marketing, wired off clean, typed events. What it stops carrying is the custom scripts, consent hacks and naming conventions that pile up once it's the only place data gets shaped.",
          ]}
        </FaqItem>
        <FaqItem question="Does it work with our framework?">
          Yes. Tagging is plain data attributes, so it works with React, Vue,
          Svelte, web components or server-rendered HTML. A typed tagger helper
          keeps attributes consistent in TypeScript.
        </FaqItem>
      </div>
    </Section>
  );
}
