import { JSX } from 'react';
import Layout from '@theme/Layout';
import {
  Section,
  SectionHeading,
  Text,
  TextLink,
} from '@walkeros/explorer/design/components';
import { EXTERNAL } from '../../components/landing/links';
import { DemoFrame } from './_DemoFrame';

export default function DemosPage(): JSX.Element {
  return (
    <Layout
      title="Demos"
      description="Industry example pages tagged with walkerOS data-elb attributes: a shop and a media site, live in the browser."
    >
      <main>
        <Section>
          <SectionHeading
            level={1}
            title="Industry example pages."
            lead={
              <>
                Each page is a working website, tagged with walkerOS{' '}
                <code>data-elb</code> attributes. Use the bookmarks to switch
                between the shop and the media site, and click Code on a section
                or a card to see the attributes behind it.
              </>
            }
          />
          <DemoFrame />
          <Text>
            The components behind these pages are in the{' '}
            <TextLink href={EXTERNAL.storybook}>
              component library in Storybook
            </TextLink>
            .
          </Text>
        </Section>
      </main>
    </Layout>
  );
}
