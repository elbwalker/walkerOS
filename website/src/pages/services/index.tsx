import { JSX } from 'react';
import Layout from '@theme/Layout';
import Hero from './hero';
import Features from './features';
import Sparring from './sparring';
import Projects from './projects';
import Team from './team';
import Principles from './principles';
import CTA from './cta';

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
