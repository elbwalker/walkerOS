import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Hero from '@site/src/components/home/hero';
import Features from '@site/src/components/home/features';
import CTAStart from '@site/src/components/ctas/start';
import {
  PromotionLive,
  PromotionReady,
} from '@site/src/components/templates/promotionLive';

export default function Home() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout
      title={`${siteConfig.title}`}
      description="Open-source event data collection platform"
    >
      <Hero />
      <PromotionReady />
      <PromotionLive />
      <main>
        <Features />
        <PromotionLive />
        <CTAStart />
      </main>
    </Layout>
  );
}
