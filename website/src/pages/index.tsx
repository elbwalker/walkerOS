import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Hero from '@site/src/components/home/hero';
import Features from '@site/src/components/home/features';
import CTAStart from '@site/src/components/ctas/start';
import PromotionLive from '@site/src/components/examples/promotionLive';

export default function Home(): JSX.Element {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout
      title={`${siteConfig.title}`}
      description="Open-source data collection platform"
    >
      <Hero />
      <main>
        <PromotionLive />
        <Features />
        <CTAStart />
      </main>
    </Layout>
  );
}
