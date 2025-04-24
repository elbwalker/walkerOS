import Layout from '@theme/Layout';
import Hero from '@site/src/components/pages/home/hero';
import Features from '@site/src/components/pages/home/features';
import CTA from '@site/src/components/pages/home/cta';

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
