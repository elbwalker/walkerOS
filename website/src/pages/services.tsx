import { JSX } from 'react';
import Layout from '@theme/Layout';
import Hero from '@site/src/components/services/hero';
import Features from '@site/src/components/services/features';
import CTAServices from '@site/src/components/ctas/services';
import Team from '@site/src/components/services/team';
import Sparring from '@site/src/components/services/sparring';
import Projects from '@site/src/components/services/projects';
import CollectionPrinciples from '@site/src/components/services/collectionPrinciples';

export default function Services(): JSX.Element {
  return (
    <Layout title="Services" description="Professional services">
      <Hero />
      <main>
        <Features />
        <Sparring />
        <Projects />
        <Team />
        <CollectionPrinciples />
        <CTAServices />
      </main>
    </Layout>
  );
}
