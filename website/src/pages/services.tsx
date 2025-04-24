import { JSX } from 'react';
import Layout from '@theme/Layout';
import Hero from '@site/src/components/pages/services/hero';
import Features from '@site/src/components/pages/services/features';
import Sparring from '@site/src/components/pages/services/sparring';
import Projects from '@site/src/components/pages/services/projects';
import Team from '@site/src/components/pages/services/team';
import Principles from '@site/src/components/pages/services/principles';
import CTA from '@site/src/components/pages/services/cta';

export default function Services(): JSX.Element {
  return (
    <Layout title="Services" description="Professional services">
      <Hero />
      <main>
        <Features />
        <Sparring />
        <Projects />
        <Team />
        <Principles />
        <CTA />
      </main>
    </Layout>
  );
}
