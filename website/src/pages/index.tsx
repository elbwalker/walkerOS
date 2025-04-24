import Layout from '@theme/Layout';
import Hero from './home/hero';
import Features from './home/features';
import CTA from './home/cta';

export default function Home() {
  return (
    <Layout
      title="Home"
      description="Open-source event data collection platform"
    >
      <Hero />
      <main>
        <Features />
        <CTA />
      </main>
    </Layout>
  );
}
