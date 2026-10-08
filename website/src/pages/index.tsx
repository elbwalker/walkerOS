import Layout from '@theme/Layout';
import BeyondSection from '@site/src/components/landing/Beyond';
import FaqSection from '@site/src/components/landing/Faq';
import GettingStartedSection from '@site/src/components/landing/GettingStarted';
import HeroSection from '@site/src/components/landing/Hero';
import MoreFeaturesSection from '@site/src/components/landing/MoreFeatures';
import PlansSection from '@site/src/components/landing/Plans';
import ProofSection from '@site/src/components/landing/Proof';
import TaggingSection from '@site/src/components/landing/Tagging';
import VendorSection from '@site/src/components/landing/Vendor';
import WhySection from '@site/src/components/landing/Why';

export default function Home() {
  return (
    <Layout
      title="Home"
      description="Open-source event data collection platform"
    >
      <main>
        <HeroSection />
        <WhySection />
        <TaggingSection />
        <VendorSection />
        <ProofSection />
        <MoreFeaturesSection />
        <GettingStartedSection />
        <BeyondSection />
        <PlansSection />
        <FaqSection />
      </main>
    </Layout>
  );
}
