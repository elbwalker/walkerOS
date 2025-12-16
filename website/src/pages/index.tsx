import Layout from '@theme/Layout';
import Hero from '@site/src/components/home/hero';
import Features from '@site/src/components/organisms/features';
import GettingStarted from '@site/src/components/organisms/gettingStarted';
import Benefits from '@site/src/components/organisms/benefits';
import CTAStart from '@site/src/components/ctas/start';

export default function Home() {
  return (
    <Layout
      title="Home"
      description="Open-source event data collection platform"
    >
      <Hero />
      <main>
        <GettingStarted />
        <Features />
        <Benefits />
        <CTAStart />
      </main>
    </Layout>
  );
}
