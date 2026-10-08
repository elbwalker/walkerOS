import { JSX } from 'react';
import Layout from '@theme/Layout';
import { PromotionPlayground } from '@walkeros/explorer';
import { Section, SectionHeading } from '@walkeros/explorer/design/components';

export default function PlaygroundPage(): JSX.Element {
  return (
    <Layout title="Playground" description="Interactive walkerOS playground">
      <main>
        <Section>
          <SectionHeading
            level={1}
            title="Click the card. See the event it sends."
            lead="A live walkerOS flow: edit the page, its tags or the mapping, and every click runs through a real collector to a gtag call."
          />
          <PromotionPlayground />
        </Section>
      </main>
    </Layout>
  );
}
