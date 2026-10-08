import { JSX } from 'react';
import Layout from '@theme/Layout';
import { Section, SectionHeading } from '@walkeros/explorer/design/components';
import { DemoFrame } from './_DemoFrame';

export default function DemosPage(): JSX.Element {
  return (
    <Layout
      title="Demos"
      description="Example sites tagged with walkerOS: a shop and a media page, live in the browser."
    >
      <main>
        <Section>
          <SectionHeading
            level={1}
            title="See walkerOS on a real page."
            lead="A shop and a media site, both tagged with walkerOS. Switch between them with the bookmarks, and on the shop, flip a section or a product card to Code to see its tags."
          />
          <DemoFrame />
        </Section>
      </main>
    </Layout>
  );
}
