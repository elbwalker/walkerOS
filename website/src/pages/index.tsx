import Layout from '@theme/Layout';
import Hero from '@site/src/components/home/hero';
import Features from '@site/src/components/home/features';
import CTAStart from '@site/src/components/ctas/start';

export default function Home() {
  return (
    <Layout
      title="Home"
      description="Open-source event data collection platform"
    >
      <Hero />
      <main>
        <Features />
        <CTAStart />
      </main>
    </Layout>
  );
}
