import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Hero from '@site/src/components/home/hero';
import Features from '@site/src/components/home/features';
import CTAStart from '@site/src/components/ctas/start';
<<<<<<< Updated upstream
import PromotionLive, {
  PromotionReady,
} from '@site/src/components/templates/promotionLive';
=======
import PromotionLive from '../components/templates/promotionLive';
>>>>>>> Stashed changes

export default function Home() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout
      title={`${siteConfig.title}`}
      description="Open-source event data collection platform"
    >
      <Hero />
<<<<<<< Updated upstream
      <PromotionReady />
=======
      <PromotionLive />
>>>>>>> Stashed changes
      <main>
        <Features />
        <PromotionLive />
        <CTAStart />
      </main>
    </Layout>
  );
}
